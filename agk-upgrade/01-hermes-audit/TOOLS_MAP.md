# Hermes Tools Map

## Registry

`tools/registry.py::ToolRegistry` owns Tool entries and dispatch. `register`, `get_definitions` and `dispatch` provide registration, availability filtering and execution. `discover_builtin_tools` statically identifies modules with top-level registrations. `model_tools.py::get_tool_definitions` resolves toolsets and dynamically removes references to unavailable Tools.

The pinned static census finds 92 literal built-in registrations. MCP and plugin Tools are runtime-discovered and not included in that number.

## Major families

- terminal and process management
- file read, write, patch and search
- browser and CDP automation
- web search and extraction
- image, video, vision, audio and speech
- Skills and Memory
- Sessions, todo and delegation
- cron and kanban
- desktop UI and preview control
- messaging and external services
- programmatic Tool RPC through `execute_code`

## Toolsets

`toolsets.py` groups Tool names by session purpose. Toolset resolution controls model schema footprint. Surface-specific Tools belong to session source toolsets rather than process environment gates.

## Security

`tools/approval.py` detects dangerous command patterns and requests consent. `agent/tool_guardrails.py` provides bounded call caps. Both are defense in depth. `SECURITY.md` explicitly denies that they are containment.

## AGK use

REUSE implementations and schemas where adequate. Every exposed Tool receives an AGK Tool id, risk floor, binding and authorization decision. Runtime availability through `check_fn` does not grant permission. Tool calls normalize into AGK ToolCall Spans with idempotency and side-effect disposition.

## Material integration blockers

- `tools/code_execution_tool.py:1079-1083` and `1336-1341` fall back to all seven nested RPC Tools when the Session intersection is explicitly empty. Governed mode must fail closed.
- `tools/process_registry.py:3002-3126` scopes listing but controls a known process by Session id without an owner-principal recheck. AGK binds process handles to an unforgeable Session principal.
- `ToolRegistry` availability probes can retain a last-known-good true result briefly after failure. Availability is never revocation or authorization.
- foreground terminal exception retry can repeat a command after a partial side effect. AGK reconciliation requires idempotency or an honest unknown disposition.
- remote PTY claims and implementation differ in the audited snapshot. Capability negotiation must use tested behavior rather than schema prose.
