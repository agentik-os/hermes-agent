## Audit outcome

Audited Hermes at commit `8794e5a21` on branch `agk/upgrade-architecture`, including root `AGENTS.md`, implementation modules, tests, and current repository docs.

### Primitive boundaries

| Primitive | What it actually is | Persistence / scope |
|---|---|---|
| **Memory** | Small factual state intended to influence future conversations | Built-in `MEMORY.md` / `USER.md`, or one external `MemoryProvider` |
| **Context** | The messages and instructions selected for the current model request | Session transcript, context engine, context files, and per-turn injections |
| **Files** | Arbitrary durable source material; not automatically recalled or interpreted | Wherever stored; workspace/path scoped, not inherently profile scoped |
| **Skills** | Procedural instructions and optionally packaged reference knowledge | Primarily `$HERMES_HOME/skills/`; loaded on demand |
| **Session history** | Exact historical conversations, searchable lexically | `$HERMES_HOME/state.db` |
| **Knowledge** | **No generic core `KnowledgeStore`, knowledge table, knowledge tool, or organization-memory abstraction exists** | Available only as conventions over skills/files or inside particular memory providers |

Hermes therefore has strong reusable infrastructure, but no core organization-knowledge primitive for AGK to “turn on.”

---

## Built-in memory and user/profile memory

### Implementation

- `tools/memory_tool.py`
  - `MemoryStore`
  - `memory_tool()`
  - `load_on_disk_store()`
  - `builtin_memory_stores_enabled()`
  - `apply_memory_pending()`
- Prompt integration:
  - `agent/agent_init.py` constructs and loads `MemoryStore`.
  - `agent/system_prompt.py` injects frozen snapshots.
  - `agent/background_review.py` periodically reviews conversations for saves.

### Persistence and semantics

- `$HERMES_HOME/memories/MEMORY.md`
  - Agent/environment/project facts.
  - Default cap: **2,200 characters**.
- `$HERMES_HOME/memories/USER.md`
  - User preferences, identity, communication style.
  - Default cap: **1,375 characters**.
- Entries are separated by `§`.
- `add`, `replace`, `remove`, and atomic batch operations are supported.
- Exact duplicates are rejected; replacement/removal uses unique substring matching.
- Files are locked and re-read before writes; unreadable or non-round-trippable files fail closed to prevent clobbering.
- Threat scanning occurs on write and again while building the system-prompt snapshot.
- Writes persist immediately, but the ordinary session continues using its frozen startup snapshot to preserve prompt caching.
- Memory does not auto-compact; over-cap writes fail and require explicit consolidation.
- `memory.write_approval` can stage writes under `$HERMES_HOME/pending/`.

### Scope limitation

Built-in memory is **profile-scoped, not user-scoped**:

- `USER.md` is one file per `$HERMES_HOME`.
- Gateway `user_id` does not partition built-in memory.
- Multiple humans using one gateway profile therefore share the same built-in `USER.md` and `MEMORY.md`.
- It is unsuitable as an organization or multi-tenant store.

Profiles are intentional islands. `hermes_constants.get_hermes_home()` resolves:

1. Context-local override,
2. `HERMES_HOME`,
3. Platform default.

Named profiles normally live at `~/.hermes/profiles/<name>/`. `hermes profile create --clone` copies config, skills, `SOUL.md`, `MEMORY.md`, and `USER.md` once; there is no live inheritance. Even `--clone-all` excludes `state.db` and session history.

---

## External memory providers and manager

### Core interfaces

- `agent/memory_provider.py`
  - `MemoryProvider` ABC
  - `RecallStatus`
  - `is_trivial_prompt()`
- `agent/memory_manager.py`
  - `MemoryManager`
  - `inject_memory_provider_tools()`
  - `memory_provider_tools_enabled()`
  - `build_memory_context_block()`
  - `StreamingContextScrubber`
- `plugins/memory/__init__.py`
  - `discover_memory_providers()`
  - `load_memory_provider()`
  - `_ProviderCollector`
  - `discover_plugin_cli_commands()`

`MemoryProvider` extension surface includes:

- Required: `name`, `is_available()`, `initialize()`, `get_tool_schemas()`
- Runtime: `system_prompt_block()`, `prefetch()`, `queue_prefetch()`, `sync_turn()`
- Boundaries: `on_session_end()`, `on_session_switch()`, `on_pre_compress()`
- Integration: `on_memory_write()`, `on_delegation()`
- Setup/backup: `get_config_schema()`, `save_config()`, `backup_paths()`
- Dispatch: `handle_tool_call()`, `shutdown()`

### Manager behavior and limitations

- Production uses `MemoryStore` separately; it does **not** register the built-in file store as a `MemoryProvider`.
- `MemoryManager` activates at most **one external provider** selected by `memory.provider`.
- It passes providers:
  - `session_id`
  - profile-local `hermes_home`
  - `platform`
  - gateway `user_id` and related chat identifiers
  - `agent_identity`
  - `agent_workspace`
- Static provider text enters the system prompt.
- Recall enters one request as a fenced `<memory-context>` block.
- Turn sync and next-turn prefetch run on a serialized daemon executor.
- External prefetch times out after eight seconds; a still-running prefetch causes later attempts to be skipped until it returns.
- Shutdown drains for five seconds, after which queued writes/prefetches may be abandoned.
- Provider failures are deliberately fail-open and non-transactional.
- Built-in writes are mirrored only after a committed, non-staged success; individual providers vary in whether they properly implement replace/remove.
- Subagents and background review forks normally skip external providers to avoid contaminating the parent namespace.

Discovery precedence is:

1. Bundled `plugins/memory/<name>/`
2. `$HERMES_HOME/plugins/<name>/`
3. Opt-in `./.hermes/plugins/<name>/`
4. `hermes_agent.memory_providers` package entry points

Bundled names win collisions. New providers are expected to ship as standalone plugins, not new in-tree directories.

### Shipped providers

| Provider / class | Storage and effective scope |
|---|---|
| `honcho.HonchoMemoryProvider` | `$HERMES_HOME/honcho.json`, then default-profile/global fallbacks; remote Honcho workspace. Supports shared user peer/workspace with a distinct AI peer per profile and configurable per-session/per-directory/per-repo/global sessions. |
| `openviking.OpenVikingMemoryProvider` | Connection config in profile config/`.env` or `~/.openviking/ovcli.conf`; server owns knowledge. Account/user/agent determine remote scope. Crash-recovery markers live under `$HERMES_HOME/openviking/{pending_sessions,runs}`. |
| `mem0.Mem0MemoryProvider` | `$HERMES_HOME/mem0.json`; cloud, self-hosted HTTP, or OSS vector store. Canonical configured `user_id` wins, otherwise gateway-native user ID, then `hermes-user`. Reads intentionally default to user-wide cross-agent recall. |
| `hindsight.HindsightMemoryProvider` | `$HERMES_HOME/hindsight/config.json`, fallback `~/.hindsight/config.json`; remote or embedded bank. Default bank is `hermes`, so profile isolation requires an explicit `bank_id_template`, such as one including `{profile}`. |
| `holographic.HolographicMemoryProvider` | `$HERMES_HOME/memory_store.db` by default. This is the clearest genuine structured knowledge primitive: `plugins/memory/holographic/store.py::MemoryStore` stores `facts`, `entities`, `fact_entities`, FTS5, trust scores, and HRR banks. It is provider-local and explicitly single-user, not a core Hermes abstraction. |
| `retaindb.RetainDBMemoryProvider` | Remote project plus crash-safe `$HERMES_HOME/retaindb_queue.db`. Named profiles derive separate remote projects unless an explicit project is configured; user and agent IDs form additional axes. |
| `byterover.ByteRoverMemoryProvider` | Local knowledge tree rooted at `$HERMES_HOME/byterover`, optional cloud sync. Profile-local by default. |
| `supermemory.SupermemoryMemoryProvider` | `$HERMES_HOME/supermemory.json`; remote container. Default container is simply `hermes`, so profiles using the same account share unless `container_tag` uses `{identity}` or another explicit namespace. |

Provider-level namespace configuration is therefore part of the security boundary; Hermes does not impose generic tenant isolation on providers.

---

## Skills

### Main implementation

- Discovery/ownership: `agent/skill_utils.py`
  - `get_scan_ordered_skills_dirs()`
  - `get_project_skills_dirs()`
  - `get_external_skills_dirs()`
  - `iter_project_skill_files()`
  - `is_external_skill_path()`
- Prompt index: `agent/prompt_builder.py::build_skills_system_prompt()`
- Explicit loading:
  - `tools/skills_tool.py::skills_list()`
  - `tools/skills_tool.py::skill_view()`
- Slash/preload injection:
  - `agent/skill_commands.py::scan_skill_commands()`
  - `build_skill_invocation_message()`
  - `build_stacked_skill_invocation_message()`
  - `build_preloaded_skills_prompt()`
- Mutations: `tools/skill_manager_tool.py::skill_manage()`
- Telemetry/lifecycle: `tools/skill_usage.py`
- Audit: `tools/skill_ledger.py`
- Bundles: `agent/skill_bundles.py`

### Discovery and scope

Precedence is:

1. Trusted project skills:
   - `<git-root>/.hermes/skills/`
   - `<git-root>/.agents/skills/`
2. Profile-local `$HERMES_HOME/skills/`
3. `skills.external_dirs`

Project skills require explicit root trust and are security-scanned by content hash. Dangerous content or scanner failure quarantines them. Project and external skills are treated as externally owned for autonomous maintenance.

Plugin-provided skills use qualified names such as `provider:maintenance`.

### Loading semantics

- System prompt receives only a compact name/description index.
- `skill_view()` loads the full `SKILL.md`; support files under `references/`, `templates/`, `scripts/`, and `assets/` load separately.
- No pagination exists for instructional skill content.
- Slash invocation embeds the skill as a **user message**, preserving the stable system-prompt prefix.
- Repeated unchanged `skill_view` calls are deduplicated per task until compression.
- Platform, environment, available-tool, and toolset conditions can hide skills from offer surfaces.
- Skill configuration is resolved from profile config and injected at load time.

### Persistence

Important profile-local files include:

- `$HERMES_HOME/skills/.../SKILL.md`
- `$HERMES_HOME/.skills_prompt_snapshot.json`
- `$HERMES_HOME/skills/.usage.json`
- `$HERMES_HOME/skills/.archive/`
- `$HERMES_HOME/skills/.hub/lock.json`
- `$HERMES_HOME/skills/.bundled_manifest`
- `$HERMES_HOME/skill-bundles/*.yaml`

Agent mutations can edit existing external skills in place if filesystem permissions permit; `external_dirs` is not a write-protection boundary for foreground requests. AGK should use filesystem permissions or governance if shared skills must be controlled.

---

## Curator

### Implementation and persistence

- `agent/curator.py`
  - `should_run_now()`
  - `apply_automatic_transitions()`
  - `run_curator_review()`
  - `maybe_run_curator()`
- `agent/curator_backup.py`
  - `snapshot_skills()`
  - `rollback()`
- `tools/skill_usage.py`
  - `curated_report()`
  - `adopt_skill()`
  - `archive_skill()`
  - `restore_skill()`
- `tools/skill_ledger.py`
  - `record_mutation()`
  - `rollback_entry()`

State locations:

- `skills/.curator_state`
- `skills/.usage.json`
- `skills/.archive/`
- `skills/.curator_backups/<timestamp>/skills.tar.gz`
- `skills/.curator_ledger.jsonl`
- `$HERMES_HOME/.curator_backups/blobs/`
- `logs/curator/<run>/run.json` and `REPORT.md`

### Current behavior

- Deterministic lifecycle: active → stale → archived.
- Default thresholds: 30 and 90 days.
- LLM consolidation is **off by default**.
- `curator.prune_builtins` is currently **true by default**; bundled skills may be archived after a freshly seeded inactivity window.
- Hub-installed, project, and external-directory skills remain excluded.
- `created_by: agent` is actually a curator-management policy flag, not proof of authorship.
- Foreground-created/user-owned skills require explicit `adopt`.
- Cron-referenced and pinned skills are exempt from automatic transitions.
- Autonomous curator deletes are routed to recoverable archive.
- Foreground `skill_manage(delete)` remains a hard delete, though ledger blobs can recover it.
- Explicit user `purge` can delete old archives; no automatic purge runs.
- Pinning blocks automated lifecycle and direct deletion. Foreground patch/edit is still allowed; autonomous background review treats pinned skills as fully off-limits.
- Backups and the ledger are best-effort telemetry. A failed pre-run snapshot does **not** abort curator mutation.

The curator manages skills only. It does not curate built-in memory, session history, organization files, external-provider facts, or an AGK knowledge corpus.

---

## Context engines and context files

### Context engine

- `agent/context_engine.py::ContextEngine`
- `agent/context_compressor.py::ContextCompressor`
- Selection: `agent/agent_init.py`
- Repo-directory loader: `plugins/context_engine/__init__.py`
- General plugin registration: `PluginContext.register_context_engine()`

Only one engine is active, explicitly selected by `context.engine`.

`ContextEngine` extension points include:

- Compression: `should_compress()`, `compress()`
- Request-only routing: `select_context()`
- Observation: `on_turn_complete()`
- Lifecycle: `on_session_start/end/reset()`
- Tools: `get_tool_schemas()`, `handle_tool_call()`
- Model changes/status: `update_model()`, `get_status()`

Important constraints:

- `select_context()` may replace one outbound request but never persisted history.
- Invalid returns and exceptions fail open.
- Real selection changes prompt-cache prefixes; stable selections are required for acceptable cache reuse.
- `on_turn_complete()` is best-effort and misses some abnormal early exits.
- General-plugin engines are deep-copied per agent; engines holding locks/DB handles need a safe `__deepcopy__` or Hermes falls back to the compressor.
- The repo context-engine directory currently contains no shipped alternative engine. User engines normally arrive through the general plugin system.
- A context engine owns compression policy; it is the wrong extension for simple post-turn indexing, which belongs in a memory provider.

The default compressor is lossy: it prunes old tool results, protects a head and recent tail, summarizes the middle, and iteratively updates prior summaries. With default in-place compaction, original rows remain in `state.db` as `active=0, compacted=1`, searchable but absent from active context. Failure cooldowns and anti-thrash counters are stored per session. This is context retention, not long-term memory or canonical knowledge.

### Context files

Implementation:

- `agent/prompt_builder.py`
  - `load_soul_md()`
  - `build_context_files_prompt()`
  - `_load_hermes_md()`
  - `_load_agents_md()`
- `agent/subdirectory_hints.py::SubdirectoryHintTracker`

Startup priority, first project type wins:

1. Nearest `.hermes.md` / `HERMES.md`, walking only to git root
2. `AGENTS.override.md` / `AGENTS.md` chain from git root to cwd
3. `CLAUDE.md` in cwd
4. Cursor rules in cwd

`$HERMES_HOME/SOUL.md` is independent profile identity.

Limits:

- Explicit `context_file_max_chars`, otherwise model-scaled from 20,000 to 500,000 characters.
- Head/tail truncation.
- Threat match blocks the whole file with a placeholder.
- Progressive subdirectory hints:
  - AGENTS/CLAUDE/Cursor files only
  - inside the initial working tree
  - up to five ancestors
  - once per directory/content digest
  - 8,000 characters each
  - appended to tool results, not the system prompt

Context files are durable instructions, not a fact store. Large or changing organization knowledge should not be placed in them.

---

## Session storage and search

### Implementation

- `hermes_state.py::SessionDB`
- `hermes_state_search.py::SessionSearchMixin`
  - `search_messages()`
  - `get_anchored_view()`
  - `fts_rebuild_status()`
- `tools/session_search_tool.py`
  - `session_search()`
  - `_discover()`
  - `_scroll()`
  - `_read_session()`
  - `_resolve_profile_db()`
  - `_locate_session_db()`

Current schema is **version 26**, not the v23 shown in an older docs page.

Persistence is `$HERMES_HOME/state.db` with WAL, including:

- `sessions`
- `messages`
- `system_prompts`
- `session_model_usage`
- FTS5, trigram, and optional CJK indexes
- compression/session locks and routing metadata

### Search behavior and limits

- Four shapes: discover, scroll, read, browse.
- No LLM or embedding search; it is lexical FTS5/BM25 with trigram/CJK/LIKE fallbacks.
- Discovery scans up to 300 raw rows, deduplicates by lineage, and returns at most ten sessions.
- Default result shaping fully hydrates the first result and compacts lower results.
- Discovery message/bookend content is character-bounded, despite older docs claiming no truncation.
- Scroll window is capped at 20 each side.
- Read returns the whole small session or first 20 plus last 10 for a large one.
- `kanban`, `subagent`, and `tool` sources are hidden; cron is searchable but demoted.
- Active current-lineage material is suppressed, except compacted/ended history that has left active context.
- FTS rebuilds can temporarily produce incomplete older results, with a rebuild-status annotation.
- Session pruning can permanently remove history; “unlimited” means unbounded by a prompt cap, not immutable storage.

### Isolation caveat

`state.db` is physically per profile, but `session_search` is not a strict isolation primitive:

- `profile=` explicitly opens another profile’s DB read-only.
- A read by bare session ID can scan all profiles to locate the owner.
- Search has no current-gateway-user filter even though sessions store `user_id`.
- Discovery defaults to the active profile, but within that profile it can search other users’ sessions.

AGK should not expose this as multi-tenant organization memory without an additional authorization layer.

---

## Knowledge-adjacent behavior

- `agent/background_review.py` periodically forks an LLM review:
  - memory trigger roughly every configured ten user turns
  - skill trigger after configured tool-iteration activity
  - writes built-in memory and curator-managed skills only
  - no external provider ingestion by the fork
- `agent/learn_prompt.py::build_learn_prompt()` turns sources into skills.
  - “Knowledge-base skills” are a packaging convention: lean `SKILL.md` plus `references/`.
  - There is no ingestion/indexing engine behind this.
- `agent/learning_graph.py::build_learning_graph()` visualizes skill metadata and memory chunks.
  - Skill edges are declared `related_skills`.
  - Memory-to-skill edges are lexical overlap.
  - It is a derived visualization, not a persisted knowledge graph.
- `agent/context_references.py`
  - Built-ins: `@file`, `@folder`, `@diff`, `@staged`, `@git`, `@url`
  - `ContextReferenceProvider` lets plugins add deterministic prefixes such as `@agk:<record>`.
  - Attachments are request context, not memory.

---

## Recommended AGK reuse strategy

1. **Make AGK’s shared workspace the canonical organization truth.**
   - Versioned records for decisions, claims, sources, policies, entities, and change history.
   - Use files or an AGK-owned database with stable IDs and provenance.
   - Treat every semantic index as rebuildable derivative state.

2. **Keep Hermes profiles as identity/security/session boundaries.**
   - Separate config, secrets, sessions, local memory, and persona.
   - Point profiles at the shared AGK workspace; do not add live profile inheritance.

3. **Use Hermes skills for procedural organizational knowledge.**
   - Repo-bound procedures: trusted project `.hermes/skills/`.
   - Organization-wide procedures: shared `skills.external_dirs`, Hermes org-skill sync, or a standalone skill package.
   - Enforce filesystem/governance controls; do not depend on curator for organization review.

4. **Use a standalone AGK `MemoryProvider` only for automatic semantic recall.**
   - Implement the existing ABC and package entry point rather than a second manager/lifecycle.
   - Explicitly namespace organization, tenant, human, profile/agent, workspace, and session.
   - Prefer read/index operations over automatically ingesting every chat turn.
   - Because Hermes allows only one external provider, the AGK provider should aggregate any sub-backends internally.

5. **Add an AGK `ContextReferenceProvider`.**
   - `@agk:<record-id>` gives deterministic, explicit retrieval of current canonical records.
   - This is better for cited decisions and source-of-truth reads than broad automatic prefetch.

6. **Avoid an AGK context engine unless AGK truly needs request replacement.**
   - It owns compression policy, is single-select, and can destroy prompt-cache reuse.
   - Post-turn indexing belongs in `MemoryProvider.sync_turn()`, not `ContextEngine`.

7. **Reserve built-in memory for compact profile-local preferences.**
   - Never use `USER.md` or `MEMORY.md` as shared organization state.
   - Consider disabling built-in memory on unattended workers.

8. **Use `session_search` only as historical evidence.**
   - It answers “what was said,” not “what is currently true.”
   - Promote accepted conclusions into canonical AGK records rather than repeatedly mining transcripts.

### Bottom line

AGK should reuse Hermes as the **execution, profile, skill-loading, memory-provider, context-reference, and session-history host**. AGK should own only the missing layer: a canonical, provenance-aware organization record model plus retrieval/indexing behind Hermes’ existing plugin seams.

## Repository state

- No files were created or modified.
- Existing untracked path observed: `agk-upgrade/`.
- Tests were inspected but not executed, to honor the no-file-modification requirement.
- Documentation inconsistencies found:
  - Root `AGENTS.md` and the loaded Hermes skill still describe older curator and context-file behavior.
  - Current source enables bundled-skill pruning by default, implements AGENTS directory chains/dynamic limits, and uses session schema v26.
  - Older memory docs overstate “always alongside” behavior; external memory can remain active while both built-in stores are disabled.