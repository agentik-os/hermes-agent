## Audit basis

- **Repository:** `/Users/hacker/.hermes/hermes-agent`
- **Revision:** `8794e5a21c980a0f26532cb4883284b786cb3f25`
- **Branch:** `agk/upgrade-architecture`
- Read root `AGENTS.md`, implementation code, current config defaults, Bot Mode/Desktop coordination code, and the draft AGK Agent/Team/Workforce/Flow/Loop/Permissions/Runtime specifications.
- This was a **read-only source audit**. No tests or services were run because no code was changed.

## Executive findings

1. **Hermes is a strong runtime substrate, not an AGK control plane.** It has mature agent execution, subagents, durable queues, schedulers, hooks, profiles, and transport adapters. It does not have canonical AGK Team, Workforce, Flow, Mission, permission, deployment-snapshot, or event-ledger semantics.
2. **Durability is subsystem-specific.** Persistent metadata frequently survives restart, but live Python threads, active model/tool calls, queues, hook registries, and group-round drivers do not.
3. **Kanban is Hermes’ strongest durable multi-agent primitive.** It provides a shared SQLite task DAG, claims, retries, worker PIDs, dependencies, review/rework, notifications, and independent profile processes.
4. **Background delegation is not resumable execution.** Dispatch and completion-delivery records are durable, but the child runs in a daemon thread. A process crash converts the result to `unknown`; it does not resume the child.
5. **Profiles, toolsets, environment markers, and worktrees are coordination boundaries—not tenant or OS security boundaries.** AGK’s required whole-process sandbox and authorization layer must sit above/below them.
6. **There are several independent automation/hook planes with different delivery and trust semantics.** They cannot be exposed as one canonical AGK event or Automation system without an adapter and authoritative ledger.

---

## Durability and runtime-state matrix

| Subsystem | Durable state | Process-local state | Restart/recovery semantics |
|---|---|---|---|
| Main `AIAgent` turn | Session transcript and prompt snapshot in profile `state.db` | Agent object, tool loop, in-flight calls, iteration budget | Completed transcript state is reusable; no cognition/process checkpoint |
| Session TODO | Latest paired `todo` call/result in transcript | `TodoStore` on `AIAgent` | Reconstructed by replaying the latest valid tool result; not an independent task store |
| `delegate_task` | Child session transcript; `async_delegations` row and terminal completion payload in `state.db` | Child `AIAgent`, daemon executor, live registry, steer/stop state | Dead owner becomes `unknown`; pending completion can replay, but execution never resumes |
| Public subagent lifecycle API | None | HMAC handles, registry, fixed eight-thread pool, results retained one hour | `reconnect` works only in the same process; serialized handles fail after restart |
| `terminal(background=true)` | Gateway checkpoint in `$HERMES_HOME/processes.json` | `Popen`, readers, output buffer, completion queue | Live host PID can be re-adopted as detached; output and real exit code are unavailable. Non-host sandbox PIDs are not recoverable |
| Kanban | Shared SQLite board, task DAG, claims, runs, dependencies, reviews, subscriptions, wakeups | Dispatcher loop and active worker processes | Tasks survive; killed/dead workers are reclaimed/retried/blocked. Agent cognition is not resumed |
| `/goal` | `goal:<session-id>` state in SessionDB metadata | Judge call and queued continuation turn | Goal intent survives; a lost queued continuation does not autonomously restart until a new turn or explicit resume |
| `/loop` | `loop:<session-id>` schedule and lifecycle state | Current tick and UI/gateway driver | Gateway rescans routed loops after restart; CLI/TUI loops need their owning surface |
| Cron | Profile-local `cron/jobs.json`, execution ledger in `cron/executions.db`, output files and sessions | Ticker, thread pools, active agents/scripts, delivery operations | Dead attempts become `unknown`; ledger is explicitly not a retry queue |
| Plugins/hooks | Plugin config, grants, shell allowlist | Registries, callbacks, event queues | Registries rebuild at startup; hook events are generally best-effort and not replayed |
| Inbound webhook | Static config and dynamic `webhook_subscriptions.json` | Rate counters, idempotency cache, delivery routing | Requires a live gateway and upstream retries; local idempotency state is lost on restart |
| Bot groups | Profiles/sessions and Desktop plugin group log | Active rounds, epoch, presence, current run | Room history survives; an in-flight group drive does not |

---

## Delegation and subagents

### Model-facing delegation

Primary entry points:

- `tools/delegate_tool.py::delegate_task`
- `run_agent.py::_dispatch_delegate_task`
- `tools/async_delegation.py`
- `agent/delegation_context.py`
- `tools/subagent_worktree.py`

Current semantics:

- Top-level model calls are **always backgrounded**. The schema’s `background` field is deprecated and ignored. Nested orchestrator children run synchronously so they can consume their children’s results (`tools/delegate_tool.py:4813-4881`).
- A batch is one async unit. All children run concurrently, then one consolidated result is delivered after every child finishes (`tools/delegate_tool.py:4080-4086`).
- Current user-facing defaults are:
  - `max_concurrent_children: 10`
  - `max_spawn_depth: 1`
  - `max_iterations: 250` per child
  - no child wall-clock timeout
  - `subagent_auto_approve: false`
  (`hermes_cli/config_defaults.py:1891-1953`).
- Capacity is **per parent**, not global. An over-capacity background dispatch falls back to synchronous execution; an oversized task array is rejected.
- Stop is cooperative: it requests interruption at the next iteration boundary and asks in-flight tools to cancel. A blocking provider/tool call may not stop immediately.
- Steer text is appended at the next tool-result boundary; it never cuts through the current tool call.
- Control actions are restricted to the caller’s descendant tree using object ancestry plus durable session-lineage matching (`tools/delegate_tool.py:380-579`).

### Child context and permissions

Each child receives:

- Fresh conversation and task ID.
- Dedicated SessionDB connection linked to the parent.
- `skip_context_files=True` and `skip_memory=True`.
- Parent toolsets narrowed by the child blocklist.
- A separate terminal/file-state namespace.
- Optional best-effort git worktree.

Leaf children lose the direct tools:

- `delegate_task`
- `clarify`
- `memory`
- `send_message`
- `cronjob`

Orchestrators regain only `delegate_task` (`tools/delegate_tool.py:49-58`, `1278-1317`).

Important boundary limits:

- This is **schema/tool-surface restriction**, not OS capability enforcement. A child retaining terminal or file tools may find equivalent CLI/filesystem/network paths unless those lower layers also enforce the restriction.
- Kanban is stronger than the generic blocklist: delegated-child lineage propagates into subprocesses, and Kanban rejects writes at tool, CLI, and DB transaction layers (`agent/delegation_context.py:124-161`; `hermes_cli/kanban_db.py:165-185`).
- No equivalent delegated-child storage guard exists across all cron, messaging, or memory paths.
- `subagent_auto_approve=false` only auto-denies dangerous-command prompts. It does not prevent ordinary file writes, network calls, browser actions, or commands not classified as dangerous.
- Worktree isolation defaults off and degrades to the shared parent workspace when setup fails. A worktree separates git edits, not process, credential, filesystem, or network authority.

### Background delegation durability

`tools/async_delegation.py` now persists:

- Dispatch identity and owner PID/start time.
- Origin session and delivery routing.
- Task metadata.
- Terminal event/result.
- Delivery state, claim, and attempt count.

But the child itself remains a daemon thread. Recovery does this:

- If the owner PID is gone, classify `running|finalizing` as `unknown`.
- Queue a durable `unknown` completion for the parent.
- Never rerun or resume the child (`tools/async_delegation.py:335-444`).

Completion delivery is bounded:

- 48-hour maximum replay age.
- Eight failed delivery attempts before `dropped`.
- Terminal records retained approximately seven days.

This is **durable dispatch accounting and result delivery**, not durable execution.

### Public plugin subagent lifecycle

`agent/subagent_lifecycle.py` is a second subagent interface intended for `PluginContext.subagent_lifecycle`.

Strengths:

- Immutable request/handle/status/result contracts.
- HMAC capability handle bound to the parent session.
- Requested toolsets cannot broaden the parent’s toolsets.
- Correlation IDs are unique per parent.
- Plugins never receive live `AIAgent` objects.

Limitations against AGK `spawn_agent_call`:

- Entire registry and signing secret are process-local.
- Fixed pool of eight workers, independent of `delegation.max_concurrent_children`.
- No persisted completion or normalized durable event.
- No real reconnect after restart.
- Per-launch timeout, working directory, and per-tool blocklist fields are explicitly unsupported.
- No capability-consent check protects access to the lifecycle facade itself.
- There is no AGK permission decision, Budget reservation, Agent identity, Mission/Task identity, or deployment-version pin.

---

## Kanban, tasks, goals, and loops

### Kanban

Core paths:

- `hermes_cli/kanban_db.py`
- `hermes_cli/kanban.py`
- `tools/kanban_tools.py`
- `gateway/kanban_watchers.py`
- `hermes_cli/kanban_decompose.py`
- `hermes_cli/kanban_swarm.py`

The board is deliberately shared across profiles:

- Default board: shared Hermes root `kanban.db`.
- Named board: `<root>/kanban/boards/<slug>/kanban.db`.
- Worker env pins board, DB, workspace root, task ID, run ID, and claim token.

Task states are:

`triage → todo/scheduled → ready → running → blocked/review → done → archived`

The DB supplies:

- Dependency DAG and promotion when parents complete.
- Single-writer dispatch locks.
- Atomic claims and run IDs.
- Heartbeats and stale-claim reclamation.
- PID-based crash detection.
- Failure counters and automatic blocking.
- Review and changes-requested rework.
- Durable subscriptions and gateway wakeups.
- Per-task profile, model, provider, skills, runtime, workspace, and goal-mode settings.

Workers are independent processes launched as:

`hermes -p <assignee> --cli --accept-hooks ... chat -q "work kanban task <id>"`

with `start_new_session=True` (`hermes_cli/kanban_db.py:10709-10921`).

Permission controls:

- Task workers can mutate only their own task for lifecycle operations.
- `kanban_list` and `kanban_unblock` are orchestrator-only.
- Delegated in-process children cannot mutate Kanban.
- Run ID and claim-lock CAS prevent stale workers from closing a replacement run.

Limits:

- Board/tenant isolation is application-level. Every worker runs under the same OS user unless the profile’s terminal/runtime backend adds a real sandbox.
- Tenants are soft namespaces, not AGK Organizations or security tenants.
- Any profile with the orchestrator Kanban toolset has broad board-routing authority; there is no object-level RBAC.
- Workers may create follow-up tasks, allowing durable fan-out.
- Review lanes do not guarantee independent reviewer identity; the same profile can be assigned unless higher-level policy prevents it.
- Kanban is a shared-file/SQLite workforce on one Hermes root, not a federated cross-machine queue.

Operational defaults worth surfacing:

- Gateway dispatch every 60 seconds.
- Review dispatch on.
- Failure limit two.
- Auto-decompose on, up to three triage roots per tick.
- Stale timeout four hours.
- Per-profile concurrency cap unset.
- Global concurrency derives from Linux memory, clamped to 2–8. On macOS/Windows, unresolved memory means **no default cap**.
- `max_spawn` is also unset unless configured.

Therefore, on the audited macOS host, Kanban fan-out is not inherently bounded without explicit configuration.

`kanban_swarm.py` provides a useful Team-like graph:

`planning root → parallel workers → verifier → synthesizer`

but it is a task topology, not a canonical Team or Workforce definition.

### TODO versus Kanban task

`tools/todo_tool.py::TodoStore` is a model planning aid:

- In memory per `AIAgent`.
- Maximum 256 items and 4,000 characters per item.
- Rehydrated from the latest valid paired `todo` tool response.
- Active items are reinjected after context compression.
- “Only one in progress” is schema guidance; the store does not enforce it.

It has no owner, dependency, claim, worker, review, lease, dispatch, or independent object identity. It maps to neither an AGK Task nor a durable worker queue.

### `/goal`

`hermes_cli/goals.py::GoalManager` stores one standing goal per session.

- Default 20 continuation turns.
- Judge failures fail open to “continue.”
- User interruption pauses the goal.
- User input and gateway FIFO naturally preempt synthetic continuation turns.
- Kanban goal-mode wraps several turns in one worker session until judged complete, blocked, or budget-exhausted.

The goal state is durable, but a queued continuation is not. After a process crash, the goal can remain active without work proceeding until the session is resumed or another turn occurs. It is a session controller, not an AGK Mission.

### `/loop`

`hermes_cli/loops.py::LoopManager` stores one loop per session.

Defaults:

- Minimum fixed interval: 30 seconds.
- Maximum ticks: 100 unless overridden.
- Self-paced backoff: 60–900 seconds.

Gateway loops persist routing metadata and are scanned by `_loop_wakeup_watcher`; CLI/TUI loops are driven by their own live surfaces. Active goals block loop ticks. Current tick execution and `awaiting_response` handling still require a live runtime.

This is useful implementation machinery for an AGK Loop Deployment, but lacks AGK Budget, authority lease, Mission-cycle identity, idempotency declaration, review policy, and canonical event history.

---

## Cron, scheduler, hooks, and webhooks

### Cron

Entry points:

- `cron/jobs.py`
- `cron/scheduler.py`
- `cron/executions.py`
- `cron/scheduler_provider.py`
- `tools/cronjob_tools.py`

Persistence:

- Profile-local `cron/jobs.json`, atomically written under file locks.
- Durable `cron/executions.db` ledger.
- Per-job output files and isolated cron sessions.

Scheduler behavior:

- Built-in 60-second ticker by default; external trigger providers such as Chronos can replace it.
- Advances recurring `next_run_at` before execution to preserve at-most-once occurrence semantics.
- Uses durable one-shot fire claims and process-local in-flight guards.
- Workdir jobs are serialized because they require process-global runtime state; other jobs use a persistent thread pool.
- Catch-up is bounded, not an event backlog: grace is half the cadence clamped to 2 minutes–2 hours; one-shot grace is 120 seconds.
- A crash after dispatch but before terminal recording produces execution status `unknown`; it is deliberately not retried automatically because external side effects may already have happened.

Security and permissions:

- Cron agents always lose messaging, clarification, and memory toolsets.
- Cron agents lose `cronjob` by default; `cron.allow_agent_scheduling=true` explicitly enables self-scheduling.
- Dangerous commands default to `approvals.cron_mode: deny`.
- Cron scripts must reside under profile `scripts/`, are invoked without shell-string interpolation, receive a sanitized environment, and have output redacted.
- `no_agent` jobs are trusted configured scripts and bypass the LLM entirely.
- Cron jobs are profile-local; no cross-profile scheduler authority is implied.

Important implementation details:

- Current agent timeout is **600 seconds of inactivity**, not a three-minute wall-clock limit. A job that continues producing activity can run longer.
- Script timeout defaults to 3,600 seconds.
- `max_parallel_jobs: null` is described as unbounded, but it passes `max_workers=None` to Python’s `ThreadPoolExecutor`; excess jobs queue behind Python’s default worker count.
- `context_from` copies prior output into a prompt. It is not a durable dependency/Flow edge and does not provide transactional ordering or compensation.

### Hook planes

Hermes has distinct hook systems:

1. **Plugin lifecycle hooks** — `hermes_cli/plugins.py`, `hermes_cli/lifecycle.py`, agent/tool/gateway call sites.
2. **Shell hooks** — `agent/shell_hooks.py`, registered into the plugin hook manager.
3. **Legacy gateway hook registry** — `gateway/hooks.py`, loading `$HERMES_HOME/hooks/*.py`.
4. **Outbound HTTP hooks** — `agent/outbound_webhooks.py`.
5. **Inbound webhook platform** — `gateway/platforms/webhook.py`.

Plugin lifecycle hooks can:

- Observe and transform LLM/tool output.
- Inject ephemeral pre-LLM context.
- Block or modify pre-tool calls.
- Rewrite or skip gateway messages before authentication/pairing.
- Observe Kanban, approval, session, subagent, API, and command lifecycle.

Semantics and risks:

- Python callbacks are exception-isolated but usually synchronous and have no timeout.
- `on_session_end` is misleadingly named: it fires at the end of every `run_conversation` call, i.e. every turn. `on_session_finalize` is the true lifecycle closure seam.
- Hooks are best-effort and not a durable semantic event ledger.
- Capability grants are consent over selected host facades, explicitly **not a sandbox**.
- Project plugins require `HERMES_ENABLE_PROJECT_PLUGINS`; bundled and user plugins are trusted Python code once loaded.
- `pre_gateway_dispatch` receives the raw `MessageEvent`, gateway runner, and session store before auth and can rewrite or suppress the event.
- The legacy gateway hook loader is invoked unconditionally by `gateway/run.py` and has no visible `HERMES_SAFE_MODE` gate in `gateway/hooks.py`. If safe mode is expected to suppress every user-code path, this is a gap.
- Kanban workers pass `--accept-hooks`, so configured profile-local shell hooks execute headlessly.

Shell hooks:

- Use `shell=False`, argument splitting, persistent per-command allowlisting, and 1–300 second timeouts.
- Fail open by default.
- Only `pre_tool_call` can opt into `fail_closed`.
- A security policy hook must explicitly use that mode; a crashed default hook permits the action.

Outbound webhooks:

- Queue on a daemon thread; queue size 256, two delivery attempts.
- Optional HMAC; an unset `secret_env` degrades to unsigned delivery with a warning.
- Queue and retries are not durable and are lost on crash.
- Payloads may contain tool arguments/results and session metadata, so configured endpoints are high-trust sinks.

Inbound webhooks:

- Require per-route or global HMAC at startup and request time.
- Unauthenticated mode is restricted to loopback.
- Enforce 1 MiB body limit, 30 requests/minute per route, one-hour in-memory idempotency, event filters, and scripts restricted to profile `scripts/`.
- V2 generic signatures bind a timestamp; legacy body-only V1 is still accepted with a warning and has no replay protection.
- Idempotency and rate counters are process-local, so restart resets them.
- Subscriptions are durable, but inbound events are not a durable queue; upstream must retry while the gateway is unavailable.

---

## Multi-agent coordination surfaces

- **Profiles/Bot Mode:** A Bot is a profile with durable config, sessions, memory, skills, metadata, and canonical Bot Chat. Profiles share the OS account, and Bot creation may intentionally share credentials or clone `.env`; they are not trust boundaries.
- **Bot groups:** Desktop plugin-owned bounded round-robin: up to six members, three serial rounds, ten messages per user send. Each member has a persistent `Group: <name>` session; room log/watermarks persist, while the active driver is runtime-only.
- **Bot DMs/peers:** One synchronous agent turn into a persistent Bot Chat, locally via CLI or remotely via authenticated API. This is messaging, not a durable task lease or distributed queue.
- **Mixture of Agents:** `agent/moa_loop.py` fans out reference-model calls and aggregates them. Advisors do not have autonomous tool loops or persistent Agent identity. MoA is a model-ensemble technique, not a Team or Workforce.
- **Independent Hermes processes:** `terminal(background=true)` or separate `hermes -w` processes offer stronger process/workspace separation than `delegate_task`, but structured supervision and result durability are weaker than Kanban.

---

## AGK mapping and fit

The draft AGK specifications correctly require these mappings to remain adapters rather than identity equivalences.

| AGK primitive | Hermes implementation candidate | Fit and gap |
|---|---|---|
| **Agent** | Profile + `AIAgent` + SessionDB binding | Profile is a runtime namespace; `AIAgent` is a Run implementation. Neither carries canonical AGK identity/version/permission/Budget/deployment semantics |
| **AgentCall/subagent** | `delegate_task` or `SubagentLifecycleService` | Strong bounded execution mechanics; lacks resumable run, AGK authorization, durable normalized events, Budget reservation, and portable checkpoint |
| **Team** | Delegate batch, Bot group, Kanban swarm | All are coordination shapes; none has canonical mission, membership, route, capacity, shared scopes, quality policy, lifecycle, or Team Budget |
| **Workforce** | Profiles + shared Kanban dispatcher | Useful local worker pool, but no Workforce definition/instance/deployment snapshot, organization policy, package lifecycle, or cross-machine control plane |
| **Task** | Kanban row or TODO entry | Kanban is a runtime work item; TODO is planning state. Neither is the canonical Mission/Plan-scoped AGK Task |
| **Flow** | Kanban DAG, review graph, cron chaining | Kanban approximates a current Task Graph. Hermes has no reusable versioned Flow Definition with typed I/O, decisions, compensation, deployment binding, or artifact/eval contract |
| **Loop** | `/loop`, `/goal`, Kanban goal mode, cron ticker | Useful controllers/triggers, but not canonical bounded Loop Definitions and Deployment records |
| **Automation/Trigger** | Cron jobs, webhook routes, lifecycle hooks | Good trigger providers; AGK must own identity, version, permissions, deployment, idempotency, retries, audit and reconciliation |
| **Runtime events** | Plugin hooks, logs, trajectories, execution ledgers | Rich adapter inputs, but not AGK’s durable normalized Mission→Task→Run→Span event contract |

### AGK specification gap

The draft type registry includes **Automation** and **Trigger**, and `AgentRuntime` includes `schedule_trigger(...)`, but there is currently no dedicated `AGK_AUTOMATION_MODEL.md` or equivalent contract defining:

- Automation definition versus deployment versus fire attempt.
- Trigger ownership and source of truth.
- Retry/misfire/idempotency policy.
- Permission and approval state.
- Compensation and partial-side-effect handling.
- Correlation to Mission, Task, Run, and Artifact.
- Reconciliation when Hermes cron/webhook state diverges.

That contract is needed before mapping cron, webhooks, or hooks canonically.

---

## Highest-priority AGK adapter constraints

1. **Never map Profile directly to AGK Agent or tenant.** Create a dedicated runtime-profile binding and whole-process sandbox per governed Agent instance.
2. **Keep AGK Task/Mission authoritative.** Kanban rows may carry correlation IDs but must not become a second canonical task graph.
3. **Treat async delegation as non-checkpointable execution.** On crash, create a new Run attempt or inspection state; never claim the previous child resumed.
4. **Authorize below the model.** Tool hiding, prompts, env markers, and worktrees are insufficient for `Permission ∩ Risk ∩ Policy ∩ Environment ∩ Approval`.
5. **Normalize hooks into a durable ledger.** Native hooks are lossy runtime signals and must not be the event source of truth.
6. **Configure explicit Kanban resource caps on macOS/Windows.**
7. **Separate runtime trigger mechanics from Automation truth.** Cron/webhook records should be adapter bindings to one AGK Automation identity, not peer authorities.
8. **Require independent verification by policy.** Hermes supports reviewer/verifier roles but does not ensure producer/reviewer separation itself.

## Files and issues

- **Files created or modified by this audit:** none.
- `git diff` and staged diff are empty.
- The working tree already contained numerous untracked `agk-upgrade/**` artifacts; I read relevant specifications but did not alter them.
- **Documentation drift found:** the loaded Hermes background-systems reference and some code comments still describe delegation concurrency as default `3`; current user-facing config/default resolver is `10`. The same reference describes a three-minute cron hard interrupt, while current source implements a 600-second inactivity timeout. I did not patch these because the task explicitly prohibited file modification.

[steer did not land — the subagent finished before it could be delivered: Stop broad exploration now. Return current evidence-backed findings for delegation, kanban, cron, hooks, loops and goals, especially durability and AGK semantic collisions.]