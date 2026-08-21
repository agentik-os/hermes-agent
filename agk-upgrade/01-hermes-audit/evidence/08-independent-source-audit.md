## Audit outcome

- Hermes has a mature, defensive **runtime-local session store**, but persistence is fragmented across `state.db`, several independent SQLite databases, JSON/JSONL files, caches, Git checkpoints, logs, and optional external memory systems.
- `SessionDB` is reusable behind an AGK runtime adapter. It is **not suitable as the AGK control-plane store**: it has no Organization tenancy, canonical AGK object identity, `rev`-based concurrency, typed relationship model, semantic event envelope, or policy/classification boundary.
- Hermes has useful partial precedents for Artifacts, Knowledge, Evaluation, and Events, but none is a first-class AGK implementation.
- No files were created or modified by this audit.

## 1. Persistence inventory and exact schema ownership

### Canonical session database

**Path:** `$HERMES_HOME/state.db`, profile-local.  
**Modules:** `hermes_state.py`, `hermes_state_common.py`, `hermes_state_schema.py`, `hermes_state_search.py`, `hermes_state_portability.py`.

`hermes_state_common.py::SCHEMA_SQL` defines these exact core relations:

1. `schema_version`
2. `system_prompts`
3. `sessions`
4. `messages`
5. `session_model_usage`
6. `state_meta`
7. `gateway_routing`
8. `gateway_hygiene_state`
9. `compression_locks`
10. `session_turn_leases`
11. `async_delegations`

Derived search structures:

- `messages_fts`
- `messages_fts_trigram`
- `messages_fts_trigram_src` view
- optional `messages_fts_cjk`
- associated insert, delete, and narrowed update triggers

Additional `state.db` relations created outside `SCHEMA_SQL`:

- `delivery_obligations`, from `gateway/delivery_ledger.py`
- `telegram_dm_topic_mode`
- `telegram_dm_topic_bindings`, from migration helpers in `hermes_state.py`

Current main schema version is **26**, at `hermes_state_common.py:219`. FTS storage has independent `FTS_STORAGE_VERSION = 1`, at `hermes_state_common.py:230`.

Important exact row contracts:

- `messages`: session identity, role/content, tool name/calls/call id, several reasoning sidecars, timestamp, token counts, `active`, `compacted`, platform message id, observation/reaction state, exact API-content sidecar, and presentation kind/metadata.
- `session_model_usage`:  
  `session_id, model, billing_provider, billing_base_url, billing_mode, task, api_call_count, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, estimated_cost_usd, actual_cost_usd, cost_status, cost_source, first_seen, last_seen`, with the six-field primary key ending in `task`.
- `delivery_obligations`:  
  `obligation_id, session_key, platform, chat_id, thread_id, content, state, attempts, created_at, updated_at, owner_pid, owner_started_at, last_error` (`gateway/delivery_ledger.py:97-111`).

`SessionSchemaMixin._init_schema()` is the schema owner (`hermes_state_schema.py:813-1291`). It:

- runs `SCHEMA_SQL`;
- compares live columns with declarative DDL and adds missing columns;
- repairs the `gateway_routing` and `session_model_usage` primary-key shapes;
- runs data migrations and backfills;
- repairs or rebuilds FTS;
- advances `schema_version`.

Notable data migrations include v16 delegate tagging, v18 gateway metadata import, v20 model-usage backfill, v22 task-scoped usage, v23 independently versioned FTS storage, and v25 system-prompt deduplication. The migration is idempotent and self-healing, but it is not a checksummed migration journal and the entire reconciliation is not one global atomic migration transaction.

### Other SQLite databases

| Store | Exact relations | Owner |
|---|---|---|
| Projects, `$HERMES_HOME/projects.db` | `projects`, `project_folders`, `project_meta`, `discovered_repos` | `hermes_cli/projects_db.py` |
| Kanban, root/default or per-board `kanban.db` | `tasks`, `task_links`, `task_comments`, `task_events`, `task_runs`, `task_attachments`, `kanban_notify_subs` | `hermes_cli/kanban_db.py` |
| Cron executions | `executions(id, job_id, source, process_id, pid, process_started_at, status, claimed_at, started_at, finished_at, error)` | `cron/executions.py:36-66` |
| Cron notepad | `cron_notepad(job_id, key, value, updated_at)`, PK `(job_id,key)` | `cron/notepad.py:46-60` |
| Verification evidence | `meta`, `verification_events`, `verification_state` | `agent/verification_evidence.py:105-154` |
| API response history | `responses`, `conversations` | `gateway/platforms/api_server.py::DurableResponseStore` |
| Shared metrics | `telemetry_state`, `package_outbox`, `counter_aggregates` | `hermes_cli/observability/shared_metrics.py:300-408` |
| Holographic memory | `facts`, `entities`, `fact_entities`, `facts_fts`, `memory_banks`, plus FTS triggers | `plugins/memory/holographic/store.py:17-77` |
| RetainDB write queue | `pending(id, user_id, session_id, messages_json, created_at, last_error)` | `plugins/memory/retaindb/__init__.py:413-420` |
| Discord recovery | `discord_messages`, `discord_recovery_scans`, `discord_recovery_cursors` | `plugins/platforms/discord/recovery.py:55-112` |
| Plugin-local databases | Caller-defined schema in `$HERMES_HOME/plugin-data/<name>/data.db` | `plugins/plugin_storage.py::plugin_db` |

`verification_events` is the closest standalone evidence ledger:

```text
id, created_at, session_id, cwd, root, command,
canonical_command, kind, scope, status, exit_code, output_summary
```

It retains at most 100 events per session/root, 30 days, and 10,000 unreferenced events globally. It is passive evidence, not an Eval registry.

## 2. Session lifecycle, lineage, and search

### Exact persistence APIs

Primary methods on `hermes_state.SessionDB` include:

- Sessions: `create_session`, `ensure_session`, `get_session`, `end_session`, `reopen_session`, `delete_session`, `delete_sessions`.
- Messages: `append_message`, `append_messages_batch`, `replace_messages`, `archive_and_compact`, `rewind_to_message`, `restore_rewound`.
- Compression: `try_acquire_compression_lock`, `refresh_compression_lock`, `release_compression_lock`, `publish_compression_child`, `get_compression_tip`, `get_compression_lineage`.
- Turn serialization: `try_acquire_session_turn_lease`, `acquire_session_turn_lease`, `refresh_session_turn_lease`, `release_session_turn_lease`.
- Lineage: `get_conversation_root`, `_session_lineage_root_to_tip`, `_is_explicit_branch_session`, `_is_explicit_fork_child_row`, `_is_compression_child_row`.
- Search: `search_messages`, `search_sessions`, `search_sessions_by_id`, `get_anchored_view`, `get_messages_around`.
- Portability: `export_session`, `export_session_lineage`, `export_all`, `import_sessions`.

### Lineage semantics

One `parent_session_id` represents several semantically different relationships:

- Compression continuation: parent has `end_reason='compression'`.
- User branch: child `model_config` contains `_branched_from=<parent>`.
- Reset/new continuation: child `model_config` contains `_reset_from=<parent>`.
- Delegation: child configuration contains `_delegate_from=<parent>`.
- Tool/subagent children can also be inferred from `source` and row shape.

Consequences:

- `get_conversation_root()` follows **every parent link**, up to 100 hops, and therefore groups compression segments, branches, resets, and delegation under one root (`hermes_state.py:10878-10912`).
- `get_compression_lineage()` is narrower. It rejects explicit fork/tool/delegate children and follows only parents whose predecessor ended for compression (`hermes_state.py:11251-11331`).
- `publish_compression_child()` is strong: parent closure, child session, handoff messages, and concurrent-tail cloning commit in one transaction (`hermes_state.py:5638-5796`).
- Relationship type is nevertheless encoded partly in mutable JSON and inferred state, not in a normalized lineage-edge table.

AGK must not adopt `get_conversation_root()` as its canonical Session, Run, or AgentCall identity. The adapter needs explicit normalized relationship kinds.

### Search behavior

`tools/session_search_tool.py` exposes four exact modes:

1. `query`: discovery through FTS.
2. `session_id + around_message_id`: anchored scroll.
3. `session_id`: bounded whole-session read.
4. no arguments: recent-session browse.

Discovery behavior:

- scans up to 300 raw FTS rows;
- excludes `kanban`, `subagent`, and `tool` session sources;
- demotes, but does not exclude, `cron`;
- deduplicates by lineage;
- fully hydrates the top result by default, with lower results compact;
- supports `detail="full"`;
- performs no LLM calls.

Database-level search in `SessionSearchMixin.search_messages()` supports:

- FTS5 phrase, boolean, prefix syntax;
- source inclusion/exclusion;
- role filters;
- `limit` and `offset`;
- relevance, newest, or oldest ordering;
- unicode61 FTS, CJK-bigram, trigram, and LIKE fallback routes;
- resumable FTS backfill with canonical-table gap supplementation;
- one-shot corruption rebuild and fail-open LIKE search.

Visibility is precise:

- live `active=1` messages are searched;
- compaction history `active=0, compacted=1` remains searchable;
- rewind history `active=0, compacted=0` is hidden unless `include_inactive=True`.

Cross-profile linked-session reads open another profile’s database with `mode=ro`; a bare session id can trigger a scan across all profile databases. This is useful local UX, but it is not an Organization authorization boundary.

## 3. Durability and concurrency semantics

### `SessionDB`

`SessionDB` has the strongest durability implementation in the repository:

- Writer connection: `check_same_thread=False`, `isolation_level=None`, one-second SQLite timeout.
- WAL by default, with guarded fallback to DELETE journal mode on incompatible filesystems.
- `foreign_keys=ON`.
- macOS sets `synchronous=FULL` and `checkpoint_fullfsync=1`; other WAL platforms generally retain SQLite’s WAL synchronous default unless configured.
- Up to eight pooled read-only WAL connections. DELETE-journal mode falls back to the locked writer connection.
- All normal writes use `_execute_write()` with `BEGIN IMMEDIATE`, commit/rollback, and random jitter:
  - routine patience: 20 seconds;
  - transcript-critical patience: 60 seconds;
  - activity observations: 0.5 seconds;
  - compression-lease collision budget: 5 seconds.
- PASSIVE WAL checkpoint every 50 successful writes.
- Bounded FTS merges every 1,000 writes.
- One-shot reconnect for replaced/corrupted connections, FTS rebuild, then FTS fail-open to preserve canonical writes.

Atomic units are method-level transactions, not whole agent turns. A message batch and its session counters are atomic, but transcript, routing metadata, usage accounting, external delivery, and tool side effects are not one distributed transaction. Crashes can therefore leave an honest partial turn or an unknown external side effect.

Token accounting is queued to a background writer and drained at shutdown. A hard crash can lose the unflushed usage delta even when transcript rows survived.

### Gateway transcript and routing

`gateway.session.SessionStore` adds:

- in-process routing and save locks;
- monotonically ordered in-process routing generations;
- single-row `gateway_routing` upserts for normal turns;
- atomic full replacement for structural transitions;
- optional atomic, fsynced `sessions.json` legacy mirror;
- per-session in-memory transcript retry queues;
- a 200-message cap, with evicted messages spooled atomically to `$HERMES_HOME/pending_messages/`.

Important inconsistency: the class docstring and startup warning still say there is a JSONL transcript fallback, but `append_to_transcript()` returns immediately when no DB exists and `load_transcript()` returns `[]`; there is no `.jsonl` implementation in `gateway/session.py`. `state.db` is now canonical, with only recovery spool files and the routing JSON mirror.

Routing generation safety is process-local. Multiple independent gateway processes are not protected by those Python locks and counters.

### Other stores

- Cron execution history uses WAL, `busy_timeout=5000`, `synchronous=FULL`, an `RLock`, transactional state transitions, immutable terminal states, exact process owner stamps, and a 1,000-terminal-row retention cap.
- `cron/jobs.json` uses cross-process locking, stale-writer merge protection, temp-file write, file `fsync`, and atomic replace. It is one of the strongest filesystem stores.
- Built-in `MEMORY.md` and `USER.md` use separate lock files, read-modify-write locking, drift detection, backups, and atomic replacement.
- Holographic memory shares one connection and one lock per resolved database path, but uses autocommit. `add_fact()` spans several transactions, so fact insertion, entity linkage, vector calculation, and bank rebuild are not failure-atomic.
- RetainDB persists writes before enqueueing, but failed sends remain on disk without being re-enqueued during the same process. Startup replays only the first 200 rows, so larger backlogs require repeated restarts or repair.
- `cron/notepad.py` resolves `NOTEPAD_FILE` at import time, unlike `cron/executions.py`, which resolves the active profile at transaction time. This is a profile-switching risk in a multiplexed process.
- Discord recovery opens with a 0.1-second timeout, catches all failures, and returns defaults. Recovery bookkeeping may be dropped under contention by design.
- `plugin_db()` hardcodes WAL and leaves transaction discipline to the plugin caller. It does not honor every global database policy despite the `config_defaults.py` comment that the database journal setting governs every opener.

## 4. Logging, telemetry, metrics, trajectories, and evals

### Logging

`hermes_logging.py` owns:

- `setup_logging`
- `set_session_context` / `clear_session_context`
- a record-factory context bridge
- `_ManagedRotatingFileHandler`
- queued handlers and bounded flush/drain support

Logs live under `$HERMES_HOME/logs`, including component logs and error logs. Gateway tool-progress logging uses `tool_calls.log`, rotating at 5 MiB with three backups (`gateway/run.py:28389-28442`).

`agent.redact.RedactingFormatter` is used on managed disk handlers and the tool-call log, but plaintext logs remain diagnostic strings, not structured or transactional events. Queued records can be lost on a hard crash.

### Monitoring and OTLP

`agent.monitoring.events` defines:

- `GatewayHealthEvent`
- `GatewayDiagnosticEvent`
- `CronExecutionEvent`

`MonitoringEmitter` is explicitly ephemeral (`agent/monitoring/emitter.py`):

- non-blocking queue of 10,000;
- oldest event dropped when full;
- daemon dispatcher;
- subscriber failures swallowed;
- nothing persisted;
- no subscriber means no collection.

Gateway OTLP export is off by default. Its contract is deliberately content-free and excludes prompts, messages, tool arguments/results, histories, trajectories, and audit logs (`hermes_cli/config_defaults.py:2840-2876`). This is appropriate operational telemetry, not an Event Store.

### Shared metrics

`SharedMetricsStore` is the durable product-metrics slice:

- opt-in;
- `$HERMES_HOME/telemetry/shared_metrics/metrics.sqlite3`;
- private database and outbox permissions;
- schema `hermes.shared_metrics.v2`;
- daily allowlisted low-cardinality counters;
- transactional delta packaging;
- atomic JSON outbox export;
- 30-day local retention.

Metrics cover client activity, model route, task start/finish, tool calls/approvals, and skill lifecycle/load. They intentionally discard raw identities and payloads, so they cannot support AGK audit, causal reconstruction, or evaluation reproducibility.

### Trajectories

There is no `TrajectoryRecorder` class. The actual APIs are:

- `agent.trajectory.save_trajectory`
- `agent.agent_runtime_helpers.convert_to_trajectory_format`
- `agent.trace_upload.build_trace_jsonl`
- `agent.trace_upload.upload_session_trace`
- `trajectory_compressor.TrajectoryCompressor`

Local trajectory saving:

- appends to `trajectory_samples.jsonl` or `failed_trajectories.jsonl` in the current working directory;
- includes reasoning, tool arguments, and tool outputs;
- does not redact;
- has no lock, `fsync`, schema version, stable run id, provenance graph, or retention policy.

Trace upload has explicit redaction and fails closed on redaction failure, but has no durable upload outbox or retry ledger.

`agent/moa_trace.py::save_moa_turn` optionally appends full model inputs and outputs to `$HERMES_HOME/moa-traces/<session>.jsonl`. It is best-effort and unredacted, with no append lock or `fsync`.

### Evaluations and verification

Evaluation is a set of independent harnesses, not a platform:

- Browser-use: resume-safe `results/results.jsonl`.
- Read-tool: `results/<label>/<model_slug>/rep<N>.json`.
- Compaction: question cache, per-policy JSON, and `scorecard.json`.
- Verification runner: `agent.verify.runner.run_verify`, producing in-memory `VerifyResult`.
- Goal judge: `hermes_cli.goals.judge_goal`, with latest state embedded in `state_meta`.
- Verification evidence: durable, bounded command-result ledger.

Missing are Eval Definition identity/versioning, target object/version, dataset and judge pins, baseline relation, environment snapshot, repeated-run statistics, promotion gates, and a unified result query API.

## 5. Artifact, file, memory, and knowledge gaps

### Artifact-like mechanisms

- Desktop artifacts are heuristic, memory-only projections over transcript fences. Identity is `(session, slug)`, versions are capped at 20, and dedupe uses non-cryptographic FNV-1a (`apps/desktop/src/store/artifacts.ts`, `artifact-detect.ts`).
- Tool spillovers write full outputs to `$HERMES_HOME/cache/spillover/<tool_call_id>.txt`, with 24-hour deletion.
- Media and screenshots use random cache filenames and 24-hour cleanup.
- Kanban has durable attachment metadata and board-local attachment directories.
- Checkpoints use a shared content-addressed Git object store, per-project refs, and CAS `update-ref`, but they are project-path based and not tied to AGK Session, Run, Task, Artifact, or Evidence identity.
- Quick snapshots intentionally skip Kanban attachments and workspaces. Full backups exclude checkpoints.
- None of these mechanisms supplies canonical artifact identity, immutable version hash, producer/inputs/dependencies, Organization scope, classification, permission edges, lifecycle, or durable retention.

### Memory and knowledge

- Built-in memory is curated free-form entries in `MEMORY.md` and `USER.md`.
- `MemoryProvider` and `MemoryManager` are strong runtime adapter seams.
- Holographic memory adds mutable facts, entities, trust scores, FTS, and vectors.
- RetainDB adds an external memory and file service plus a local write-behind queue.
- `learning_graph.build_learning_graph()` derives a graph from skill metadata, usage data, and memory cards. It is not a canonical persistent graph.
- No implementation models claim provenance, source versions, evidence, validity interval, contradiction/supersession, maturity, approval, or Organization/project knowledge scope.

Therefore Hermes Memory should be adapted, while AGK Knowledge remains new.

## 6. Required AGK decisions

These are architecture conclusions from the source audit. Unless already present in the AGK canon, they should remain **PROPOSED** until ratified.

1. **Keep Hermes persistence below `AgentRuntime`.**  
   Preserve D-002 and D-003. Do not add AGK domain tables to `state.db`. Store `runtime_binding(agk_id, runtime_id, profile, hermes_session_id, relation_kind, sync_rev, status)` in the AGK control plane.

2. **Use current-state storage plus a durable semantic event ledger, not event sourcing.**  
   This matches `AGK_ARCHITECTURE.md:39-51`. A semantic command must transactionally perform:
   - compare-and-set object write;
   - immutable event append;
   - outbox append.  
   Spans remain in telemetry, and logs remain diagnostic.

3. **Require `rev` compare-and-set for every mutable AGK object.**  
   Hermes mostly uses last-writer-wins snapshots with specialized guarded transitions. AGK’s universal `rev` contract must be implemented by the control-plane store, not simulated through Python locks or timestamps.

4. **Split Artifact metadata from bytes.**  
   Recommended relations: `artifacts`, `artifact_versions`, `artifact_blobs`, `artifact_edges`. Metadata and provenance are relational; immutable bytes are hash-addressed object storage; source code remains Git truth. Paths and transcript fences are ingestion sources, not artifact identity.

5. **Make Knowledge revisioned and provenance-first.**  
   Recommended relations: `knowledge_items`, `knowledge_revisions`, `claims`, `source_refs`, `evidence_refs`, `knowledge_edges`. Context Manifests reference immutable Knowledge revision ids. Memory-provider results are runtime inputs and never silently become approved Knowledge.

6. **Separate Eval, Evidence, and Verification.**  
   Recommended relations: `eval_definitions`, `eval_versions`, `eval_runs`, `measurements`, `evidence`, `verifications`. Every Eval run pins target version, dataset, judge, harness, runtime, model route, policy, budget, and output artifacts. Hermes `verification_events` maps to Evidence, not directly to Eval or acceptance.

7. **Adopt one canonical event envelope.**  
   Minimum fields: `event_id`, `event_type`, `schema_version`, `occurred_at`, `recorded_at`, `organization_id`, `project_id`, typed object/actor refs, `session_id`, `run_id`, `correlation_id`, `causation_id`, command/idempotency key, classification, source adapter/version, payload, and provenance. Add schema registry, upcasters, consumer cursors, and retention policy.

8. **Keep canonical production control-plane storage independent of SQLite runtime limits.**  
   SQLite remains appropriate for one profile’s runtime-local state and offline caches. A multi-Organization control plane needs a transactional relational database with tenant predicates, online migration support, advisory locking, and concurrent writers. PostgreSQL is the natural default candidate; local SQLite support should be a conformance-tested edge mode, not a second semantic truth.

9. **Centralize AGK migrations.**  
   Use ordered, checksummed, forward migrations with one migration lease, preflight, backup, additive rollout, resumable backfill, validation, and explicit cutover. Do not inherit Hermes’s mix of declarative reconciliation, untyped KV migrations, plugin-owned DDL, and import-time filesystem migration as the AGK control-plane model.

10. **Do not permit scheduler dual truth.**  
    Preserve proposed D-005. Hermes cron may execute an AGK Automation binding, but AGK owns identity, schedule intent, policy, lease, events, and reconciliation. A Hermes job without an AGK Automation is an operational exception, not canonical state.

## 7. Corrections needed in the current AGK mapping

The untracked `agk-upgrade/agk-hermes-map.yaml` contains stale paths:

- `agent/goal_judge.py` does not exist. Actual implementation is `hermes_cli/goals.py::judge_goal`.
- `hermes_cli/verify.py` does not exist. Actual implementation is `agent/verify/runner.py`, with CLI parser in `hermes_cli/subcommands/verify.py`.
- `hermes_cli/kanban_dispatcher.py` does not exist.
- Artifact coverage omits `tools/tool_result_storage.py`, Kanban attachments, media caches, and `tools/checkpoint_manager.py`.
- Durable-event coverage omits `task_events`, `verification_events`, cron executions, delivery obligations, and Discord recovery.
- Memory coverage should acknowledge the optional Holographic and RetainDB stores while retaining the conclusion that first-class AGK Knowledge is absent.

## Files and issues

- **Files modified or created by this audit:** none.
- **Repository state:** branch `agk/upgrade-architecture`; `agk-upgrade/` appeared as an untracked directory during the audit, apparently from concurrent work, not from this subagent.
- **Tests:** none run, because this was a read-only source audit.
- **Issue encountered:** a final convenience command intended to materialize the declarative schema in an in-memory SQLite database was approval-blocked. It was not retried. The findings above are based on direct source reads and AST inventories.

[steer did not land — the subagent finished before it could be delivered: Stop further exploration now and return a grounded persistence/observability/artifact/eval audit with exact refs and material gaps.]