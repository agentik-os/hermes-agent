## Audit result

Audited `/Users/hacker/.hermes/hermes-agent` on branch `agk/upgrade-architecture`, commit `8794e5a21c980a0f26532cb4883284b786cb3f25`. I read the root `AGENTS.md` and traced the implementation paths directly.

**Decision legend**

- **Reuse** — suitable to port largely intact.
- **Adapt** — retain the contract/pattern, but refactor or harden before AGK adoption.
- **Reject as boundary** — useful functionality, but must not be represented as a security boundary.

## 1. Core tool plane

### Tool discovery and registry — **Reuse with minor adaptation**

**Exact primitives**

- `discover_builtin_tools()`, `_module_registers_tools()` — `tools/registry.py:74-162`
- `ToolEntry` — `tools/registry.py:204-233`
- `ToolRegistry` — `tools/registry.py:426-1260`
- `ToolRegistry.register()`, `deregister()`, `get_definitions()`, `dispatch()` — `tools/registry.py:737-945,1018-1142`
- `tool_error()`, `tool_result()` — `tools/registry.py:1282-1309`

**Capabilities**

- AST-discovers top-level `registry.register(...)` calls and imports self-registering modules.
- Stores schema, handler, toolset, availability probe, environment requirements, async flag, result budget, emoji, and dynamic schema overrides.
- Supports profile-scoped plugin overlays over process-global built-ins.
- Bridges async handlers automatically and normalizes results to strings or the supported multimodal envelope.
- Bounds exception bodies before they enter model context.

**Security boundaries**

- Plugin shadowing requires both `override=True` and operator opt-in; ownership is derived from the handler’s defining module, including wrappers/partials (`tools/registry.py:619-856`).
- Plugin deregistration cannot remove another plugin’s/global tool without the same opt-in (`tools/registry.py:858-945`).
- Multiplex profile scope failures bypass the availability cache instead of aliasing profiles (`tools/registry.py:299-345`).

**Limitations**

- `check_fn` results are cached for 30 seconds, with a last-known-good `True` retained for up to 60 seconds after a failing probe (`tools/registry.py:269-391`). This favors availability over immediate revocation.
- Built-in import failures only log and omit the tool (`tools/registry.py:155-162`).
- Plugins are imported and execute **in-process**; override authorization protects registry slots, not the host from malicious plugin Python.
- `ToolRegistry.dispatch()` itself trusts its caller. The normal agent loop separately rejects names outside `agent.valid_tool_names` (`agent/conversation_loop.py:6951-6963`), so AGK must preserve that outer authorization check.

**Extension points**

- `PluginContext.register_tool()` with lifecycle-safe restoration on unload — `hermes_cli/plugins.py:1702-1794`
- Toolset aliases and MCP dynamic register/deregister.
- Pre/post hooks and behavior-changing middleware.

### Toolsets and schema assembly — **Reuse, but make session capabilities immutable**

**Exact primitives**

- `_HERMES_CORE_TOOLS`, `_HERMES_WEBHOOK_SAFE_TOOLS`, `TOOLSETS` — `toolsets.py:29-650`
- `get_toolset()`, `resolve_toolset()`, `resolve_multiple_toolsets()` — `toolsets.py:655-897`
- `create_custom_toolset()` — `toolsets.py:994-1013`
- `get_tool_definitions()`, `_compute_tool_definitions()` — `model_tools.py:323-652`

An AST cross-check found **59 static toolset keys**.

**Capabilities and boundaries**

- Composition, recursive includes, cycle suppression, aliases, static platform bundles, plugin/MCP toolsets, and generation-keyed caching.
- GUI-only capabilities remain outside the core list in `desktop_ui` and `project` (`toolsets.py:260-285`).
- Webhooks receive only search, extraction, vision, and clarification by default, excluding terminal/filesystem execution (`toolsets.py:94-102,640-643`).
- Disabled toolsets are subtracted after composite expansion; platform/posture bundles remove only their non-core delta (`model_tools.py:460-501`).
- `browser_exec` is stripped when the session lacks `terminal`, preventing the browser toolset from silently restoring host-code execution (`model_tools.py:580-593`).

**Limitations**

- `TOOLSETS` is a mutable process-global dictionary; `create_custom_toolset()` has no locking or profile/session scope.
- `_last_resolved_tool_names` is process-global compatibility state (`model_tools.py:261-263`).
- Hermes’s prompt-cache invariant requires toolsets to remain stable for a conversation; AGK should materialize a frozen `SessionCapabilities` object rather than repeatedly consulting mutable globals.

### Dispatch, middleware, and progressive disclosure — **Reuse**

**Exact primitives**

- `handle_function_call()` — `model_tools.py:1192-1612`
- `coerce_tool_args()` — `model_tools.py:797-902`
- `suppress_post_tool_call_hook()` — `model_tools.py:45-57`
- `ToolSearchConfig`, `assemble_tool_defs()`, `dispatch_tool_search()`, `dispatch_tool_describe()`, `resolve_underlying_call()` — `tools/tool_search.py:80-188,785-1091`
- `PluginContext.register_middleware()` — `hermes_cli/plugins.py:3292-3299`

**Capabilities**

- Argument coercion from model-generated strings to schema types.
- Tool request middleware can rewrite arguments before hooks, approvals, and execution.
- Execution middleware wraps the actual handler; post hooks observe duration/status; `transform_tool_result` may replace the final string.
- ACP edit approval runs before file mutation (`model_tools.py:1421-1460`).
- MCP/plugin tools can be deferred behind `tool_search`, `tool_describe`, and `tool_call`; core and GUI surface tools remain direct.
- Deferred invocation is revalidated against the session-scoped catalog and recursively dispatched as the underlying tool, preserving hooks and approvals (`model_tools.py:1267-1347`).

**Boundary**

Middleware and hooks are trusted in-process plugin code, not a sandbox. AGK should retain the lifecycle/trace model but capability-gate behavior-changing middleware separately from observer hooks.

### Safe mode — **Reuse only as recovery mode**

`_apply_safe_mode()` sets `HERMES_SAFE_MODE`, `HERMES_IGNORE_USER_CONFIG`, and `HERMES_IGNORE_RULES` (`hermes_cli/main.py:11858-11863`); plugin discovery then skips loading (`hermes_cli/plugins.py:3773-3790`).

This is **not an execution sandbox**. It also ignores user configuration and project rules, potentially discarding a configured remote/container backend and falling back to built-in defaults.

## 2. Terminal and process execution

### Shared environment contract — **Reuse and turn into a backend registry**

**Exact primitives**

- `EnvironmentConnectionError`, `ProcessHandle`, `_ThreadedProcessHandle` — `tools/environments/base.py:55-78,417-501`
- `BaseEnvironment` — `tools/environments/base.py:595-1478`
- `BaseEnvironment.init_session()`, `_wrap_command()`, `_wait_for_process()`, `execute()` — `tools/environments/base.py:702-824,849-960,976-1321,1398-1458`

**Capabilities**

- Spawn-per-call `bash -c` model.
- Persistent shell state through a private snapshot containing exports, functions, aliases, and shell options.
- Per-command CWD persistence through in-band markers.
- Interrupt/timeout handling, process termination, bounded model-facing output, recoverable spill files, and periodic activity callbacks.
- SDK backends adapt blocking APIs through `_ThreadedProcessHandle`.

**Security/limitations**

- Assumes a Bash-compatible shell plus tools such as `mktemp`, `mv`, `grep`, and `awk`.
- Snapshot files use `umask 077` and explicitly strip session identity and multiplexed passthrough values.
- SDK adapters generally buffer all output until the blocking SDK call completes.
- Backend selection is hardcoded in `_create_environment()`; adding one requires edits to config parsing, requirements, factory branches, backend sets, and often file/code-execution duplicates. There is no environment plugin registry.

### `terminal` — **Adapt**

**Exact primitives**

- `_get_env_config()`, `_create_environment()` — `tools/terminal_tool.py:1572-1945`
- `terminal_tool()` — `tools/terminal_tool.py:2604-3671`
- `check_terminal_requirements()` — `tools/terminal_tool.py:3698-3809`
- `TERMINAL_SCHEMA`, `_handle_terminal()` — `tools/terminal_tool.py:3864-3942`

**Capabilities**

- Foreground commands; tracked background commands; optional local PTY.
- Per-session CWD records and task/container aliasing.
- Backend reuse, idle cleanup, interruption, sudo rewriting, output truncation/spilling, ANSI stripping, secret redaction, failure hints, and verification-evidence recording.
- Structured degraded-backend results distinguish infrastructure failure from a nonzero command exit.

**Boundaries**

- Runs hardline/dangerous/Tirith approval checks before execution.
- Blocks gateway lifecycle self-restarts, unsafe `workdir` characters, and Windows mutation of the live Hermes checkout.
- Docker with host binds is treated as host-accessible for approval purposes.

**Limitations**

- Local execution has full same-user host authority.
- Foreground execution retries raised exceptions up to three times without an idempotency contract (`tools/terminal_tool.py:3341-3386`); an exception after partial side effects could replay a command.
- Schema claims PTY works on local and SSH (`tools/terminal_tool.py:3888-3891`), but `terminal_tool()` passes PTY only to `spawn_local`; non-local calls use `spawn_via_env()` and ignore it (`tools/terminal_tool.py:3077-3093`).
- Environment construction is duplicated and has drift:
  - Canonical config helper: `tools/terminal_tool.py:1730-1753`
  - File-first creation omits several Docker/Modal settings: `tools/file_tools.py:1526-1567`
  - Execute-code-first creation omits still more: `tools/code_execution_tool.py:835-876`

AGK should have one validated `EnvironmentSpec` and one factory/registry.

### `process` background manager — **Adapt; add hard ownership checks**

**Exact primitives**

- `ProcessSession`, `ProcessRegistry` — `tools/process_registry.py:367-496`
- `spawn_local()`, `spawn_via_env()` — `tools/process_registry.py:974-1310`
- `poll()`, `read_log()`, `wait()`, `kill_process()`, stdin methods — `tools/process_registry.py:1862-2247`
- `PROCESS_SCHEMA`, `_handle_process()` — `tools/process_registry.py:3002-3126`

**Capabilities**

- 200 KB rolling output, polling/log pagination/wait/kill, local PTY stdin, notifications and rate-limited watch patterns.
- Atomic crash checkpoint, redacted command persistence, PID-start-time validation to avoid killing recycled PIDs.
- Optional systemd transient scopes isolate gateway-spawned local background workers from gateway OOMs.

**Limitations/security gap**

- Non-local background processes are file-polled every two seconds and have no live stdin or PTY (`tools/process_registry.py:1212-1230,1446-1502`).
- Only host processes are recoverable after restart; sandbox PIDs are skipped (`tools/process_registry.py:2593-2679`).
- `list` scopes results by task/session, but all control actions call registry methods using only `session_id`; no owner task/session is checked (`tools/process_registry.py:3072-3116`). A known foreign process ID in the same Hermes process can therefore be polled, logged, killed, or written to. AGK must bind every process capability to an unforgeable session principal, not just a random ID.

## 3. Filesystem

### File tool layer — **Reuse with policy cleanup**

**Exact primitives**

- `read_file_tool()`, `write_file_tool()`, `patch_tool()`, `search_tool()` — `tools/file_tools.py:1624-1991,2222-2636`
- `FileOperations`, `ShellFileOperations` — `tools/file_operations.py:517-579,879-3410`
- `FileStateRegistry` — `tools/file_state.py:59-320`
- `validate_within_dir()`, `has_traversal_component()` — `tools/path_security.py:15-43`

**Capabilities**

- All operations run against the active terminal backend, so local, container, SSH, and cloud filesystems share one API.
- Read pagination, 100K-character cap, line numbering, binary/special-file blocking, UTF-16 rescue, and Office/PDF/notebook text extraction.
- Atomic writes via same-directory temp file plus rename, mode/CRLF/BOM preservation, content hash verification, fail-closed JSON/YAML/TOML syntax validation, lint deltas, and optional LSP diagnostics (`tools/file_operations.py:1176-1262,1916-2183`).
- Fuzzy replace, V4A multi-file patches, post-write verification, sorted per-path locking, cross-agent staleness tracking, and unified diffs.
- Ripgrep/grep search with pagination, context, count/files modes, and line-oriented warnings.

**Boundaries**

- Read/search block Hermes credential stores, project `.env` files, devices, `/proc` secret-bearing pseudo-files, and internal skill-hub caches (`agent/file_safety.py:247-390`; `tools/file_tools.py:520-642`).
- Writes hard-deny credentials/system state, support `HERMES_WRITE_SAFE_ROOT`, block direct `config.yaml` mutation, require approval for SSH config, and always ask for project instruction files such as `AGENTS.md`/`CLAUDE.md` (`agent/file_safety.py:28-230`; `tools/file_tools.py:645-1019`).
- V4A header traversal is rejected; cross-profile and sandbox-mirror writes require explicit `cross_profile=True`.

**Limitations**

- The read denylist explicitly states it is defense-in-depth: terminal access can bypass it (`agent/file_safety.py:270-283`).
- Cross-profile/sandbox-mirror checks are soft guards and can be overridden.
- Staleness generally warns rather than blocking; `HERMES_DISABLE_FILE_STATE_GUARD=1` disables coordination.
- Shell-backed operations depend on target-side Bash/coreutils/ripgrep/Python availability.
- Search is line-oriented, not multiline regex.

## 4. Approvals

### Dangerous-command approval engine — **Reuse, but change headless defaults**

**Exact primitives**

- `HARDLINE_PATTERNS`, `DANGEROUS_PATTERNS` — `tools/approval.py:515-564,774-1090`
- `detect_hardline_command()`, `detect_dangerous_command()` — `tools/approval.py:601-620,2321-2341`
- `_ApprovalEntry` and gateway queue APIs — `tools/approval.py:2589-2717`
- `_run_approval_gate()`, `check_all_command_guards()` — `tools/approval.py:3415-3700,4342-4983`
- `check_execute_code_guard()` — `tools/approval.py:4986-5395`

**Capabilities and boundaries**

- Hardline disk wipe, filesystem format, raw-device overwrite, fork bomb, kill-all, and shutdown commands are blocked before YOLO/mode-off.
- User-defined deny globs also run before bypass.
- YOLO is frozen at import so plugin/skill code cannot enable it by mutating the environment mid-process (`tools/approval.py:34-37`); gateway YOLO is session-scoped.
- Manual, smart-guardian, cron, single-query, CLI, gateway, ACP, and persistent allowlist flows.
- Silence/timeouts fail closed when a human prompt was actually initiated.
- Container prompts are skipped for Singularity, Modal, Daytona, Vercel, and Docker without host binds (`tools/approval.py:3703-3714`).

**Important limitation**

In a non-interactive, non-gateway, non-cron context, dangerous terminal commands preserve historical **auto-approve** behavior (`tools/approval.py:3492-3547,4415-4549`). `check_execute_code_guard()` documents the same trusted-headless limitation (`tools/approval.py:4997-5003`). AGK should default to fail-closed unless a policy explicitly grants unattended execution.

Tirith is optional and defaults to fail-open on import failure unless configured otherwise.

### Approval transports — **Strong reuse candidate**

- `ApprovalRequest`, `ApprovalDecision`, `ApprovalTransportResult` — `hermes_cli/approval_transport.py:33-130`
- `invoke_approval_transport()` — `hermes_cli/approval_transport.py:133-219`
- `PluginContext.register_approval_transport()` — `hermes_cli/plugins.py:1665-1700`

The host creates an immutable redacted request, hashes its canonical fields, restricts allowed decisions, correlates the returned request ID/digest, caps workers at eight, times out and interrupts fail-closed, and retains authorization/persistence policy in the host. This is one of the cleanest AGK-ready contracts.

### Other approval surfaces

- Persistent memory/skill write staging: `tools/write_approval.py:74-312`. Useful, but records are plain JSON and the module sets no explicit file mode.
- ACP edit proposals and auto-approve policies: `acp_adapter/edit_approval.py:25-338`.
- ACP policies map default → ask, accept-edits → workspace session, and don’t-ask → session (`acp_adapter/server.py:655-718`).

## 5. Code execution “sandbox”

### `execute_code` — **Reuse the RPC idea; reject as a security sandbox**

**Exact primitives**

- `execute_code()` — `tools/code_execution_tool.py:1255-1744`
- `_rpc_server_loop()`, `_rpc_poll_loop()` — `tools/code_execution_tool.py:652-778,921-1061`
- `_execute_remote()` — `tools/code_execution_tool.py:1063-1248`
- `_scrub_child_env()` — `tools/code_execution_tool.py:208-299`
- `build_execute_code_schema()` — `tools/code_execution_tool.py:2076-2159`

**Capabilities**

- Local UDS transport, Windows loopback-TCP fallback, and remote file-based RPC.
- Generated `hermes_tools.py` exposes seven possible tools: web search/extract, read/write/search/patch, and foreground terminal.
- Per-run token authentication, tool allowlist, 50-call default cap, 300-second default timeout, 50 KB stdout/10 KB stderr limits, process-tree termination, and child environment scrubbing.
- Project mode uses session CWD and active venv; strict mode uses a temp directory and Hermes Python.

**Security reality**

- Local execution is arbitrary Python under the same OS user. It can directly read/write host files, open sockets, import `subprocess`/`ctypes`, and bypass terminal string approvals. Environment scrubbing is not OS isolation.
- Default mode is `project`, explicitly choosing the project interpreter and working directory (`tools/code_execution_tool.py:1822-1842,1953-2041`).
- Whole-script approval applies to gateway/ask, cron, and single-query paths; ordinary interactive CLI relies only on nested `terminal()` calls being approved, which does not cover direct Python side effects.

**Capability bug to fix**

Both local and remote paths fall back to **all seven tools** when the intersection with session-enabled tools is empty:

- Remote: `tools/code_execution_tool.py:1079-1083`
- Local: `tools/code_execution_tool.py:1336-1341`

Thus a session granted `execute_code` but none of the seven nested tools can regain them. AGK must distinguish `enabled_tools is None` from an explicitly empty intersection and fail closed.

Other limitations:

- Top docstring and `check_sandbox_requirements()` still claim POSIX/UDS-only, while Windows TCP support is implemented (`tools/code_execution_tool.py:27-28,53-56,302-321`).
- Remote file shipment embeds Base64 source in a shell command, creating command-length/process-argument limits (`tools/code_execution_tool.py:888-902`).

## 6. Browser plane

### Built-in browser stack — **Adapt**

**Exact primitives**

- `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_scroll`, `browser_back`, `browser_press`, `browser_get_images`, `browser_vision`, `browser_console` — `tools/browser_tool.py:3317-4891`
- `BrowserProvider` ABC — `agent/browser_provider.py:50-177`
- Profile-scoped provider registry — `agent/browser_registry.py:49-150`
- `CDPSupervisor`, `_SupervisorRegistry` — `tools/browser_supervisor.py:289-1501`
- Raw `browser_cdp()` — `tools/browser_cdp_tool.py:394-531`
- `browser_dialog()` — `tools/browser_dialog_tool.py:82-148`
- Camofox REST backend — `tools/browser_camofox.py:514-954`

**Capabilities**

- Local Chromium/Lightpanda, cloud browser providers, Camofox, and explicit CDP.
- Accessibility snapshots and ref-based actions, screenshots/vision, console/eval, images, recording, dialogs, OOPIF frame tracking, and raw CDP.
- Browser-provider plugins implement session create/close/emergency cleanup and are profile-scoped (`agent/browser_provider.py:90-127`; `hermes_cli/plugins.py:2531-2581`).

**Boundaries**

- Browser subprocesses receive a scrubbed environment with only browser-provider keys re-added (`tools/browser_tool.py:112-143`).
- URL handling blocks recognizable secrets in URLs, credential-like query parameters on third-party cloud browsers, private/internal destinations in non-local modes, website-policy denials, and an unconditional metadata-endpoint floor (`tools/browser_tool.py:3286-3314,3317-3476`).
- `tools/url_safety.py:311-519` performs DNS/IP classification; connect-time-safe httpx transports close DNS-rebinding for Hermes-owned HTTP clients (`tools/url_safety.py:539-847`).
- Snapshot/console/CDP outputs are force-redacted.

**Limitations**

- Local browser + local terminal deliberately skips private-network blocking, assuming terminal already grants equivalent access (`tools/browser_tool.py:956-992`).
- Cloud-configured sessions default to routing private URLs to a **local Chromium sidecar** (`tools/browser_tool.py:1371-1490`).
- Browser navigation still has DNS TOCTOU; browser connections cannot use the IP-pinning httpx transport. Post-redirect/current-page checks mitigate content return but run after navigation.
- Current-page private-URL probes fail open on probe errors (`tools/browser_tool.py:4010-4035`).
- Sensitive JS-eval primitives such as cookies, storage, form values, and arbitrary network requests are unrestricted by default; the vocabulary denylist requires `browser.restrict_evaluate: true` (`tools/browser_tool.py:4038-4188`).
- Raw CDP is intentionally broad. Its SSRF guard is best-effort and fail-open on guard-probe exceptions (`tools/browser_cdp_tool.py:127-180`).
- `browser_dialog` documentation mentions provider sessions, but its shared check ultimately requires a raw configured CDP override; provider-only CDP routing is described as a follow-up (`tools/browser_cdp_tool.py:637-667`; `tools/browser_dialog_tool.py:7-10,120-147`).

### Browser Use `browser_exec` — **Do not reuse as an AGK core primitive without a real sandbox**

`browser_exec()` pipes model-authored code verbatim to a CLI that executes full Python (`tools/browser_use_cli.py:549-673,676-684`).

- It uses the same host filesystem and receives browser-provider credentials.
- URL screening only examines literal `http(s)` strings with `_blocked_url_in_code()` (`tools/browser_use_cli.py:92-104`); dynamic URLs, stdlib HTTP calls, subprocesses, and filesystem activity are outside that guard.
- It has no whole-script approval equivalent to `execute_code`.
- It is hidden unless the session also has terminal capability (`model_tools.py:580-593`), which limits accidental privilege widening but does not sandbox it.

AGK should make this a trusted optional plugin executed under the same sandbox/policy as arbitrary code.

## 7. Execution backend matrix

| Backend | Source capabilities and boundary | Limitations | AGK decision |
|---|---|---|---|
| **Local** | `LocalEnvironment` runs host Bash, sources configured shell init, persists state, and kills full process groups (`tools/environments/local.py:1708-1984`). Provider/tool secrets and cross-session identity are scrubbed (`local.py:226-335,366-530,591-734`). | No filesystem, network, CPU, or memory isolation for foreground commands. General AWS credentials are intentionally inherited. User rc files execute during snapshot creation. | **Adapt:** explicit trusted-operator backend only; never default for untrusted autonomous jobs. |
| **Docker/Podman** | `DockerEnvironment` supports hardened capability sets, `no-new-privileges`, tmpfs, CPU/memory/PID/disk limits, persistent bind-backed home/workspace, optional host cwd, read-only credential/skill/cache mounts, network-off mode, egress proxy, recovery, and labeled cross-process reuse (`docker.py:322-650,852-1747`). | Network defaults on. Cgroup probe failure silently removes CPU/memory/PID limits (`docker.py:720-769`); disk quotas are unavailable on macOS/most storage drivers. User `docker_extra_args` can materially weaken containment. Persistent containers may remain running across Hermes exits (`docker.py:1918-2035`). Raw `-e KEY=VALUE` argv is included in an INFO log and relies on global log redaction (`docker.py:1277-1279,1350-1360`). | **Adapt/reuse:** strongest local isolation option, but validate dangerous extra args and attest effective limits/network/mounts. |
| **SSH** | `SSHEnvironment` uses BatchMode, ControlMaster, TOFU `StrictHostKeyChecking=accept-new`, remote Bash snapshots, and file sync (`ssh.py:46-435`). | Remote account has full user privileges; this is remote execution, not sandboxing. No strict host-key pin requirement. No PTY/stdin for tracked remote background jobs. | **Adapt:** connector only; require explicit host-key policy and separate credential-sync consent. |
| **Singularity/Apptainer** | `SingularityEnvironment` uses persistent instances, `--containall`, `--no-home`, writable tmpfs/overlay, resource flags, and read-only credential/skill binds (`singularity.py:161-268`). | Module claims capability dropping, but `_start_instance()` emits no capability-drop flag (`singularity.py:1-5,200-223`). No `--cleanenv` is visible, so source does not establish host-env secret isolation. `disk` is accepted but unused. Snapshot path is a module-level profile path. | **Hold/adapt:** do not classify as hardened until capability/env behavior is explicit and tested. |
| **Modal direct** | `ModalEnvironment` uses native `Sandbox.create/exec`, async worker, file sync, mounts, snapshots, and terminate-on-cancel (`modal.py:164-478`). | Network policy is delegated to Modal defaults. Output is buffered. Cancellation terminates the whole sandbox. Snapshot store is module-global and written through non-atomic `_save_json_store`. | **Adapt:** useful cloud adapter; add policy declarations, dynamic profile store, and atomic state. |
| **Modal managed** | `ManagedModalEnvironment` delegates create/exec/poll/cancel/snapshot-terminate to a Nous gateway with bearer auth and idempotency (`managed_modal.py:36-256`). Explicitly rejects host credential-file passthrough (`managed_modal.py:214-227`). | Server owns shell preparation/snapshot semantics. `BaseModalExecutionEnvironment.execute()` ignores streaming-time `bounded_capture`, so large payloads arrive fully before final truncation (`modal_utils.py:58-155`). | **Adapt:** clean trust-boundary split, but require gateway API/version contract and response-size ceiling. |
| **Daytona** | `DaytonaEnvironment` creates/resumes named cloud sandboxes, caps disk at 10 GiB, syncs files, stops persistent sandboxes, deletes ephemeral ones, and stops the sandbox on cancel (`daytona.py:30-270`). | API/network isolation is provider-defined. `auto_stop_interval=0` makes cleanup essential. Output is SDK-buffered; cancellation stops the whole sandbox. | **Adapt:** provider adapter with explicit lifecycle/resource policy. |
| **Vercel Sandbox** | `VercelSandboxEnvironment` supports runtime/resources, transient retries, snapshot restoration, sync, recreate-on-terminal-state, and stop-on-cancel (`vercel_sandbox.py:243-662`). SDK telemetry is default-disabled (`vercel_sandbox.py:47-63`). | Only default 50 GiB disk is supported; runtime allowlist is enforced separately in terminal checks. SDK exposes no per-exec timeout, so timeout stops the entire sandbox (`vercel_sandbox.py:597-637`). Network policy is provider-defined. | **Adapt:** good adapter, retain telemetry-off and recreate logic; add resource/network attestations. |
| **Remote file sync** | `FileSyncManager` provides rate-limited transactional upload/deletion, SHA-256 tracking, upload-only credentials, sync-back retries, a 2 GiB tar cap, and safe tar extraction (`file_sync.py:53-250,256-484`). | Upload failure is logged and state rolled back but not propagated, so a command may run against stale remote files. Sync-back is last-write-wins; Windows lacks cross-process `flock`. | **Adapt:** make failed pre-exec sync visible/fatal by policy and expose conflicts instead of silently overwriting. |

## Highest-priority AGK hardening items

1. **Fix `execute_code` empty-intersection fail-open** before any reuse.
2. **Do not call local `execute_code` or Browser Use Python a sandbox**; run them under a real OS/container sandbox or treat them as terminal-equivalent authority.
3. **Add process-session ownership authorization** to every `process` action.
4. **Replace duplicated backend configuration with one `EnvironmentSpec` and pluggable backend registry.**
5. **Default unattended approvals to fail-closed**, with explicit per-profile grants for cron/headless operation.
6. **Reconcile PTY documentation with implementation** or implement remote PTY/stdin.
7. **Harden Singularity** with explicit clean environment/capability/network policy.
8. **Make remote snapshot stores atomic and dynamically profile-scoped.**
9. **Make pre-exec remote sync failure observable/fatal when freshness is required.**
10. **Keep `BrowserProvider`, `BaseEnvironment`, `FileOperations`, and immutable approval-transport contracts** as AGK’s reusable narrow-waist abstractions.

## Completion notes

- **Files modified by me:** none.
- Final worktree status contains untracked `agk-upgrade/`; it was absent from my initial status check and appeared during the audit, consistent with concurrent parent-agent work. I did not create or edit it.
- Hermes automatically created transient oversized-output spill files under `~/.hermes/cache/spillover`; no repository source was written.
- One read-only AST count probe initially failed because `TOOLSETS` references `_HERMES_CORE_TOOLS`; I corrected it with AST key extraction.