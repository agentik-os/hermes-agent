# Hermes Architecture Map

## Entry points

- classic CLI: `cli.py::HermesCLI`
- command entry: `hermes_cli/main.py`
- TUI frontend and backend: `ui-tui` and `tui_gateway/server.py`
- native desktop: `apps/desktop`, using `apps/shared` gateway client
- dashboard and headless server: `hermes_cli/web_server.py`, `web`
- messaging: `gateway/run.py::GatewayRunner`
- editor integration: `acp_adapter`
- batch execution: `batch_runner.py`

## Core execution path

```text
surface input
-> AIAgent.run_conversation
-> agent/system_prompt.py builds prompt tiers
-> hermes_cli/runtime_provider.py resolves provider
-> model transport call
-> tool calls through AIAgent._invoke_tool
-> model_tools.handle_function_call
-> ToolRegistry.dispatch
-> result appended and loop continues
-> final response and messages persist to SessionDB
```

Key source symbols are `run_agent.py::AIAgent`, `model_tools.py::get_tool_definitions`, `model_tools.py::handle_function_call`, `tools/registry.py::ToolRegistry` and `hermes_state.py::SessionDB`.

## State authority

- `state.db`: runtime sessions, messages, routing metadata and usage
- `projects.db`: named multi-folder Hermes workspaces
- `kanban.db` or board databases: durable work queue
- `$HERMES_HOME/cron/jobs.json`: scheduled jobs
- profile files: config, secrets references, Skills, Memory and plugin state
- Electron: machine and process facts
- renderer: window presentation only

These are valid Hermes authorities and must not be mistaken for AGK Organization, Project or object graph truth.

## Extension architecture

General plugins register Tools, hooks, middleware, CLI commands and state through `hermes_cli/plugins.py`. Specialized registries cover model providers, Memory providers, Context Engines, browser providers, platform adapters and desktop contributions. MCP contributes Tools dynamically. Each extension family has its own contract and should not be treated as one universal plugin API.

## Narrow waist

Hermes keeps one core agent loop and pushes capability to Tool, Skill, provider, gateway and UI edges. AGK should preserve that shape by placing product ontology above the runtime adapter rather than inside `AIAgent`.
