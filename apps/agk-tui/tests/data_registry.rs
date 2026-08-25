#[path = "../src/data.rs"]
mod data;

use data::{RegistryClient, RegistryPaths};
use pretty_assertions::assert_eq;
use rusqlite::{Connection, params};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

fn paths(temp: &TempDir) -> RegistryPaths {
    RegistryPaths::for_home(
        temp.path(),
        temp.path().join("catalog"),
        temp.path().join("os-registry"),
    )
}

fn parent(path: &Path) {
    fs::create_dir_all(path.parent().expect("test path has a parent")).unwrap();
}

fn write(path: impl AsRef<Path>, contents: &str) {
    let path = path.as_ref();
    parent(path);
    fs::write(path, contents).unwrap();
}

fn runtime_db(path: &Path, include_native_session: bool) -> Connection {
    parent(path);
    let connection = Connection::open(path).unwrap();
    let native = if include_native_session {
        ", native_session TEXT"
    } else {
        ""
    };
    connection
        .execute_batch(&format!(
            "CREATE TABLE runtime_sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                environment TEXT NOT NULL,
                client TEXT,
                project TEXT,
                mission TEXT,
                rmux_session TEXT NOT NULL,
                cwd TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at REAL NOT NULL,
                last_activity REAL NOT NULL,
                archived_at REAL
                {native}
            );"
        ))
        .unwrap();
    connection
}

#[allow(clippy::too_many_arguments)]
fn insert_runtime(
    connection: &Connection,
    id: &str,
    name: &str,
    kind: &str,
    environment: &str,
    client: Option<&str>,
    project: Option<&str>,
    mission: Option<&str>,
    status: &str,
    last_activity: f64,
    archived_at: Option<f64>,
    native_session: Option<&str>,
) {
    connection
        .execute(
            "INSERT INTO runtime_sessions(
                id,name,type,environment,client,project,mission,rmux_session,cwd,status,
                created_at,last_activity,archived_at,native_session
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?2,'/workspace',?8,1.0,?9,?10,?11)",
            params![
                id,
                name,
                kind,
                environment,
                client,
                project,
                mission,
                status,
                last_activity,
                archived_at,
                native_session
            ],
        )
        .unwrap();
}

fn hermes_db(path: &Path) -> Connection {
    parent(path);
    let connection = Connection::open(path).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0
            );",
        )
        .unwrap();
    connection
}

#[test]
fn missing_stores_are_empty_and_never_created() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    let snapshot = RegistryClient::new("operator", paths.clone()).load(&[
        "operator-control".into(),
        "loose-session".into(),
        "loose-session".into(),
    ]);

    assert_eq!(snapshot.runtimes.len(), 1);
    assert_eq!(snapshot.runtimes[0].name, "loose-session");
    assert!(!snapshot.runtimes[0].managed);
    assert!(snapshot.runtimes[0].live);
    assert!(snapshot.objects.is_empty());
    assert!(snapshot.agents.is_empty());
    assert!(snapshot.os_packages.is_empty());
    assert!(snapshot.mcp_servers.is_empty());
    assert!(snapshot.skills.is_empty());
    assert_eq!(snapshot.token_total, 0);
    assert!(snapshot.warnings.is_empty());
    assert!(!paths.runtime_db.exists());
    assert!(!paths.control_db.exists());
    assert!(!paths.hermes_state_db.exists());
}

#[test]
fn runtimes_join_live_rmux_filter_controls_and_preserve_unmanaged_sessions() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    let runtime = runtime_db(&paths.runtime_db, true);
    insert_runtime(
        &runtime,
        "RT-LIVE",
        "operator-live",
        "hermes",
        "operator",
        Some("CLI-1"),
        Some("PRJ-1"),
        Some("MIS-1"),
        "interrupted",
        50.0,
        None,
        Some("hermes-1"),
    );
    insert_runtime(
        &runtime,
        "RT-STALE",
        "operator-stale",
        "codex",
        "operator",
        None,
        Some("PRJ-2"),
        None,
        "working",
        40.0,
        None,
        Some("codex-native"),
    );
    insert_runtime(
        &runtime,
        "RT-COMPLETE",
        "operator-complete",
        "hermes",
        "operator",
        None,
        None,
        None,
        "complete",
        30.0,
        None,
        Some("hermes-1"),
    );
    insert_runtime(
        &runtime,
        "RT-CONTROL",
        "operator-control",
        "shell",
        "operator",
        None,
        None,
        None,
        "running",
        20.0,
        None,
        None,
    );
    insert_runtime(
        &runtime,
        "RT-ARCHIVED",
        "operator-archived",
        "shell",
        "operator",
        None,
        None,
        None,
        "archived",
        10.0,
        Some(99.0),
        None,
    );
    insert_runtime(
        &runtime,
        "RT-OTHER",
        "private-other",
        "shell",
        "private",
        None,
        None,
        None,
        "running",
        60.0,
        None,
        None,
    );
    drop(runtime);

    let hermes = hermes_db(&paths.hermes_state_db);
    hermes
        .execute(
            "INSERT INTO sessions(id,input_tokens,output_tokens) VALUES ('hermes-1',12,8)",
            [],
        )
        .unwrap();
    hermes
        .execute(
            "INSERT INTO sessions(id,input_tokens,output_tokens) VALUES ('unrelated',900,100)",
            [],
        )
        .unwrap();
    drop(hermes);

    let snapshot = RegistryClient::new("operator", paths).load(&[
        "operator-live".into(),
        "operator-control".into(),
        "unmanaged-work".into(),
    ]);
    let names: Vec<_> = snapshot
        .runtimes
        .iter()
        .map(|runtime| runtime.name.as_str())
        .collect();
    assert_eq!(
        names,
        vec![
            "operator-live",
            "operator-stale",
            "operator-complete",
            "unmanaged-work"
        ]
    );

    let live = &snapshot.runtimes[0];
    assert_eq!(live.status, "running");
    assert!(live.managed && live.live);
    assert_eq!(live.client.as_deref(), Some("CLI-1"));
    assert_eq!(live.project.as_deref(), Some("PRJ-1"));
    assert_eq!(live.mission.as_deref(), Some("MIS-1"));
    assert_eq!(live.tokens, 20);

    let stale = &snapshot.runtimes[1];
    assert_eq!(stale.status, "interrupted");
    assert!(stale.managed && !stale.live);
    assert_eq!(stale.tokens, 0);

    let complete = &snapshot.runtimes[2];
    assert_eq!(complete.status, "complete");
    assert_eq!(complete.tokens, 20);

    let unmanaged = &snapshot.runtimes[3];
    assert_eq!(unmanaged.id, "rmux:unmanaged-work");
    assert_eq!(unmanaged.kind, "unmanaged");
    assert!(!unmanaged.managed && unmanaged.live);

    // Both managed rows refer to one Hermes session, so the aggregate is not
    // double counted and unrelated Hermes sessions do not leak into it.
    assert_eq!(snapshot.token_total, 20);
    assert!(snapshot.warnings.is_empty());
}

#[test]
fn legacy_runtime_schema_loads_without_mutation() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    let runtime = runtime_db(&paths.runtime_db, false);
    runtime
        .execute(
            "INSERT INTO runtime_sessions(
                id,name,type,environment,rmux_session,cwd,status,created_at,last_activity
             ) VALUES ('RT-OLD','operator-old','shell','operator','operator-old','/tmp','running',1,2)",
            [],
        )
        .unwrap();
    drop(runtime);

    let snapshot = RegistryClient::new("operator", paths.clone()).load(&["operator-old".into()]);
    assert_eq!(snapshot.runtimes.len(), 1);
    assert_eq!(snapshot.runtimes[0].native_session, None);
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.contains("legacy schema without native_session"))
    );

    let connection = Connection::open(paths.runtime_db).unwrap();
    let native_column_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('runtime_sessions') WHERE name='native_session'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(native_column_count, 0);
}

#[test]
fn control_objects_are_scoped_and_collective_maps_to_mission() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    parent(&paths.control_db);
    let connection = Connection::open(&paths.control_db).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE objects (
                id TEXT PRIMARY KEY, environment TEXT, kind TEXT, slug TEXT, name TEXT,
                parent_id TEXT, status TEXT, path TEXT, metadata_json TEXT,
                created_at REAL, updated_at REAL
            );",
        )
        .unwrap();
    let objects = [
        (
            "CLI-1",
            "mission",
            "client",
            "acme",
            "Acme",
            None,
            "active",
            None,
            "{\"tier\":\"gold\"}",
            1.0,
        ),
        (
            "PRJ-1",
            "mission",
            "project",
            "rocket",
            "Rocket",
            Some("CLI-1"),
            "active",
            Some("/clients/acme/rocket"),
            "{}",
            2.0,
        ),
        (
            "MIS-1",
            "mission",
            "mission",
            "launch",
            "Launch",
            Some("PRJ-1"),
            "paused",
            None,
            "not-json",
            3.0,
        ),
        (
            "TSK-1",
            "mission",
            "task",
            "task",
            "Task",
            Some("MIS-1"),
            "active",
            None,
            "{}",
            4.0,
        ),
        (
            "PRJ-X", "private", "project", "secret", "Secret", None, "active", None, "{}", 5.0,
        ),
    ];
    for (id, environment, kind, slug, name, parent_id, status, path, metadata, updated) in objects {
        connection
            .execute(
                "INSERT INTO objects VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,0,?10)",
                params![
                    id,
                    environment,
                    kind,
                    slug,
                    name,
                    parent_id,
                    status,
                    path,
                    metadata,
                    updated
                ],
            )
            .unwrap();
    }
    drop(connection);

    let snapshot = RegistryClient::new("collective", paths).load(&[]);
    let ids: Vec<_> = snapshot
        .objects
        .iter()
        .map(|object| object.id.as_str())
        .collect();
    assert_eq!(ids, vec!["MIS-1", "PRJ-1", "CLI-1"]);
    assert_eq!(snapshot.objects[0].parent_id.as_deref(), Some("PRJ-1"));
    assert_eq!(
        snapshot.objects[1].path.as_deref(),
        Some("/clients/acme/rocket")
    );
    assert_eq!(snapshot.objects[2].metadata["tier"], "gold");
    assert_eq!(snapshot.objects[0].metadata, serde_json::json!({}));
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.contains("MIS-1 has invalid metadata JSON"))
    );
}

#[test]
fn agent_catalog_validates_prompts_scopes_and_runtime_status() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        paths.agent_catalog.join("builder/agent.yaml"),
        "id: master-builder\nname: Master Builder\nversion: 1.2.3\ndescription: Builds systems\nscope: [mission]\nruntime: hermes\nprompt: prompt.md\n",
    );
    write(
        paths.agent_catalog.join("builder/prompt.md"),
        "instructions",
    );
    write(
        paths.agent_catalog.join("private/agent.yaml"),
        "id: private-agent\nname: Private\nversion: 1.0.0\ndescription: Private only\nscope: [private]\nprompt: prompt.md\n",
    );
    write(
        paths.agent_catalog.join("private/prompt.md"),
        "instructions",
    );
    write(
        paths.agent_catalog.join("missing/agent.yaml"),
        "id: missing-prompt\nname: Missing\nversion: 1.0.0\nscope: [mission]\n",
    );
    write(
        paths.agent_catalog.join("invalid/agent.yaml"),
        "id: INVALID\nname: Invalid\nversion: 1.0.0\nscope: [mission]\nprompt: prompt.md\n",
    );
    write(
        paths.agent_catalog.join("invalid/prompt.md"),
        "instructions",
    );

    let runtime = runtime_db(&paths.runtime_db, true);
    insert_runtime(
        &runtime,
        "RT-AGENT",
        "collective-master-builder",
        "hermes",
        "collective",
        None,
        None,
        None,
        "running",
        1.0,
        None,
        None,
    );
    drop(runtime);

    let snapshot =
        RegistryClient::new("collective", paths).load(&["collective-master-builder".into()]);
    assert_eq!(snapshot.agents.len(), 2);
    let builder = snapshot
        .agents
        .iter()
        .find(|agent| agent.id == "master-builder")
        .unwrap();
    assert_eq!(builder.runtime, "hermes");
    assert_eq!(builder.status, "running");
    assert!(builder.live);
    assert!(builder.available);
    assert_eq!(builder.runtime_id.as_deref(), Some("RT-AGENT"));
    let private = snapshot
        .agents
        .iter()
        .find(|agent| agent.id == "private-agent")
        .unwrap();
    assert_eq!(private.status, "not-started");
    assert!(!private.live);
    assert!(!private.available);
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.contains("missing-prompt") && warning.contains("prompt"))
    );
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.contains("invalid id"))
    );
}

#[test]
fn unmanaged_rmux_name_does_not_impersonate_a_catalog_agent() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        paths.agent_catalog.join("helper/agent.yaml"),
        "id: helper-agent\nname: Helper\nversion: 1.0.0\ndescription: Helps\nscope: [operator]\nprompt: prompt.md\n",
    );
    write(paths.agent_catalog.join("helper/prompt.md"), "prompt");

    let snapshot = RegistryClient::new("operator", paths).load(&["operator-helper-agent".into()]);
    assert_eq!(snapshot.runtimes.len(), 1);
    assert!(!snapshot.runtimes[0].managed);
    assert_eq!(snapshot.agents[0].status, "not-started");
    assert!(!snapshot.agents[0].live);
    assert_eq!(snapshot.agents[0].runtime_id, None);
}

#[test]
fn os_registry_preserves_manifest_fields_and_attaches_assignments() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        paths.os_registry.join("state/index.json"),
        r#"{
          "schema_version": 1,
          "packages": [
            {
              "id": "mission-control", "name": "Mission Control", "version": "2.0.0",
              "description": "Coordinates missions", "scope": ["mission", "project"],
              "dependencies": ["base@1.0.0"], "capabilities": ["planning"],
              "skills": ["triage"], "workflows": ["launch"], "agents": ["builder"],
              "tools": ["terminal"], "commands": ["mission"], "knowledge": ["runbook"],
              "evals": ["smoke"]
            },
            {
              "id": "private-kit", "name": "Private Kit", "version": "1.0.0",
              "description": "Private", "scope": ["private"]
            },
            {"id": "broken"}
          ]
        }"#,
    );
    write(
        &paths.os_assignments,
        "schema_version: 1\nassignments:\n  - os: mission-control@2.0.0\n    scope: environment\n    target: mission\n  - os: mission-control@2.0.0\n    scope: project\n    target: PRJ-1\n  - private-kit@1.0.0\n",
    );

    let snapshot = RegistryClient::new("collective", paths).load(&[]);
    assert_eq!(snapshot.os_packages.len(), 2);
    let mission = snapshot
        .os_packages
        .iter()
        .find(|package| package.id == "mission-control")
        .unwrap();
    assert_eq!(mission.version, "2.0.0");
    assert_eq!(mission.dependencies, vec!["base@1.0.0"]);
    assert_eq!(mission.capabilities, vec!["planning"]);
    assert_eq!(
        mission.assignments,
        vec!["environment:mission", "project:PRJ-1"]
    );
    assert!(mission.available);
    let private = snapshot
        .os_packages
        .iter()
        .find(|package| package.id == "private-kit")
        .unwrap();
    assert_eq!(private.assignments, vec!["legacy:unscoped"]);
    assert!(!private.available);
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.contains("invalid package"))
    );
}

#[test]
fn malformed_os_assignments_do_not_hide_valid_installed_packages() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        paths.os_registry.join("state/index.json"),
        r#"{"packages":[{"id":"base-os","name":"Base","version":"1.0.0","description":"Base OS","scope":["global"]}]}"#,
    );
    write(&paths.os_assignments, "assignments: [unterminated");

    let snapshot = RegistryClient::new("operator", paths).load(&[]);
    assert_eq!(snapshot.os_packages.len(), 1);
    assert_eq!(snapshot.os_packages[0].id, "base-os");
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.starts_with("OS assignments:"))
    );
}

#[test]
fn mcp_inventory_is_redacted_and_reports_only_identity_transport_and_status() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        &paths.hermes_config,
        r#"mcp_servers:
  remote:
    url: https://secret.example.invalid/mcp?token=TOP_SECRET
    headers:
      Authorization: Bearer TOP_SECRET
  local:
    command: [secret-mcp, --password, TOP_SECRET]
    env:
      API_KEY: TOP_SECRET
    enabled: false
  placeholder: {}
"#,
    );

    let snapshot = RegistryClient::new("operator", paths).load(&[]);
    assert_eq!(snapshot.mcp_servers.len(), 3);
    assert_eq!(snapshot.mcp_servers[0].name, "local");
    assert_eq!(snapshot.mcp_servers[0].transport, "stdio");
    assert_eq!(snapshot.mcp_servers[0].status, "disabled");
    assert_eq!(snapshot.mcp_servers[1].name, "placeholder");
    assert_eq!(snapshot.mcp_servers[1].transport, "unknown");
    assert_eq!(snapshot.mcp_servers[2].name, "remote");
    assert_eq!(snapshot.mcp_servers[2].transport, "http");

    let public_json = serde_json::to_string(&snapshot.mcp_servers).unwrap();
    assert!(!public_json.contains("TOP_SECRET"));
    assert!(!public_json.contains("secret.example"));
    assert!(!public_json.contains("secret-mcp"));
    assert!(!public_json.contains("Authorization"));
    assert!(!public_json.contains("API_KEY"));
}

#[test]
fn installed_skills_are_deduplicated_by_name_and_source_with_codex_namespaces() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(
        paths.hermes_skills.join("shared/SKILL.md"),
        "secret contents",
    );
    write(
        paths.hermes_skills.join("shared/DESCRIPTION.md"),
        "duplicate manifest",
    );
    write(paths.claude_skills.join("shared/SKILL.md"), "claude");
    write(paths.codex_skills.join("direct/DESCRIPTION.md"), "codex");
    write(
        paths.codex_skills.join("plugins/nested/SKILL.md"),
        "nested codex",
    );
    write(
        paths.codex_skills.join("plugins/deeper/ignored/SKILL.md"),
        "too deep",
    );

    let snapshot = RegistryClient::new("operator", paths).load(&[]);
    let identities: Vec<_> = snapshot
        .skills
        .iter()
        .map(|skill| {
            (
                skill.name.as_str(),
                skill.source.as_str(),
                skill.status.as_str(),
            )
        })
        .collect();
    assert_eq!(
        identities,
        vec![
            ("direct", "codex", "installed"),
            ("nested", "codex", "installed"),
            ("shared", "claude", "installed"),
            ("shared", "hermes", "installed"),
        ]
    );
}

#[test]
fn malformed_present_sources_are_isolated_as_warnings() {
    let temp = TempDir::new().unwrap();
    let paths = paths(&temp);
    write(&paths.runtime_db, "not a sqlite database");
    write(&paths.hermes_config, "mcp_servers: [unterminated");
    write(
        paths.hermes_skills.join("healthy/SKILL.md"),
        "still discovered",
    );

    let snapshot = RegistryClient::new("operator", paths).load(&["live-anyway".into()]);
    assert_eq!(snapshot.runtimes.len(), 1);
    assert_eq!(snapshot.runtimes[0].name, "live-anyway");
    assert_eq!(snapshot.skills.len(), 1);
    assert_eq!(snapshot.skills[0].name, "healthy");
    assert!(snapshot.mcp_servers.is_empty());
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.starts_with("runtime registry:"))
    );
    assert!(
        snapshot
            .warnings
            .iter()
            .any(|warning| warning.starts_with("MCP inventory:"))
    );
}

#[test]
fn injected_paths_are_used_instead_of_process_home() {
    let temp = TempDir::new().unwrap();
    let alternate = TempDir::new().unwrap();
    let mut injected = paths(&temp);
    injected.hermes_config = alternate.path().join("custom-hermes/config.yaml");
    injected.agent_catalog = alternate.path().join("custom-agents");
    write(
        &injected.hermes_config,
        "mcp_servers:\n  injected:\n    command: [server]\n",
    );
    write(
        injected.agent_catalog.join("custom/agent.yaml"),
        "id: custom-agent\nname: Custom\nversion: 1.0.0\ndescription: Injected\nscope: [operator]\nprompt: prompt.md\n",
    );
    write(injected.agent_catalog.join("custom/prompt.md"), "prompt");

    let snapshot = RegistryClient::new("operator", injected).load(&[]);
    assert_eq!(snapshot.mcp_servers[0].name, "injected");
    assert_eq!(snapshot.agents[0].id, "custom-agent");
}

#[test]
fn public_mcp_record_has_no_place_for_secret_configuration() {
    let fields = serde_json::to_value(data::CapabilityRecord {
        name: "example".into(),
        transport: "stdio".into(),
        status: "configured".into(),
    })
    .unwrap();
    let keys: Vec<_> = fields
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect();
    assert_eq!(keys, vec!["name", "status", "transport"]);
}

#[test]
fn path_builder_is_pure_and_predictable() {
    let home = PathBuf::from("/tmp/example-home");
    let paths = RegistryPaths::for_home(&home, "/catalog", "/registry");
    assert_eq!(paths.runtime_db, home.join(".agentik/runtime.db"));
    assert_eq!(paths.control_db, home.join(".agentik/control.db"));
    assert_eq!(paths.hermes_state_db, home.join(".hermes/state.db"));
    assert_eq!(
        paths.os_assignments,
        home.join(".agentik/os-assignments.yaml")
    );
    assert_eq!(paths.agent_catalog, PathBuf::from("/catalog"));
    assert_eq!(paths.os_registry, PathBuf::from("/registry"));
}

#[test]
fn discovery_builds_a_client_without_touching_the_filesystem() {
    let client = RegistryClient::discover("operator");
    assert_eq!(client.environment, "operator");
    assert_eq!(
        client
            .paths
            .runtime_db
            .file_name()
            .and_then(|name| name.to_str()),
        Some("runtime.db")
    );
    assert_eq!(
        client
            .paths
            .control_db
            .file_name()
            .and_then(|name| name.to_str()),
        Some("control.db")
    );
}
