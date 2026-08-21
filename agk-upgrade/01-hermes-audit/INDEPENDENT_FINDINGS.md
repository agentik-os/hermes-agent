# Independent Hermes Audit Findings

These findings come from ten independent source audits of the pinned Hermes baseline. They are blockers or constraints on future AGK integration, not claims that AGK product code exists.

## BLOCKER. Profiles are not a tenant boundary

**Evidence:** `SECURITY.md:58-119`, `agent/secret_scope.py`, `tests/test_profile_isolation_runtime.py`.

Profiles share the process, user authority, plugins and often dashboard. A raw thread can lose profile context. AGK requires one tenant per OS user or whole-process sandbox and cannot use multiplex profiles as hostile multi-tenancy.

**Decision:** whole-process isolation and canonical AGK authorization remain mandatory.

## BLOCKER. `execute_code` can regain an explicitly empty nested Tool set

**Evidence:** `tools/code_execution_tool.py:1079-1083` and `1336-1341`.

Both remote and local paths fall back to all seven RPC Tools when the intersection with Session-enabled Tools is empty. A Session allowed `execute_code` but none of its nested Tools can regain them.

**Decision:** governed AGK mode must distinguish absent configuration from an explicit empty set and fail closed before enabling `execute_code`.

## BLOCKER. Background process controls need principal binding

**Evidence:** `tools/process_registry.py:3002-3126`.

Listing is scoped, but control actions use the process Session id without re-checking owner Task or Session. A known foreign id in one Hermes process can be polled, logged, killed or written.

**Decision:** AGK process capabilities bind to an unforgeable Session principal and authorization decision.

## BLOCKER. Outbound A2A has SSRF and bearer-forwarding risk

**Evidence:** `plugins/platforms/a2a/tools.py:53-68`, `114-130`, `149-186`.

A peer card can select an arbitrary HTTP target and the configured peer bearer can follow it. Independent audit reproduced the URL and Authorization path without sending an external request.

**Decision:** disable A2A Tools in governed mode until same-origin or explicit allowlist, URL safety and egress-broker enforcement exist.

## BLOCKER. Stock updater follows `origin`

**Evidence:** `hermes_cli/update_cmd.py`; local remotes have `origin=NousResearch`, `fork=agentik-os`.

Stock `hermes update` can move an AGK installation toward upstream and overwrite the reviewed downstream patch set.

**Decision:** governed AGK guest bundles disable stock update and are replaced only through an attested signed Runtime deployment.

## HIGH. MCP subprocess secret scope is too broad for AGK

**Evidence:** `tools/mcp_tool.py::_build_safe_env`.

External-secret-source-tagged variables can be passed to every configured stdio MCP subprocess instead of a per-server grant.

**Decision:** compile per-server secret grants and refuse ambient secret passthrough.

## HIGH. Remote file sync can persist sandbox changes onto the host

**Evidence:** `tools/environments/file_sync.py::FileSyncManager._sync_transaction`, tests in `tests/tools/test_file_sync.py` and `tests/tools/test_file_sync_back.py`.

Skills and support files use bidirectional reconciliation with remote-wins conflict behavior. A compromised remote sandbox can persist prompt-bearing changes locally.

**Decision:** governed hosted sandboxes default to upload-only. Sync-back requires a reviewed Artifact or change proposal.

## HIGH. Lifecycle names are semantically misleading

**Evidence:** `agent/turn_finalizer.py`, `hermes_cli/lifecycle.py`, `gateway/run.py`.

`on_session_end` fires at the end of each `run_conversation` call and behaves as a turn boundary. `on_session_finalize` is the true conversation closure.

**Decision:** the adapter maps both explicitly and never treats `on_session_end` as canonical Session termination.

## HIGH. Existing event planes are best-effort and fragmented

**Evidence:** `hermes_cli/plugins.py`, `gateway/hooks.py`, `agent/plugin_stream_hooks.py`, `agent/monitoring/emitter.py`, `gateway/stream_events.py` and `gateway/stream_dispatch.py`.

Plugin events are process-local, stream observer queues can drop old items, monitoring is ephemeral, outbound webhooks have no durable outbox, and the typed gateway stream-event producer path is not fully wired.

**Decision:** AGK adds a durable versioned semantic event plane. Hermes signals are normalized inputs with explicit loss reporting.

## HIGH. General hooks can block critical paths

**Evidence:** `hermes_cli/plugins.py:5077-5147`.

Ordinary hook dispatch is sequential and generally has no timeout. Middleware can change Tool and model requests and can violate cache or safety invariants.

**Decision:** AGK uses a small audited plugin, bounded middleware and asynchronous observers. Policy enforcement needs deadlines and fail-closed behavior.

## HIGH. Tool availability caching is not revocation

**Evidence:** `tools/registry.py:269-391`.

Availability checks cache for about 30 seconds and can retain last-known-good true for up to 60 seconds after a failed probe.

**Decision:** `check_fn` remains capability discovery. Consequential authorization and revocation are validated separately for every call.

## HIGH. Subagent execution is not restart-durable

**Evidence:** `tools/async_delegation.py`, `agent/subagent_lifecycle.py`.

Dispatch and completion records can persist, but live children are process-local. Restart produces unknown and never resumes execution. Public lifecycle handles and signing secret are process-local.

**Decision:** reuse bounded AgentCalls and state fidelity honestly. Durable Task execution belongs to AGK orchestration.

## HIGH. Kanban is durable but not an AGK tenancy or Task authority

**Evidence:** `hermes_cli/kanban_db.py`, dispatcher and Tools.

Kanban supplies a strong SQLite DAG, claims, review and worker processes. Board and tenant isolation are application-level, object RBAC is absent, and default macOS concurrency can be unbounded when memory resolution yields no cap.

**Decision:** defer canonical adoption. If used, it is a Runtime queue correlated to AGK Task and configured with explicit bounds.

## HIGH. Cron execution is honest at-most-once occurrence, not durable retry

**Evidence:** `cron/jobs.py`, `cron/scheduler.py`, `cron/executions.py`.

A crash after dispatch can produce `unknown`; the execution ledger is not a retry queue because external side effects may have occurred. The Agent timeout is inactivity-based, not a fixed wall clock.

**Decision:** adapt behind AGK Automation and reconciliation, with idempotency and recovery disposition.

## HIGH. Provider truth is distributed and no semantic smart router exists

**Evidence:** `providers`, `hermes_cli/providers.py`, `hermes_cli/auth.py`, `agent/models_dev.py`, `hermes_cli/runtime_provider.py`.

There are 41 bundled profiles and additional auth or virtual ids, but declarations span several registries and can drift. models.dev entries are not equal to supported providers. Hermes has explicit routes, fallback and auxiliary selection, not an AGK task capability classifier.

**Decision:** reuse transports and resolution, add canonical AGK route decision and capability policy.

## HIGH. Desktop automatic layout switching needs one generic SDK seam

**Evidence:** `apps/desktop/src/sdk/index.ts`, `apps/desktop/src/store/pane-focus.ts`, Desktop Plugin SDK.

Titlebar, routes and contributed layouts are available, but the public desktop SDK cannot programmatically apply an existing layout preset. Internal `applyDesktopLayoutPreset` can.

**Decision:** surface switching remains presentation state. If automatic posture layouts are required, expose the existing resolver through one generic SDK action rather than reaching into internals.

## MEDIUM. Memory provider namespace is provider-defined

Several providers default to shared remote containers or banks unless profile or identity templates are configured. Hermes does not impose generic tenant isolation.

**Decision:** the AGK Memory adapter declares and tests Organization, Project, Agent and Self namespace behavior for each provider.

## MEDIUM. Session lineage overloads one parent edge

Compression, branch, reset, delegation and Tool children share `parent_session_id` with relationship type inferred from state or JSON.

**Decision:** the adapter creates explicit canonical relationship kinds and does not use conversation root as Mission, Session or Run identity.

## MEDIUM. Persistence and evaluation remain subsystem-specific

The current Session schema is version 26. Other databases and files have separate durability. Verification evidence is useful but bounded. Trajectory files can be unredacted and unlocked. No universal Eval or Artifact contract exists.

**Decision:** reuse evidence mechanisms selectively and retain AGK-owned Event, Eval and Artifact identities.
