//! Read-only adapters for Agentik, RMUX, and Hermes state.
//!
//! The native TUI owns presentation and RMUX owns process state.  This module
//! only joins those live RMUX session names with the durable Agentik/Hermes
//! registries; it never creates, migrates, or mutates their files.

use anyhow::{Context, Result, anyhow, bail};
use rusqlite::{Connection, OpenFlags, params_from_iter};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const TERMINAL_RUNTIME_STATES: &[&str] = &["complete", "failed", "archived"];
const MAX_SKILLS_PER_SOURCE: usize = 500;

/// A durable Agentik runtime enriched with current RMUX and Hermes state.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RuntimeRecord {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub environment: String,
    pub client: Option<String>,
    pub project: Option<String>,
    pub mission: Option<String>,
    pub native_session: Option<String>,
    pub rmux_session: String,
    pub cwd: String,
    pub status: String,
    pub created_at: f64,
    pub last_activity: f64,
    pub tokens: u64,
    /// False for a live RMUX session that has no Agentik registry row.
    pub managed: bool,
    /// Current process truth supplied by RMUX, independent of stored status.
    pub live: bool,
}

/// A project hierarchy object from the Agentik control registry.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ControlObject {
    pub id: String,
    pub environment: String,
    pub kind: String,
    pub slug: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub status: String,
    pub path: Option<String>,
    pub metadata: JsonValue,
    pub created_at: f64,
    pub updated_at: f64,
}

/// A bundled or overridden specialized-agent definition and its runtime state.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AgentRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub scope: Vec<String>,
    pub runtime: String,
    pub catalog_path: String,
    pub runtime_name: String,
    pub runtime_id: Option<String>,
    pub status: String,
    pub live: bool,
    pub available: bool,
}

/// An installed Agentik operative-system package.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct OsPackage {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub scope: Vec<String>,
    pub dependencies: Vec<String>,
    pub capabilities: Vec<String>,
    pub skills: Vec<String>,
    pub workflows: Vec<String>,
    pub agents: Vec<String>,
    pub tools: Vec<String>,
    pub commands: Vec<String>,
    pub knowledge: Vec<String>,
    pub evals: Vec<String>,
    /// Stable `scope:target` strings from `os-assignments.yaml`.
    pub assignments: Vec<String>,
    pub available: bool,
}

/// A deliberately redacted capability identity.  MCP command lines, URLs,
/// headers, environment variables, and credentials are never represented.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityRecord {
    pub name: String,
    pub transport: String,
    pub status: String,
}

/// An installed skill identity.  Skill contents are intentionally not read.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SkillRecord {
    pub name: String,
    pub source: String,
    pub status: String,
}

/// One coherent, read-only view of the registries used by the native TUI.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct RegistrySnapshot {
    pub runtimes: Vec<RuntimeRecord>,
    pub objects: Vec<ControlObject>,
    pub agents: Vec<AgentRecord>,
    pub os_packages: Vec<OsPackage>,
    pub mcp_servers: Vec<CapabilityRecord>,
    pub skills: Vec<SkillRecord>,
    /// Sum of unique Hermes sessions matched by `RuntimeRecord::native_session`.
    pub token_total: u64,
    pub warnings: Vec<String>,
}

/// All filesystem inputs.  Keeping them explicit makes the adapters hermetic
/// in tests and usable for non-default homes without changing process state.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RegistryPaths {
    pub runtime_db: PathBuf,
    pub control_db: PathBuf,
    pub hermes_state_db: PathBuf,
    pub hermes_config: PathBuf,
    pub agent_catalog: PathBuf,
    pub os_registry: PathBuf,
    pub os_assignments: PathBuf,
    pub hermes_skills: PathBuf,
    pub claude_skills: PathBuf,
    pub codex_skills: PathBuf,
}

impl RegistryPaths {
    /// Build default paths beneath a supplied home, while injecting the two
    /// roots that may be bundled outside that home.
    pub fn for_home(
        home: impl AsRef<Path>,
        agent_catalog: impl Into<PathBuf>,
        os_registry: impl Into<PathBuf>,
    ) -> Self {
        let home = home.as_ref();
        let agentik = home.join(".agentik");
        let hermes = home.join(".hermes");
        Self {
            runtime_db: agentik.join("runtime.db"),
            control_db: agentik.join("control.db"),
            hermes_state_db: hermes.join("state.db"),
            hermes_config: hermes.join("config.yaml"),
            agent_catalog: agent_catalog.into(),
            os_registry: os_registry.into(),
            os_assignments: agentik.join("os-assignments.yaml"),
            hermes_skills: hermes.join("skills"),
            claude_skills: home.join(".claude/skills"),
            codex_skills: home.join(".codex/skills"),
        }
    }

    pub fn discover() -> Self {
        let home = env::var_os("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("/"));
        let hermes_home = env::var_os("HERMES_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join(".hermes"));
        let catalog = env::var_os("AGK_AGENT_CATALOG")
            .map(PathBuf::from)
            .unwrap_or_else(discover_bundled_catalog);
        let os_registry = env::var_os("AGK_OS_REGISTRY")
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                let system = PathBuf::from("/opt/agentik/os-registry");
                if system.is_dir() {
                    system
                } else {
                    home.join(".local/share/agk/os-registry")
                }
            });
        let mut paths = Self::for_home(&home, catalog, os_registry);
        paths.hermes_state_db = hermes_home.join("state.db");
        paths.hermes_config = hermes_home.join("config.yaml");
        paths.hermes_skills = hermes_home.join("skills");
        paths
    }
}

/// Read-only registry facade used by the native TUI.
#[derive(Clone, Debug)]
pub struct RegistryClient {
    pub environment: String,
    pub paths: RegistryPaths,
}

impl RegistryClient {
    /// Discover the current user's canonical registry locations.
    pub fn discover(environment: impl Into<String>) -> Self {
        Self::new(environment, RegistryPaths::discover())
    }

    /// Construct a client with fully injectable paths.
    pub fn new(environment: impl Into<String>, paths: RegistryPaths) -> Self {
        Self {
            environment: environment.into(),
            paths,
        }
    }

    /// Load a coherent snapshot.  Missing optional stores are empty; a store
    /// that exists but cannot be parsed is isolated and described in warnings.
    pub fn load(&self, live_rmux_names: &[String]) -> RegistrySnapshot {
        let mut snapshot = RegistrySnapshot::default();

        snapshot.runtimes = match self.load_runtimes(live_rmux_names, &mut snapshot.warnings) {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "runtime registry", error);
                unmanaged_runtimes(live_rmux_names, &self.environment)
            }
        };

        let native_sessions: BTreeSet<String> = snapshot
            .runtimes
            .iter()
            .filter_map(|record| record.native_session.clone())
            .collect();
        match self.load_hermes_tokens(&native_sessions) {
            Ok(tokens) => {
                snapshot.token_total = tokens.values().copied().fold(0_u64, u64::saturating_add);
                for runtime in &mut snapshot.runtimes {
                    runtime.tokens = runtime
                        .native_session
                        .as_ref()
                        .and_then(|id| tokens.get(id))
                        .copied()
                        .unwrap_or(0);
                }
            }
            Err(error) => warn(&mut snapshot.warnings, "Hermes token registry", error),
        }

        snapshot.objects = match self.load_control_objects(&mut snapshot.warnings) {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "control registry", error);
                Vec::new()
            }
        };
        snapshot.agents = match self.load_agents(&snapshot.runtimes, &mut snapshot.warnings) {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "agent catalog", error);
                Vec::new()
            }
        };
        snapshot.os_packages = match self.load_os_packages(&mut snapshot.warnings) {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "OS registry", error);
                Vec::new()
            }
        };
        snapshot.mcp_servers = match self.load_mcp_servers() {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "MCP inventory", error);
                Vec::new()
            }
        };
        snapshot.skills = match self.load_skills(&mut snapshot.warnings) {
            Ok(records) => records,
            Err(error) => {
                warn(&mut snapshot.warnings, "skill inventory", error);
                Vec::new()
            }
        };

        snapshot.warnings.sort();
        snapshot.warnings.dedup();
        snapshot
    }

    fn load_runtimes(
        &self,
        live_rmux_names: &[String],
        warnings: &mut Vec<String>,
    ) -> Result<Vec<RuntimeRecord>> {
        let live: BTreeSet<String> = live_rmux_names
            .iter()
            .filter(|name| visible_rmux_name(name))
            .cloned()
            .collect();
        let Some(connection) = open_read_only(&self.paths.runtime_db)? else {
            return Ok(unmanaged_runtimes(live_rmux_names, &self.environment));
        };
        let columns = table_columns(&connection, "runtime_sessions")?;
        require_columns(
            &columns,
            &[
                "id",
                "name",
                "type",
                "environment",
                "client",
                "project",
                "mission",
                "rmux_session",
                "cwd",
                "status",
                "created_at",
                "last_activity",
            ],
            "runtime_sessions",
        )?;
        let native_column = if columns.contains("native_session") {
            "native_session"
        } else {
            "NULL AS native_session"
        };
        let archive_clause = if columns.contains("archived_at") {
            " AND archived_at IS NULL"
        } else {
            ""
        };
        let sql = format!(
            "SELECT id,name,type,environment,client,project,mission,{native_column},\
             rmux_session,cwd,status,created_at,last_activity \
             FROM runtime_sessions WHERE environment=?1{archive_clause} \
             ORDER BY last_activity DESC,name"
        );
        let mut statement = connection.prepare(&sql)?;
        let rows = statement.query_map([&self.environment], |row| {
            Ok(RawRuntime {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                environment: row.get(3)?,
                client: row.get(4)?,
                project: row.get(5)?,
                mission: row.get(6)?,
                native_session: row.get(7)?,
                rmux_session: row.get(8)?,
                cwd: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                last_activity: row.get(12)?,
            })
        })?;

        let mut records = Vec::new();
        let mut managed_rmux = HashSet::new();
        for row in rows {
            let row = row?;
            if !visible_rmux_name(&row.name) || !visible_rmux_name(&row.rmux_session) {
                continue;
            }
            let is_live = live.contains(&row.rmux_session);
            managed_rmux.insert(row.rmux_session.clone());
            let status = projected_runtime_status(&row.status, is_live);
            records.push(RuntimeRecord {
                id: row.id,
                name: row.name,
                kind: row.kind,
                environment: row.environment,
                client: row.client,
                project: row.project,
                mission: row.mission,
                native_session: row.native_session,
                rmux_session: row.rmux_session,
                cwd: row.cwd,
                status,
                created_at: row.created_at,
                last_activity: row.last_activity,
                tokens: 0,
                managed: true,
                live: is_live,
            });
        }

        for name in live {
            if !managed_rmux.contains(&name) {
                records.push(unmanaged_runtime(name, &self.environment));
            }
        }
        if !columns.contains("native_session") {
            warnings.push("runtime registry uses a legacy schema without native_session".into());
        }
        Ok(records)
    }

    fn load_hermes_tokens(
        &self,
        native_sessions: &BTreeSet<String>,
    ) -> Result<HashMap<String, u64>> {
        if native_sessions.is_empty() {
            return Ok(HashMap::new());
        }
        let Some(connection) = open_read_only(&self.paths.hermes_state_db)? else {
            return Ok(HashMap::new());
        };
        let columns = table_columns(&connection, "sessions")?;
        require_columns(
            &columns,
            &["id", "input_tokens", "output_tokens"],
            "sessions",
        )?;
        let placeholders = std::iter::repeat_n("?", native_sessions.len())
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!(
            "SELECT id,COALESCE(input_tokens,0),COALESCE(output_tokens,0) \
             FROM sessions WHERE id IN ({placeholders})"
        );
        let mut statement = connection.prepare(&sql)?;
        let rows = statement.query_map(params_from_iter(native_sessions.iter()), |row| {
            let input: i64 = row.get(1)?;
            let output: i64 = row.get(2)?;
            Ok((
                row.get::<_, String>(0)?,
                nonnegative(input).saturating_add(nonnegative(output)),
            ))
        })?;
        let mut tokens = HashMap::new();
        for row in rows {
            let (id, total) = row?;
            tokens.insert(id, total);
        }
        Ok(tokens)
    }

    fn load_control_objects(&self, warnings: &mut Vec<String>) -> Result<Vec<ControlObject>> {
        let Some(connection) = open_read_only(&self.paths.control_db)? else {
            return Ok(Vec::new());
        };
        let columns = table_columns(&connection, "objects")?;
        require_columns(
            &columns,
            &[
                "id",
                "environment",
                "kind",
                "slug",
                "name",
                "parent_id",
                "status",
                "path",
                "metadata_json",
                "created_at",
                "updated_at",
            ],
            "objects",
        )?;
        let mut statement = connection.prepare(
            "SELECT id,environment,kind,slug,name,parent_id,status,path,metadata_json,created_at,updated_at \
             FROM objects WHERE environment=?1 AND kind IN ('client','project','mission') \
             ORDER BY updated_at DESC,name",
        )?;
        let data_environment = self.data_environment();
        let rows = statement.query_map([&data_environment], |row| {
            Ok(RawControlObject {
                id: row.get(0)?,
                environment: row.get(1)?,
                kind: row.get(2)?,
                slug: row.get(3)?,
                name: row.get(4)?,
                parent_id: row.get(5)?,
                status: row.get(6)?,
                path: row.get(7)?,
                metadata_json: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut objects = Vec::new();
        for row in rows {
            let row = row?;
            let metadata = match serde_json::from_str(&row.metadata_json) {
                Ok(metadata) => metadata,
                Err(error) => {
                    warnings.push(format!(
                        "control object {} has invalid metadata JSON: {error}",
                        row.id
                    ));
                    JsonValue::Object(Default::default())
                }
            };
            objects.push(ControlObject {
                id: row.id,
                environment: row.environment,
                kind: row.kind,
                slug: row.slug,
                name: row.name,
                parent_id: row.parent_id,
                status: row.status,
                path: row.path,
                metadata,
                created_at: row.created_at,
                updated_at: row.updated_at,
            });
        }
        Ok(objects)
    }

    fn load_agents(
        &self,
        runtimes: &[RuntimeRecord],
        warnings: &mut Vec<String>,
    ) -> Result<Vec<AgentRecord>> {
        let root = &self.paths.agent_catalog;
        if !path_is_file_or_directory(root, false)? {
            return Ok(Vec::new());
        }
        let mut manifests = Vec::new();
        for entry in
            fs::read_dir(root).with_context(|| format!("cannot read {}", root.display()))?
        {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let manifest = entry.path().join("agent.yaml");
                if manifest.is_file() {
                    manifests.push(manifest);
                }
            }
        }
        manifests.sort();
        let runtime_by_name: HashMap<&str, &RuntimeRecord> = runtimes
            .iter()
            // An unmanaged RMUX name must not impersonate an installed agent.
            // The Agentik runtime row is the durable identity contract.
            .filter(|record| record.managed)
            .map(|record| (record.name.as_str(), record))
            .collect();
        let data_environment = self.data_environment();
        let mut agents = Vec::new();
        for manifest_path in manifests {
            let text = match fs::read_to_string(&manifest_path) {
                Ok(text) => text,
                Err(error) => {
                    warnings.push(format!(
                        "agent manifest {} cannot be read: {error}",
                        manifest_path.display()
                    ));
                    continue;
                }
            };
            let manifest: AgentManifest = match serde_yaml::from_str(&text) {
                Ok(manifest) => manifest,
                Err(error) => {
                    warnings.push(format!(
                        "agent manifest {} is invalid: {error}",
                        manifest_path.display()
                    ));
                    continue;
                }
            };
            if !valid_agent_id(&manifest.id) {
                warnings.push(format!(
                    "agent manifest {} has an invalid id",
                    manifest_path.display()
                ));
                continue;
            }
            let prompt = manifest_path
                .parent()
                .expect("agent manifest always has a parent")
                .join(&manifest.prompt);
            if !prompt.is_file() {
                warnings.push(format!(
                    "agent {} is missing its prompt file {}",
                    manifest.id,
                    prompt.display()
                ));
                continue;
            }
            let runtime_name = format!("{}-{}", self.environment, manifest.id);
            let running = runtime_by_name.get(runtime_name.as_str()).copied();
            agents.push(AgentRecord {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                available: manifest
                    .scope
                    .iter()
                    .any(|scope| scope == &data_environment),
                scope: manifest.scope,
                runtime: manifest.runtime,
                catalog_path: manifest_path
                    .parent()
                    .expect("agent manifest always has a parent")
                    .to_string_lossy()
                    .into_owned(),
                runtime_name,
                runtime_id: running.map(|record| record.id.clone()),
                status: running
                    .map(|record| record.status.clone())
                    .unwrap_or_else(|| "not-started".into()),
                live: running.is_some_and(|record| record.live),
            });
        }
        agents.sort_by(|left, right| left.id.cmp(&right.id));
        Ok(agents)
    }

    fn load_os_packages(&self, warnings: &mut Vec<String>) -> Result<Vec<OsPackage>> {
        let index_path = self.paths.os_registry.join("state/index.json");
        let assignments = match self.load_os_assignments(warnings) {
            Ok(assignments) => assignments,
            Err(error) => {
                warnings.push(format!("OS assignments: {error:#}"));
                Vec::new()
            }
        };
        if !path_is_file_or_directory(&index_path, true)? {
            return Ok(Vec::new());
        }
        let text = fs::read_to_string(&index_path)
            .with_context(|| format!("cannot read {}", index_path.display()))?;
        let index: JsonValue = serde_json::from_str(&text)
            .with_context(|| format!("cannot parse {}", index_path.display()))?;
        let package_values = index
            .as_object()
            .and_then(|object| object.get("packages"))
            .and_then(JsonValue::as_array)
            .ok_or_else(|| anyhow!("{} does not contain a packages array", index_path.display()))?;
        let data_environment = self.data_environment();
        let mut packages = Vec::new();
        for value in package_values {
            let raw: OsManifest = match serde_json::from_value(value.clone()) {
                Ok(raw) => raw,
                Err(error) => {
                    warnings.push(format!("OS registry contains an invalid package: {error}"));
                    continue;
                }
            };
            if !valid_kebab_id(&raw.id)
                || raw.name.trim().is_empty()
                || raw.version.trim().is_empty()
                || raw.scope.is_empty()
            {
                warnings.push(format!(
                    "OS registry contains an incomplete package {}@{}",
                    raw.id, raw.version
                ));
                continue;
            }
            let reference = format!("{}@{}", raw.id, raw.version);
            let mut package_assignments: Vec<String> = assignments
                .iter()
                .filter(|assignment| assignment.reference == reference)
                .map(|assignment| format!("{}:{}", assignment.scope, assignment.target))
                .collect();
            package_assignments.sort();
            package_assignments.dedup();
            packages.push(OsPackage {
                id: raw.id,
                name: raw.name,
                version: raw.version,
                description: raw.description,
                available: raw.scope.iter().any(|scope| {
                    scope == "global" || scope == &data_environment || scope == "environment"
                }),
                scope: raw.scope,
                dependencies: raw.dependencies,
                capabilities: raw.capabilities,
                skills: raw.skills,
                workflows: raw.workflows,
                agents: raw.agents,
                tools: raw.tools,
                commands: raw.commands,
                knowledge: raw.knowledge,
                evals: raw.evals,
                assignments: package_assignments,
            });
        }
        let installed: HashSet<String> = packages
            .iter()
            .map(|package| format!("{}@{}", package.id, package.version))
            .collect();
        for assignment in &assignments {
            if !installed.contains(&assignment.reference) {
                warnings.push(format!(
                    "OS assignment references an uninstalled package: {}",
                    assignment.reference
                ));
            }
        }
        packages.sort_by(|left, right| (&left.id, &left.version).cmp(&(&right.id, &right.version)));
        Ok(packages)
    }

    fn load_os_assignments(&self, warnings: &mut Vec<String>) -> Result<Vec<OsAssignment>> {
        if !path_is_file_or_directory(&self.paths.os_assignments, true)? {
            return Ok(Vec::new());
        }
        let text = fs::read_to_string(&self.paths.os_assignments)
            .with_context(|| format!("cannot read {}", self.paths.os_assignments.display()))?;
        let document: YamlValue = serde_yaml::from_str(&text)
            .with_context(|| format!("cannot parse {}", self.paths.os_assignments.display()))?;
        let Some(records) =
            yaml_mapping_get(&document, "assignments").and_then(YamlValue::as_sequence)
        else {
            bail!(
                "{} does not contain an assignments list",
                self.paths.os_assignments.display()
            );
        };
        let mut assignments = Vec::new();
        for record in records {
            if let Some(reference) = record.as_str() {
                assignments.push(OsAssignment {
                    reference: reference.to_owned(),
                    scope: "legacy".into(),
                    target: "unscoped".into(),
                });
                continue;
            }
            let Some(mapping) = record.as_mapping() else {
                warnings.push("OS assignment is neither a reference nor a mapping".into());
                continue;
            };
            let string = |key: &str| {
                mapping
                    .get(YamlValue::String(key.into()))
                    .and_then(YamlValue::as_str)
                    .map(str::to_owned)
            };
            let (Some(reference), Some(scope), Some(target)) =
                (string("os"), string("scope"), string("target"))
            else {
                warnings.push("OS assignment is missing os, scope, or target".into());
                continue;
            };
            assignments.push(OsAssignment {
                reference,
                scope,
                target,
            });
        }
        Ok(assignments)
    }

    fn load_mcp_servers(&self) -> Result<Vec<CapabilityRecord>> {
        if !path_is_file_or_directory(&self.paths.hermes_config, true)? {
            return Ok(Vec::new());
        }
        let text = fs::read_to_string(&self.paths.hermes_config)
            .with_context(|| format!("cannot read {}", self.paths.hermes_config.display()))?;
        let config: YamlValue = serde_yaml::from_str(&text)
            .with_context(|| format!("cannot parse {}", self.paths.hermes_config.display()))?;
        let Some(servers) =
            yaml_mapping_get(&config, "mcp_servers").and_then(YamlValue::as_mapping)
        else {
            return Ok(Vec::new());
        };
        let mut records = Vec::new();
        for (name, raw) in servers {
            let Some(name) = name.as_str() else {
                continue;
            };
            let mapping = raw.as_mapping();
            let configured = |key: &str| {
                mapping
                    .and_then(|mapping| mapping.get(YamlValue::String(key.into())))
                    .is_some_and(yaml_value_is_configured)
            };
            let transport = if configured("url") {
                "http"
            } else if configured("command") {
                "stdio"
            } else {
                "unknown"
            };
            let disabled = mapping
                .and_then(|mapping| mapping.get(YamlValue::String("enabled".into())))
                .is_some_and(|value| value == &YamlValue::Bool(false));
            records.push(CapabilityRecord {
                name: name.to_owned(),
                transport: transport.into(),
                status: if disabled { "disabled" } else { "configured" }.into(),
            });
        }
        records.sort_by(|left, right| left.name.cmp(&right.name));
        Ok(records)
    }

    fn load_skills(&self, warnings: &mut Vec<String>) -> Result<Vec<SkillRecord>> {
        let roots = [
            (&self.paths.hermes_skills, "hermes", false),
            (&self.paths.claude_skills, "claude", false),
            (&self.paths.codex_skills, "codex", true),
        ];
        let mut found = BTreeMap::new();
        for (root, source, nested) in roots {
            match scan_skill_root(root, source, nested) {
                Ok(records) => {
                    for record in records {
                        found.insert((record.name.clone(), record.source.clone()), record);
                    }
                }
                Err(error) => warnings.push(format!(
                    "skill source {} at {} cannot be read: {error:#}",
                    source,
                    root.display()
                )),
            }
        }
        Ok(found.into_values().collect())
    }

    fn data_environment(&self) -> String {
        if self.environment == "collective" {
            "mission".into()
        } else {
            self.environment.clone()
        }
    }
}

#[derive(Debug)]
struct RawRuntime {
    id: String,
    name: String,
    kind: String,
    environment: String,
    client: Option<String>,
    project: Option<String>,
    mission: Option<String>,
    native_session: Option<String>,
    rmux_session: String,
    cwd: String,
    status: String,
    created_at: f64,
    last_activity: f64,
}

#[derive(Debug)]
struct RawControlObject {
    id: String,
    environment: String,
    kind: String,
    slug: String,
    name: String,
    parent_id: Option<String>,
    status: String,
    path: Option<String>,
    metadata_json: String,
    created_at: f64,
    updated_at: f64,
}

#[derive(Debug, Deserialize)]
struct AgentManifest {
    id: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    version: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    scope: Vec<String>,
    #[serde(default = "default_agent_runtime")]
    runtime: String,
    #[serde(default = "default_agent_prompt")]
    prompt: String,
}

#[derive(Debug, Deserialize)]
struct OsManifest {
    id: String,
    name: String,
    version: String,
    description: String,
    scope: Vec<String>,
    #[serde(default)]
    dependencies: Vec<String>,
    #[serde(default)]
    capabilities: Vec<String>,
    #[serde(default)]
    skills: Vec<String>,
    #[serde(default)]
    workflows: Vec<String>,
    #[serde(default)]
    agents: Vec<String>,
    #[serde(default)]
    tools: Vec<String>,
    #[serde(default)]
    commands: Vec<String>,
    #[serde(default)]
    knowledge: Vec<String>,
    #[serde(default)]
    evals: Vec<String>,
}

#[derive(Clone, Debug)]
struct OsAssignment {
    reference: String,
    scope: String,
    target: String,
}

fn discover_bundled_catalog() -> PathBuf {
    let installed = PathBuf::from("/opt/agentik/hermes/current/agents");
    if installed.is_dir() {
        installed
    } else {
        let user_catalog = std::env::var_os("AGK_INSTALL_ROOT")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share/agk"))
            })
            .map(|root| root.join("agents"));
        user_catalog
            .filter(|path| path.is_dir())
            .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../agents"))
    }
}

fn default_agent_runtime() -> String {
    "hermes".into()
}

fn default_agent_prompt() -> String {
    "prompt.md".into()
}

fn open_read_only(path: &Path) -> Result<Option<Connection>> {
    match fs::metadata(path) {
        Ok(metadata) if !metadata.is_file() => bail!("{} is not a regular file", path.display()),
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(error).with_context(|| format!("cannot inspect {}", path.display()));
        }
    }
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map(Some)
    .with_context(|| format!("cannot open {} read-only", path.display()))
}

fn table_columns(connection: &Connection, table: &str) -> Result<HashSet<String>> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    let columns = rows.collect::<rusqlite::Result<HashSet<_>>>()?;
    if columns.is_empty() {
        bail!("required SQLite table {table} is missing");
    }
    Ok(columns)
}

fn require_columns(columns: &HashSet<String>, required: &[&str], table: &str) -> Result<()> {
    let missing: Vec<_> = required
        .iter()
        .filter(|column| !columns.contains(**column))
        .copied()
        .collect();
    if !missing.is_empty() {
        bail!(
            "SQLite table {table} is missing columns: {}",
            missing.join(", ")
        );
    }
    Ok(())
}

fn path_is_file_or_directory(path: &Path, file: bool) -> Result<bool> {
    match fs::metadata(path) {
        Ok(metadata) if file && metadata.is_file() => Ok(true),
        Ok(metadata) if !file && metadata.is_dir() => Ok(true),
        Ok(_) => bail!(
            "{} is not a {}",
            path.display(),
            if file { "regular file" } else { "directory" }
        ),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error).with_context(|| format!("cannot inspect {}", path.display())),
    }
}

fn projected_runtime_status(stored: &str, live: bool) -> String {
    if !live && !TERMINAL_RUNTIME_STATES.contains(&stored) {
        "interrupted".into()
    } else if live && stored == "interrupted" {
        "running".into()
    } else {
        stored.into()
    }
}

fn visible_rmux_name(name: &str) -> bool {
    !name.is_empty() && !name.ends_with("-control")
}

fn unmanaged_runtimes(names: &[String], environment: &str) -> Vec<RuntimeRecord> {
    names
        .iter()
        .filter(|name| visible_rmux_name(name))
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .map(|name| unmanaged_runtime(name, environment))
        .collect()
}

fn unmanaged_runtime(name: String, environment: &str) -> RuntimeRecord {
    RuntimeRecord {
        id: format!("rmux:{name}"),
        name: name.clone(),
        kind: "unmanaged".into(),
        environment: environment.into(),
        client: None,
        project: None,
        mission: None,
        native_session: None,
        rmux_session: name,
        cwd: String::new(),
        status: "running".into(),
        created_at: 0.0,
        last_activity: 0.0,
        tokens: 0,
        managed: false,
        live: true,
    }
}

fn nonnegative(value: i64) -> u64 {
    u64::try_from(value).unwrap_or(0)
}

fn valid_agent_id(value: &str) -> bool {
    let mut bytes = value.bytes();
    (3..=80).contains(&value.len())
        && matches!(bytes.next(), Some(b'a'..=b'z' | b'0'..=b'9'))
        && bytes.all(|byte| matches!(byte, b'a'..=b'z' | b'0'..=b'9' | b'-'))
}

fn valid_kebab_id(value: &str) -> bool {
    let mut bytes = value.bytes();
    matches!(bytes.next(), Some(b'a'..=b'z' | b'0'..=b'9'))
        && bytes.all(|byte| matches!(byte, b'a'..=b'z' | b'0'..=b'9' | b'-'))
        && !value.ends_with('-')
        && !value.contains("--")
}

fn yaml_mapping_get<'a>(value: &'a YamlValue, key: &str) -> Option<&'a YamlValue> {
    value.as_mapping()?.get(YamlValue::String(key.to_owned()))
}

fn yaml_value_is_configured(value: &YamlValue) -> bool {
    match value {
        YamlValue::Null => false,
        YamlValue::Bool(value) => *value,
        YamlValue::String(value) => !value.is_empty(),
        YamlValue::Sequence(value) => !value.is_empty(),
        YamlValue::Mapping(value) => !value.is_empty(),
        _ => true,
    }
}

fn scan_skill_root(root: &Path, source: &str, nested: bool) -> Result<Vec<SkillRecord>> {
    if !path_is_file_or_directory(root, false)? {
        return Ok(Vec::new());
    }
    let mut manifests = BTreeSet::new();
    let mut children = fs::read_dir(root)
        .with_context(|| format!("cannot read {}", root.display()))?
        .collect::<std::io::Result<Vec<_>>>()?;
    children.sort_by_key(|entry| entry.file_name());
    for child in children {
        if !child.file_type()?.is_dir() {
            continue;
        }
        let child_path = child.path();
        for filename in ["DESCRIPTION.md", "SKILL.md"] {
            let manifest = child_path.join(filename);
            if manifest.is_file() {
                manifests.insert(manifest);
            }
        }
        if nested {
            let mut grandchildren =
                fs::read_dir(&child_path)?.collect::<std::io::Result<Vec<_>>>()?;
            grandchildren.sort_by_key(|entry| entry.file_name());
            for grandchild in grandchildren {
                if grandchild.file_type()?.is_dir() {
                    let manifest = grandchild.path().join("SKILL.md");
                    if manifest.is_file() {
                        manifests.insert(manifest);
                    }
                }
            }
        }
    }
    let mut records = BTreeMap::new();
    for manifest in manifests.into_iter().take(MAX_SKILLS_PER_SOURCE) {
        let Some(name) = manifest.parent().and_then(Path::file_name) else {
            continue;
        };
        let name = name.to_string_lossy().into_owned();
        records.entry(name.clone()).or_insert_with(|| SkillRecord {
            name,
            source: source.into(),
            status: "installed".into(),
        });
    }
    Ok(records.into_values().collect())
}

fn warn(warnings: &mut Vec<String>, source: &str, error: anyhow::Error) {
    warnings.push(format!("{source}: {error:#}"));
}
