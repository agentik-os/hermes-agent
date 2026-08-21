# 009. HermesRuntimeAdapter

**Priority:** P0

**Repository target:** standalone AGK Hermes adapter package plus AGK Runtime integration, not Hermes product code

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the pinned Hermes baseline behind AgentRuntime without moving AGK truth into Hermes stores.

## Why it exists

Hermes provides the execution foundation AGK should leverage.

## Hermes capabilities reused

- AIAgent
- tui_gateway
- provider plugins
- Tool registry
- Skills
- MCP
- SessionDB runtime history

## Files inspected

- run_agent.py
- model_tools.py
- hermes_state.py
- `tui_gateway/server.py`
- `hermes_cli/plugins.py`

## Files to create

- standalone `agk_hermes_runtime/adapter.py`
- standalone `agk_hermes_runtime/capabilities.py`
- standalone `agk_hermes_runtime/event_normalizer.py`

## Files to modify

- None.

## Schemas

- HermesRuntimeProfile
- HermesSessionBinding
- TraceLossReport

## Interfaces

- AgentRuntime implementation
- health probe
- event stream
- all operations declared by task 008

## API impact

Implements task 008 contract.

## Migration impact

Pin baseline and reject unsupported persisted formats with explicit migration.

## Tests

- real AIAgent smoke run with fake provider
- session correlation
- tool event normalization
- crash and restart
- prompt cache stability
- `on_session_end` maps to turn completion and `on_session_finalize` maps to real Session closure
- observer queue loss produces an explicit TraceLossReport
- auxiliary model calls are accounted even when they bypass main lifecycle hooks
- provider-native app-server Tools are disabled unless the authorization path is proven
- ContextEngine fail-open is caught by an outer signed Manifest check

## Acceptance criteria

- No direct AGK domain import of AIAgent
- Every Run carries AGK ids
- Unmapped fields produce loss report
- Adapter can be removed cleanly
- Typed gateway stream events are not assumed available until the producer path is behavior-tested
- Four plugin registrations alone are not accepted as proof of complete mediation
- guest starts only after signed bundle, sandbox, supervisor, brokers, Context adapter and event journal pass

## Risks

- Hook coverage may be incomplete
- Ordinary hook callbacks may block without a deadline
- Direct use of SessionDB as AGK truth

## Dependencies

- `008`
- `010`
- `011`
- `012`
- `013`
- `027`
- `031`
- `032`
- `033`
- `034`
- `035`
- `036`
