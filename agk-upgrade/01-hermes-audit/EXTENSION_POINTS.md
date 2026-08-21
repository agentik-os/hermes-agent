# Hermes Extension Points

## Agent and runtime

- `PluginManager` hooks and middleware
- Tool registry and service-gated Tools
- MemoryProvider and ContextEngine ABCs
- model-provider plugins
- SubagentLifecycleService
- terminal Environment ABC
- scheduler providers
- secret-source and egress providers

## Capability transports

- MCP servers
- Skills and Skill sources
- gateway platform adapters
- browser, web-search, media and model provider plugins
- portable Agent Plugin subset

## Product surfaces

- desktop contribution registry for panes, routes, sidebar, titlebar, status bar, palette, keybinds, themes, composer and transcript directives
- scoped desktop and dashboard plugin backend APIs
- dashboard extension system
- TUI widgets
- CLI plugin commands
- ACP protocol

## Best AGK seams

1. AgentRuntime through gateway or dedicated adapter service.
2. external effect broker for authorization; in-process middleware supplies observation and defense in depth only.
3. MemoryProvider for governed Memory access.
4. provider registry for approved model routes.
5. MCP and Tool registry for capability bindings.
6. desktop contributions for Runtime-console prototypes and evidence-backed extraction candidates.

## Missing or uncertain seams

- neutral behavior extraction from the Electron Runtime console
- durable subagent reconnection after process restart
- scheduler execution without a second job authority
- complete checkpoint portability
- guaranteed full-fidelity event mediation for every model and Tool call

These require spikes and behavior tests before any direct core modification.

The desktop public SDK can contribute a layout preset but cannot programmatically apply one. The internal resolver already exists at `apps/desktop/src/store/pane-focus.ts`. A transition prototype may expose that action generically, but canonical AGK surface switching belongs in AGK Web and Tauri and must not depend on this seam.

General Python hooks are sequential and normally unbounded by deadline. AGK policy middleware must be small, audited, bounded and fail closed where it authorizes an effect.
