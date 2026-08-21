# Hermes Runtime Map

## Agent runtime

`run_agent.py::AIAgent` owns conversation execution, interruption, provider fallback, tool invocation, callback integration, usage and persistence. Important methods include `run_conversation`, `_invoke_tool`, `interrupt` and `_try_activate_fallback`.

Provider-specific message conversion is separated through transports under `agent/transports`, including `ProviderTransport`, `ChatCompletionsTransport`, `AnthropicTransport` and `BedrockTransport`.

## Session runtime

`hermes_state.py::SessionDB` stores Sessions and messages. `hermes_state_common.py::SCHEMA_SQL` defines lineage, usage, gateway routing, compression locks, turn leases and async delegation records. The TUI and desktop use `tui_gateway` JSON-RPC methods for Session lifecycle.

## Process and environment runtime

`tools/environments/base.py::BaseEnvironment` defines common command execution. Implementations cover local, Docker, SSH, Singularity, Modal, Daytona and Vercel Sandbox, plus test or specialized implementations recorded in the static inventory.

## Runtime events

Progress reaches surfaces through AIAgent callbacks, plugin hooks, gateway stream events, JSON-RPC events, logs and trajectories. No single stable AGK event envelope exists.

## Capabilities suitable for AGK

- agent execution
- model transport and fallback
- Tool calls
- Skills and MCP
- bounded AgentCalls
- process interruption
- Session history
- execution backends
- streaming callbacks

## Required adapter additions

- AGK Agent, Mission, Task, Session and Run correlation
- capability negotiation
- whole-process sandbox declaration
- Budget and authorization decisions
- Context Manifest binding
- normalized semantic events and loss report
- checkpoint and recovery contract

Hermes remains an AgentRuntime. AGK Runtime remains the physical supervisor and canonical execution authority.

## Lifecycle and event caveats

`on_session_end` is emitted by turn finalization and behaves as a per-turn boundary. Actual conversation closure uses `on_session_finalize` through `hermes_cli/lifecycle.py`. The adapter must map these separately.

Typed gateway stream events exist, but independent source tracing found the producer and dispatcher path only partially wired. Plugin observers, monitoring, outbound webhooks and stream queues are best-effort and may drop data. AGK therefore needs a durable event plane and cannot treat any one Hermes callback family as complete lifecycle truth.
