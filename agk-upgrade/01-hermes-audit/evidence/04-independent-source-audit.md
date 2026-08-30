## Outcome

- Audited Hermes Agent at commit `8794e5a21c980a0f26532cb4883284b786cb3f25` on branch `agk/upgrade-architecture`.
- **Primary AGK decision:** build AGK as an upstream-compatible, unified external plugin package, not a Hermes core fork. Use Hermes’s CLI/skill, plugin, MCP, profile, and authenticated API seams in that order.
- Verified **37 native plugin hooks** and **99 shipped `plugin.yaml` manifests**.

## Plugin and extension architecture

### Native Python plugins

- Kinds are `standalone`, `backend`, `exclusive`, `platform`, and `model-provider`; manifest v2 adds advisory dependencies, config schema, capabilities, and metadata (`hermes_cli/plugins.py:625-924`, `hermes_cli/plugins.py:1036-1111`).
- General discovery order is:
  1. bundled,
  2. `$HERMES_HOME/plugins`,
  3. project `.hermes/plugins` only with `HERMES_ENABLE_PROJECT_PLUGINS`,
  4. pip entry points under `hermes_agent.plugins`.
  
  Winners are last-source-wins by path-derived key (`hermes_cli/plugins.py:3880-4029`, `hermes_cli/plugins.py:4081-4130`, `hermes_cli/plugins.py:4192-4444`).
- Activation policy:
  - `plugins.disabled` always wins.
  - Bundled backends auto-load.
  - Bundled platforms are deferred until first use.
  - Exclusive providers and model providers use their own loaders.
  - Everything else requires `plugins.enabled`.
  - Safe mode skips all plugin loading (`hermes_cli/plugins.py:3773-3813`, `hermes_cli/plugins.py:3938-4029`).
- `PluginContext` exposes namespaced config/state, host-owned LLM calls, supervised tasks/unload, approval transports, tools, CLI/slash commands, MCP calls, message injection, provider registries, platform adapters, auxiliary tasks, prompt sections, event bus, middleware, and plugin skills (`hermes_cli/plugins.py:1393-3386`).
- Registrations are ownership-ledgered and unwound in reverse order on unload/reload; profile overlays are identity-conditional (`hermes_cli/plugins.py:3393-3741`).
- Tool replacement is capability-gated and profile-scoped; ordinary cross-toolset shadowing is rejected (`tools/registry.py:426-467`, `tools/registry.py:572-856`).

### Specialized provider loaders

- **Memory:** exactly one active provider, selected by `memory.provider`. Source behavior is **bundled-first**, then user, project, and entry point; first seen wins (`plugins/memory/__init__.py:1-30`, `plugins/memory/__init__.py:124-158`, `plugins/memory/__init__.py:322-366`). Memory lifecycle is defined by `MemoryProvider` (`agent/memory_provider.py:104-404`).
- **Model providers:** pip entry points are lowest precedence, followed by bundled, user, and legacy modules; registration is last-writer-wins, so user profiles override bundled profiles (`providers/__init__.py:56-67`, `providers/__init__.py:149-342`).
- **Context engines:** separate, single-select loader; the dedicated directory loader currently scans bundled `plugins/context_engine` only (`plugins/context_engine/__init__.py:1-17`, `plugins/context_engine/__init__.py:33-97`). The interface is `ContextEngine` (`agent/context_engine.py:89-489`).
- Shipped backend categories include platform, image/video generation, web search, browser, dashboard auth, TTS/STT, secrets, cron, and standalone integrations. Their generic registration methods are in `hermes_cli/plugins.py:2210-3068`.

### Other plugin surfaces

- **Portable Agent Plugins v1:** `plugin.json` packages may contribute validated, path-contained skills and MCP servers but import no Python code (`hermes_cli/agent_plugins.py:21-76`, `hermes_cli/agent_plugins.py:97-155`, `hermes_cli/agent_plugins.py:192-252`, `hermes_cli/agent_plugins.py:310-547`; loader at `hermes_cli/plugins.py:4912-4962`).
- **Desktop:** bundled plugins plus two runtime doors:
  - `$HERMES_HOME/desktop-plugins/<id>/plugin.js`
  - `$HERMES_HOME/plugins/<id>/desktop/plugin.js`
  
  Unified-package desktop halves default off; standalone desktop plugins default on. Bundled copies beat stale disk duplicates. Reload/unload is disposer-based and hot-watched (`apps/desktop/src/contrib/plugins.ts:1-84`, `apps/desktop/src/contrib/runtime-loader.ts:1-29`, `apps/desktop/src/contrib/runtime-loader.ts:102-209`, `apps/desktop/src/contrib/runtime-loader.ts:211-509`). Runtime plugins execute with full renderer authority; integrity is not sandboxing.
- **Dashboard:** separate `dashboard/manifest.json` + JS registry. Backend `plugin_api.py` routers mount under `/api/plugins/<name>`; project-plugin Python APIs are refused, and user APIs require enablement (`hermes_cli/web_server.py:17901-18025`, `hermes_cli/web_server.py:18538-18649`; frontend loader `web/src/plugins/usePlugins.ts:1-180`).
- **TUI widgets:** sorted `$HERMES_HOME/tui-widgets/*.mjs`, cache-busted hot load, automatic slash registration, deletion-aware unload (`ui-tui/src/sdk/userWidgets.ts:21-213`).
- **Gateway hooks:** `HOOK.yaml` + `handler.py`, exact/wildcard event matching, fail-open handler isolation (`gateway/hooks.py:1-38`, `gateway/hooks.py:54-229`).
- **Shell hooks:** config-driven subprocess hooks share native hook dispatch, require explicit consent, run with `shell=False`, have bounded timeouts, and can fail closed only for `pre_tool_call` (`agent/shell_hooks.py:1-79`, `agent/shell_hooks.py:247-330`, `agent/shell_hooks.py:372-523`).

## Lifecycle and CLI hooks

- The 37 native hooks are grouped as:
  - Tool/LLM/API: `pre_tool_call`, `post_tool_call`, `transform_terminal_output`, `transform_tool_result`, `transform_llm_output`, `pre_llm_call`, `post_llm_call`, `pre_verify`, `pre_api_request`, `post_api_request`, `api_request_error`, `transform_api_error_classification`, `pre_transcription`.
  - Streaming: `on_stream_start`, `on_stream_delta`, `on_stream_end`, `on_interim_message`.
  - Session/skill/subagent: `on_session_start`, `on_session_end`, `on_session_finalize`, `on_session_reset`, `on_skill_lifecycle`, `subagent_start`, `subagent_stop`.
  - Gateway/control: `pre_gateway_dispatch`, `gateway_platform_event`, `pre_approval_request`, `post_approval_response`, `pre_command`.
  - Kanban: claimed/completed/blocked, worker spawned/exited/stale, task updated, dispatch tick.
  
  Canonical list and payload contracts: `hermes_cli/plugins.py:161-387`.
- Ordinary hook dispatch is sequential, signature-filtered for additive compatibility, exception-isolated, and generally **has no timeout** (`hermes_cli/plugins.py:5077-5147`).
- Streaming observers use per-consumer bounded queues with drop-oldest behavior, keeping plugin code off the token path (`agent/plugin_stream_hooks.py:15-146`).
- Inter-plugin events are forced into the emitter’s namespace, deep-copied per subscriber, queued on one bounded worker, and recursion-capped (`hermes_cli/plugins.py:3218-3290`, `hermes_cli/plugins.py:5249-5344`).
- Mutating middleware is separate from observer hooks: `tool_request`, `tool_execution`, `llm_request`, and `llm_execution` (`hermes_cli/middleware.py:17-34`, `hermes_cli/middleware.py:77-224`).
- Top-level plugin commands use `ctx.register_cli_command`; in-session commands use `ctx.register_command` and reject built-in conflicts (`hermes_cli/plugins.py:2066-2172`). Argparse performs plugin discovery only on unknown-command paths, so plugin subcommands intentionally do not appear in ordinary top-level `--help` (`hermes_cli/main.py:11590-11732`, `hermes_cli/main.py:12890-12937`).

## Config and profile architecture

- Canonical home resolution is: context-local override → `HERMES_HOME` → platform default (`hermes_constants.py:30-50`, `hermes_constants.py:114-151`).
- `--profile` is pre-parsed and stripped before imports so import-time paths resolve correctly (`hermes_cli/main.py:512-694`).
- Three materially different loaders exist:
  - `load_config`: `DEFAULT_CONFIG` → user YAML deep merge → normalization/env interpolation → administrator managed overlay, with cache and last-known-good fallback (`hermes_cli/config.py:3422-3459`, `hermes_cli/config.py:3614-3769`).
  - `load_cli_config`: independent CLI defaults plus user config or repo `cli-config.yaml` fallback, then managed overlay and config-to-env bridges (`cli.py:411-786`).
  - Gateway: `gateway.json` legacy base → direct raw YAML mapping → managed overlay → environment overrides (`gateway/config.py:1309-1822`).
- Raw config reads are explicitly restricted to write-back, diagnostics, or presence-sensitive bridges (`hermes_cli/config.py:3278-3324`). Writes are guarded, atomic, strip schema defaults, and refuse managed leaves (`hermes_cli/config.py:3372-3419`, `hermes_cli/config.py:3847-3960`).
- Profiles are point-in-time islands, not live inheritance. Clone modes copy config/skills or full state once (`hermes_cli/profiles.py:1075-1265`). Names and roots are constrained at `hermes_cli/profiles.py:271-387`.
- Multiplexing uses context-local home plus a fail-closed secret scope; a scoped secret miss never falls through to another profile’s process environment (`agent/secret_scope.py:1-21`, `agent/secret_scope.py:132-186`). Bare worker threads do not inherit the override (`tests/test_profile_isolation_runtime.py:114-159`).
- Plugin managers and tool overlays are keyed by resolved profile home (`hermes_cli/plugins.py:3396-3460`, `hermes_cli/plugins.py:5584-5665`, `tools/registry.py:426-467`).
- Important exception: provider `auth.json` state and credential pools have a deliberate **read-only global-root fallback per provider** when a profile has no local entry; profile writes remain local and local entries shadow global (`hermes_cli/auth.py:1069-1151`, `hermes_cli/auth.py:1403-1476`, `hermes_cli/auth.py:1601-1645`).

## MCP

- Runtime supports stdio, Streamable HTTP, and SSE; URL wins if both URL and command exist. It also negotiates legacy handshake vs 2026 stateless protocol (`tools/mcp_tool.py:1-84`, `tools/mcp_tool.py:2349-2549`, `tools/mcp_tool.py:2996-3171`, `tools/mcp_tool.py:3379-3657`).
- Native config and portable-package MCP servers merge at startup; explicit `mcp_servers` config wins collisions (`tools/mcp_tool.py:5383-5544`).
- Current tool naming is `mcp__<server>__<tool>`, not the old single-underscore form (`tools/mcp_tool.py:6434-6486`). Per-server toolsets support include/exclude globs, capability-gated prompt/resource utilities, collision refusal, and lazy schema-cache startup (`tools/mcp_tool.py:6489-6725`, `tools/mcp_tool.py:6751-7156`).
- Servers connect in parallel on a dedicated event loop; reconnects are bounded, failed servers park and self-probe, and tool calls have a circuit breaker (`tools/mcp_tool.py:3721-4125`, `tools/mcp_tool.py:4281-4450`, `tools/mcp_tool.py:7224-7522`).
- Security includes filtered stdio environments, error redaction, save-time and spawn-time malicious command checks, OSV preflight, untrusted-server write approval, redirect credential stripping, and hard result caps (`tools/mcp_tool.py:709-748`, `hermes_cli/mcp_security.py:1-24`, `hermes_cli/mcp_security.py:121-177`, `tools/mcp_tool.py:2996-3060`, `tools/mcp_tool.py:4286-4450`).
- OAuth is OAuth 2.1/PKCE with DCR/CIMD support, loopback or dashboard-mediated callbacks, and profile-local `mcp-tokens/` storage (`tools/mcp_oauth.py:192-304`, `tools/mcp_oauth.py:456-722`, `tools/mcp_oauth.py:1439-1621`, `tools/mcp_oauth.py:1879-1956`). Manager state is keyed by `(Hermes home, server)` and supports disk refresh/401 recovery (`tools/mcp_oauth_manager.py:560-624`, `tools/mcp_oauth_manager.py:759-882`).
- Catalog entries live under `optional-mcps`, support stdio/HTTP, API-key/OAuth/none auth, optional git bootstrap, tool defaults, and suggestions (`hermes_cli/mcp_catalog.py:1-25`, `hermes_cli/mcp_catalog.py:59-348`). Installation is profile-aware and discovery-first (`hermes_cli/mcp_catalog.py:438-582`, `hermes_cli/mcp_catalog.py:776-861`).
- CLI surface: add/remove/list/test/configure/login/reauth/catalog/install/serve (`hermes_cli/subcommands/mcp.py:15-126`, `hermes_cli/mcp_config.py:438-640`, `hermes_cli/mcp_config.py:810-982`, `hermes_cli/mcp_config.py:987-1158`).
- `hermes mcp serve` exposes conversation read/send, attachments, event polling, channels, and approval control over stdio (`mcp_serve.py:623-1022`).

## Auth and API surfaces

- Provider credentials live in profile `auth.json`, protected with cross-process locking and atomic `0600` writes (`hermes_cli/auth.py:1043-1400`). Credential pools preserve concurrent additions and cooldown state (`hermes_cli/auth.py:1601-1779`).
- Plugin capabilities are consent/audit gates, **not a sandbox** (`hermes_cli/plugin_capabilities.py:1-51`, `hermes_cli/plugin_capabilities.py:77-134`, `hermes_cli/plugin_capabilities.py:233-267`).
- Dashboard auth is an ABC supporting OAuth sessions, password sessions, and exact-route bearer-token principals (`hermes_cli/dashboard_auth/base.py:105-270`). Registries are profile-scoped overlays (`hermes_cli/dashboard_auth/registry.py:21-122`).
- Non-loopback dashboard binds always require an auth provider; loopback uses an ephemeral session token. Host-header checks, cookie auth, exact token routes, and single-use WS tickets are separate gates (`hermes_cli/web_server.py:481-660`, `hermes_cli/dashboard_auth/middleware.py:1-15`, `hermes_cli/dashboard_auth/token_auth.py:1-37`, `hermes_cli/dashboard_auth/ws_tickets.py:1-29`).
- The gateway API server exposes OpenAI-compatible chat/responses plus sessions, runs, jobs, capabilities, and profile-prefixed mirrors (`gateway/platforms/api_server.py:1-38`, `gateway/platforms/api_server.py:2061-2113`). It requires a non-placeholder `API_SERVER_KEY` of at least 16 characters even on loopback (`gateway/platforms/api_server.py:7396-7434`).
- `hermes proxy` is a credential-attaching forwarder, not an authenticated ingress proxy: it accepts any client bearer and replaces it with host OAuth credentials. Keep it loopback-only (`hermes_cli/proxy/server.py:1-10`, `hermes_cli/proxy/server.py:88-145`, `hermes_cli/proxy/cli.py:53-63`).

## AGK reuse/extension decisions

1. **Package AGK as one native external plugin repo** with `plugin.yaml`/`register(ctx)`, optional `desktop/plugin.js`, `dashboard/manifest.json`/`plugin_api.py`, and bundled skills. Use Portable Agent Plugins only for skill+MCP-only distributions.
2. **Control plane:** implement `hermes agk …` via `ctx.register_cli_command` plus a skill; use `ctx.register_command` only for conversational shortcuts.
3. **Tool plane:** extend an existing tool or use a service-gated plugin tool. Put external structured integrations behind MCP and propose catalog inclusion only when broadly reusable. Do not add permanent core tools.
4. **State/config:** store behavior under `plugins.entries.<agk-id>.settings`, durable state through `ctx.state`, credentials in `.env`, and never add non-secret `HERMES_*` settings.
5. **Profiles:** treat every profile as independently configured. Resolve paths through `get_hermes_home`, propagate ContextVars into threads/tasks, and require an explicit shared store if AGK truly needs cross-profile state.
6. **Lifecycle:** register all resources through `PluginContext`, use `on_unload`/`spawn_task`, keep ordinary hooks non-blocking, and use queued event/stream surfaces for high-frequency observation.
7. **Prompt/cache:** prefer ephemeral `pre_llm_call` user-message context. Use bounded system-prompt sections only when static for a session; never swap toolsets or prompt bytes mid-conversation.
8. **UI:** use the unified desktop half and scoped `/api/plugins/<id>` backend. Avoid the older dashboard SDK unless web-dashboard support is explicitly required; the desktop and dashboard SDKs are unrelated.
9. **Auth/API:** reuse host-owned `ctx.llm`, dashboard auth middleware, and exact token-route seams. Do not expose a bespoke unauthenticated control API or bind `hermes proxy` publicly.

## Issues / files

- **No files modified by this audit.**
- A concurrent/untracked `agk-upgrade/` directory appeared in the worktree; it was not created or touched by this audit. No tracked diff exists.
- Source/doc drift found:
  - `website/docs/user-guide/features/plugins.md:146` says user memory providers override bundled ones, but current source is explicitly bundled-first.
  - The local Hermes skill’s native-MCP reference still documents old `mcp_<server>_<tool>` names and omits several current transports/lifecycle features; source uses `mcp__<server>__<tool>`.
- General Python hook callbacks lack universal deadlines; AGK must not place blocking work directly on those paths.