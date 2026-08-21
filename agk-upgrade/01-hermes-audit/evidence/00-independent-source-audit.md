## Audit basis

- **Repository:** `/Users/hacker/.hermes/hermes-agent`
- **Branch / commit:** `agk/upgrade-architecture` @ `8794e5a21c980a0f26532cb4883284b786cb3f25`
- Read repository `AGENTS.md` and inspected current source directly.
- Static verification confirmed **36 critical classes/functions across 19 files**.
- **No runtime or model calls were made; no tests were run.** “Wired” below means reachable in current source, not production-qualified.
- Paths below are relative to `/Users/hacker/.hermes/hermes-agent/`.

## End-to-end execution paths

### CLI

```text
pyproject.toml [project.scripts] hermes
  → hermes_cli/main.py::main()
  → hermes_cli/main.py::cmd_chat()
  → cli.py::main()
  → cli.py::HermesCLI.run()
  → interactive process loop / one-shot query
  → cli.py::HermesCLI.chat()
  → hermes_cli/cli_agent_setup_mixin.py::CLIAgentSetupMixin._init_agent()
      - opens SessionDB
      - resolves compressed-session descendant
      - restores transcript/CWD/model/YOLO state
      - constructs AIAgent
  → run_agent.py::AIAgent.__init__()
  → agent/agent_init.py::init_agent()
  → run_agent.py::AIAgent.run_conversation()
  → agent/conversation_loop.py::run_conversation()
      → agent/turn_context.py::build_turn_context()
      → prompt/context/cache preparation
      → provider transport/model call
      → model_tools.py::handle_function_call() as required
      → repeat until terminal answer/budget/error
  → agent/turn_finalizer.py::finalize_turn()
  → CLI render + persistence
  → cli.py::_finalize_single_query() / _run_cleanup()
```

`hermes-agent = run_agent:main` is a separate, older direct executable path. It constructs `AIAgent` and calls `run_conversation()` without the full `HermesCLI` resume and lifecycle envelope. **AGK should not use this as its primary integration surface.**

### Gateway

```text
hermes gateway [run]
  → hermes_cli/main.py::main()
  → hermes_cli/gateway.py::gateway_command()
  → hermes_cli/gateway.py::_gateway_command_inner()
  → asyncio.run(gateway.run.start_gateway())
  → gateway/run.py::start_gateway()
  → gateway/run.py::GatewayRunner.start()
      - loads hooks/plugins/platform adapters
      - binds each adapter's message handler
      - connects platforms and starts watchers
  → platform adapter creates MessageEvent
    e.g. plugins/platforms/telegram/adapter.py → handle_message()
  → gateway/platforms/base.py::BasePlatformAdapter.handle_message()
  → BasePlatformAdapter._process_message_background()
  → gateway/run.py::GatewayRunner._handle_message()
      → pre_gateway_dispatch plugin hook
      → authorization/pairing/command routing
      → gateway/session.py::SessionStore.get_or_create_session()
      → GatewayRunner._handle_message_with_agent()
      → GatewayRunner._run_agent()
      → profile runtime scope
      → gateway/run.py::TurnRunner.run()
          - reuse or construct cached AIAgent
          - wire callbacks/GatewayStreamConsumer
          - invoke core AIAgent.run_conversation()
      → synchronize compression/session-id changes
      → persist transcript and routing metadata
      → agent:end gateway hook
  → BasePlatformAdapter response extraction
  → delivery obligation ledger
  → BasePlatformAdapter._send_with_retry()
  → platform delivery
```

Shutdown flows through `GatewayRunner.stop()`, bounded turn draining, session finalization, adapter teardown, DB-handle closure, lifecycle marking, and the hard-exit funnel.

## Capability inventory and AGK mapping

| Capability / status | Current implementation | Important limits and extension point | AGK decision |
|---|---|---|---|
| **Core agent façade — WIRED** | `run_agent.py::AIAgent`; constructor delegates to `agent/agent_init.py::init_agent`; conversation methods delegate to extracted modules. Provider-format seam: `agent/transports/base.py::ProviderTransport`, `agent/transports/__init__.py::{register_transport,get_transport}`. | `AIAgent` remains a large mutable façade. Transports deliberately do **not** own client lifecycle, retries, streaming, credentials, or prompt caching; missing transports can fall back to legacy code. | **WRAP** behind an AGK-owned adapter/process boundary; do not subclass or fork the façade. |
| **Turn/model/tool loop — WIRED** | `agent/conversation_loop.py::run_conversation`, `agent/turn_context.py::build_turn_context`, `agent/turn_finalizer.py::finalize_turn`, `model_tools.py::handle_function_call`. Handles API retries/failover, streaming, tool iterations, budget/interrupt state, compression, persistence and result accounting. | Internal result is a mutable dict, not a declared stable external protocol. Much execution is synchronous and gateway runs it off-loop. | **REUSE** unchanged; normalize its result at the AGK boundary. |
| **System-prompt assembly — WIRED/FROZEN PER SESSION** | `agent/system_prompt.py::build_system_prompt`; `agent/prompt_builder.py` builds identity, environment, skills, project context, SOUL/memory. Context files are threat-scanned by `_scan_context_content`. Stored prompts are restored in `agent/conversation_loop.py`, including plugin-section recovery and static-prefix reconstruction. | Prompt is intentionally built once and persisted. Runtime identity mismatch or missing stored prompt causes a rebuild/cache miss. Context files are truncated by a dynamic model-window budget. `ephemeral_system_prompt` is API-time-only and not persisted. | **REUSE** core assembly. Do not inject changing AGK state into the stable prefix. |
| **Plugin prompt sections — WIRED, OPT-IN** | `hermes_cli/plugins.py::PluginContext.register_system_prompt_section`, `PluginManager.render_system_prompt_sections`; inserted by `agent/system_prompt.py`. | Only position is `after_memory`; max **4,000 chars/section**, **8,000 total**, **32 sections**. Rendered only for a new prompt, then frozen/recovered from persisted bytes. | **EXTEND** for small, session-stable AGK identity/policy only. Use `pre_llm_call` user-message context for per-turn state. |
| **In-process prompt/skills reuse — WIRED** | `AIAgent._cached_system_prompt` and `_cached_system_prompt_static`; persisted system prompt in `SessionDB`. Skills index uses `agent/prompt_builder.py::_SKILLS_PROMPT_CACHE` plus `.skills_prompt_snapshot.json`. | These are local reconstruction/performance caches, **not** provider billing caches. Explicit invalidation occurs on model/tool/config changes and compression. | **REUSE**; AGK should treat these as opaque implementation details. |
| **Provider prompt/response caching — WIRED, PROVIDER-DEPENDENT** | `agent/prompt_caching.py::{build_prompt_cache_plan,apply_anthropic_cache_control}`; `agent/prompt_cache_scope.py::resolve_prompt_cache_scope`; `agent/transports/codex.py::_content_cache_key`; `agent/transports/chat_completions.py::_add_prompt_cache_key`. OpenRouter response cache headers come from `agent/auxiliary_client.py::build_or_headers`. | Anthropic cache boundaries/TTL depend on route capabilities; Chat Completions `prompt_cache_key` is endpoint-gated. Compression-lineage root preserves key scope across legacy rotation. OpenRouter response caching is a separate full-response mechanism. | **REUSE**; AGK must preserve byte-stable system/tools/history prefixes and avoid rewriting past messages. |
| **Context-engine SPI — WIRED, ONE ACTIVE ENGINE** | `agent/context_engine.py::ContextEngine`; per-request `conversation_loop._apply_context_engine_selection`; post-turn `_notify_context_engine_turn_complete`. Selection in `agent/agent_init.py`; repository engines in `plugins/context_engine/`; user plugins via `PluginContext.register_context_engine`. | One engine per agent. General-plugin engine singleton is deep-copied; engines holding locks/DB clients can fail copying and fall back to `ContextCompressor`. Selection is request-only and fail-open. Compression callbacks may run on pooled threads. | **DEFER** initially. Extend only if AGK truly needs custom retrieval/topic-routing policy. |
| **Hermes context compression — WIRED, DEFAULT ON** | `agent/context_compressor.py::ContextCompressor`; orchestration/commit in `agent/conversation_compression.py::compress_context`; defaults in `hermes_cli/config_defaults.py`. Durable compression locks, timeout commit fences, anti-growth checks, cooldowns, proactive prune and optional micro-compaction exist. | Defaults: threshold `0.50` with a `0.75` floor for windows below 512K, target ratio `0.20`, max attempts `3`, `in_place=True`. Model-visible context is lossy, though in-place mode soft-archives old rows. `abort_on_summary_failure=False` permits a deterministic “summary unavailable” handoff and middle-window removal for some failures; auth/network failures preserve the session. Extensions must be thread-safe. | **REUSE** and surface compression boundaries to AGK; do not implement a competing core compressor. |
| **Provider-native compaction — IMPLEMENTED, OPT-IN/LIMITED** | `agent/native_compaction.py::{build_native_compaction_plan,consume_native_compaction_items}` and `agent/transports/codex.py`; Codex app-server compaction has its own runtime path. | Responses-native compaction defaults off and is limited to eligible GPT-5.6-family OpenAI/ChatGPT routes. Hermes compression remains the fallback. | **DEFER** as an AGK dependency; allow Hermes to use it opportunistically. |
| **Canonical sessions/transcripts — WIRED, SQLITE** | `hermes_state.py::SessionDB`; schema in `hermes_state_common.py::SCHEMA_SQL`; supporting mixins `hermes_state_schema.py`, `hermes_state_search.py`, `hermes_state_portability.py`. Tables include `sessions`, `messages`, `system_prompts`, usage, routing, compression locks, turn leases and FTS indexes. | Default resume/export guard is **20,000 active messages**, configurable or disableable. Compression creates archive/lineage semantics that callers must follow. Schema/API is broad and internal. | **WRAP** SessionDB APIs read-only where possible. Store AGK orchestration state in an AGK-owned store keyed by Hermes `session_id`; do not extend core tables casually. |
| **Gateway routing/session state — WIRED** | `gateway/session.py::{SessionSource,SessionEntry,SessionStore,AsyncSessionStore,build_session_key}`; single-flight creation, reset/resume/CAS compression advance and transcript retries. `gateway/session_state.py::{TurnState,ConversationState,PersistentState,SessionState}` scopes process state. | `gateway_routing` in `state.db` is authoritative; `sessions.json` is a legacy routing mirror. Despite the `SessionStore` class docstring, transcript JSONL fallback is gone: without SQLite, transcript append/load becomes no-op/empty. `GatewayRunner._sessions` entries are explicitly never evicted. | **REUSE** routing, but require DB health. Do not treat the JSON mirror as transcript durability. |
| **Gateway AIAgent cache — WIRED/BOUNDED** | `gateway/run.py::TurnRunner.run` reuses agents by configuration signature; default LRU cap **128**, idle TTL **1 hour**. Pressure controls live in `gateway/agent_cache_pressure.py`. | Cached agents pin complete live transcripts. Pressure measurement is best on Linux/cgroups; eviction requires persistence to be caught up. Signature changes, cross-process message-count changes and dead sessions invalidate entries. | **REUSE**; AGK should not add a second agent-object cache. |
| **Lifecycle handling — WIRED, MULTIPLE SEMANTICS** | Agent: `AIAgent.close/release_clients`; turn: `finalize_turn`; CLI: `cli.py::{_run_cleanup,_finalize_single_query}`; true plugin boundary: `hermes_cli/lifecycle.py::finalize_session`; gateway: `GatewayRunner.start/stop`, `_finalize_session_off_loop`; crash evidence: `gateway/lifecycle_ledger.py::{record_startup,mark_exited}`. | **Critical naming trap:** `on_session_end` is emitted by `turn_finalizer.py` at the end of every `run_conversation` call—effectively every turn. Actual conversation closure is `on_session_finalize`; gateway bounds it at 10 seconds off-loop but cannot kill a wedged worker thread. Lifecycle-ledger memory/OOM sampling is Linux-only and heuristic. | **ADAPT** into one AGK lifecycle vocabulary. Treat `on_session_finalize`, not `on_session_end`, as the durable session boundary. |
| **Python plugins/hooks/middleware — WIRED, TRUSTED CODE** | `hermes_cli/plugins.py::{PluginManager,PluginContext,invoke_hook,invoke_middleware}`; managers are cached per resolved Hermes home. Four middleware kinds in `hermes_cli/middleware.py`: `llm_request`, `llm_execution`, `tool_request`, `tool_execution`. Relevant hooks include pre/post LLM/API/tool, transforms, stream hooks, session hooks and `pre_gateway_dispatch`. | Plugins are opt-in and discovered from bundled/user/project/pip sources. `hermes_cli/plugin_capabilities.py` explicitly says this is **not a sandbox**. Most hooks are synchronous on the caller; errors are isolated but slow callbacks block. Middleware can rewrite provider requests/tool arguments and therefore can violate cache or safety invariants. `pre_gateway_dispatch` runs before auth and receives the gateway object. | **EXTEND** through a small, audited pip plugin. Use middleware only for necessary policy interception; use observers for telemetry. |
| **Shell hooks — WIRED, OPT-IN SUBSET** | `agent/shell_hooks.py::{register_from_config,ShellHookRunner}` registers through the plugin manager. | Requires consent/allowlisting; `shell=False`, default timeout 10s, output cap 64 KiB. Runs synchronously. `transform_api_error_classification` is Python-plugin-only because its directive cannot be represented by the shell protocol. | **DEFER** for AGK. Suitable for trusted local automation, not a control-plane protocol. |
| **Outbound lifecycle webhooks — WIRED, BEST-EFFORT** | `agent/outbound_webhooks.py::{register_from_config,OutboundWebhookDispatcher}`; startup wiring in `cli.py` and `gateway/run.py`. Optional bearer and HMAC support. | Single daemon worker, queue cap **256**, default timeout **10s**, max **2 attempts**. No durable outbox, acknowledgment ledger or replay; full hook payload may contain sensitive user/tool/model data. | **ADAPT** for non-authoritative notifications only. Do not use as AGK’s source-of-truth event transport. |
| **Gateway `HOOK.yaml` registry — WIRED, GATEWAY-ONLY** | `gateway/hooks.py::HookRegistry`; reads `$HERMES_HOME/hooks/<name>/{HOOK.yaml,handler.py}`. Emits gateway/session/agent/command events; command hooks can deny/handle/rewrite. | No built-in handlers. Handlers run sequentially inline with no timeout. `HOOKS_DIR` is resolved as a module-level constant, not per multiplexed-profile turn. This registry is separate from the profile-scoped Python plugin manager. | **DEFER**. Prefer the general plugin API for AGK; use only for simple local gateway customization. |
| **Actual streaming callbacks/plugin observers — WIRED** | Gateway callback fan-out in `gateway/run.py::TurnRunner.run` to `gateway/stream_consumer.py::GatewayStreamConsumer`. Agent observer delivery in `agent/plugin_stream_hooks.py`; producers in `run_agent.py` emit `on_stream_start/delta/end` and `on_interim_message`. | Per-callback queue size **1,024**, daemon thread per callback, drop-oldest under pressure. Reasoning deltas require explicit opt-in. Delivery is observational and non-durable. | **ADAPT** for AGK live UI/status only, never lifecycle authority. |
| **Typed gateway stream-event contract — PARTIAL, NOT PRODUCTION-WIRED** | Dataclasses in `gateway/stream_events.py`; renderer hooks in `gateway/platforms/base.py`; `gateway/stream_dispatch.py::GatewayEventDispatcher`; unit tests in `tests/gateway/test_stream_events.py`. | Current production static scan found **no `MessageChunk(...)` construction** and `GatewayEventDispatcher` is referenced only in its own module. Production still wires loose callbacks directly to `GatewayStreamConsumer`. Comments describe the desired design more fully than current wiring implements. | **DEFER** until the producer/dispatcher path is actually connected; do not base AGK protocol on it yet. |
| **Monitoring/OTLP plane — WIRED, OPT-IN HEALTH ONLY** | `agent/monitoring/events.py` defines only `GatewayHealthEvent`, `GatewayDiagnosticEvent`, `CronExecutionEvent`; `agent/monitoring/emitter.py::MonitoringEmitter`; gateway producer/export in `gateway_health.py` and `gateway_health_export.py`. | Disabled until a subscriber attaches; queue cap **10,000**, drop-oldest, no persistence. Gateway export defaults off. It deliberately excludes prompts, session content and usage—and does **not** provide agent-turn/tool/compression telemetry. | **REUSE** for infrastructure health. It is not an AGK execution-event plane. |
| **Plugin event bus/direct callback — IMPLEMENTED BUT NOT A CORE BUS** | `PluginContext.emit/subscribe` in `hermes_cli/plugins.py`; queue cap **64**, recursion depth **8**, plugin-owned namespaces. `AIAgent.event_callback` emits `session:compress` from `conversation_compression.py` and `codex_runtime.py`; gateway bridges that into `HookRegistry`. | `hermes:` is reserved, but no production core emitter was found for that namespace. Inter-plugin events are process-local, best-effort and non-durable. `event_callback` currently exposes essentially compression, not a complete runtime taxonomy. | **NEW** AGK durable, versioned event envelope/outbox; adapt selected Hermes hooks and callbacks into it. |

## Highest-impact conclusions for AGK

1. **Do not replace the core loop, prompt builder, session DB, gateway routing, compression, or agent cache.** They are heavily integrated and already expose usable seams.
2. **Use an external wrapper plus one trusted pip plugin.**
   - Wrapper: process/session ownership, durable AGK state, normalized results.
   - Plugin: selected lifecycle observers and middleware policy enforcement.
3. **Build a new AGK event plane.** Existing hooks, callback queues, webhooks and monitoring are best-effort and semantically fragmented. A durable AGK event should include an event ID, profile, session/turn/API/tool correlation IDs, sequence, timestamp, type, payload version and delivery state.
4. **Map lifecycle carefully:** `on_session_end` means per-turn completion; `on_session_finalize` means actual session boundary.
5. **Preserve prompt-cache invariants:** immutable system prompt/toolset/history within a session; put dynamic AGK context in the current user-message sidecar or request-only context selection.
6. **Do not adopt the typed gateway stream contract yet.** It is a partially integrated design scaffold, not the active producer path.
7. **No `REPLACE` recommendation is justified by current evidence.** Missing higher-control-plane functionality belongs in AGK as **NEW/WRAP/ADAPT**, not invasive Hermes changes.

## Files and issues

- **Files created or modified by this audit:** none.
- `git diff --name-only` is empty.
- Current status contains `?? agk-upgrade/`, which appeared as concurrent/unrelated workspace state and was not touched.
- Main source-audit caveat: implementation was statically traced, not runtime-tested.