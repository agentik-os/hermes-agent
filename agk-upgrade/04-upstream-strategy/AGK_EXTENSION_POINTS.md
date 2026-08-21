# AGK Extension Points

## Preferred Hermes seams

| Need | Hermes seam | AGK use |
|---|---|---|
| Agent execution | `run_agent.py::AIAgent` through gateway or adapter service | `HermesRuntimeAdapter` |
| Tool observation | `hermes_cli/plugins.py` hooks and middleware | event capture and defense in depth, never sole authorization |
| Tool implementation | `tools/registry.py::ToolRegistry`, MCP | Tool bindings |
| Memory | `agent/memory_provider.py::MemoryProvider` | governed AGK Memory provider |
| Providers | provider plugin registry and `hermes_cli/runtime_provider.py` | provider wire compatibility behind the external model broker |
| Subagents | `agent/subagent_lifecycle.py` | bounded AgentCalls |
| Scheduling | `cron/scheduler_provider.py` | trigger provider when single authority is proven |
| Messaging | gateway platform adapter contract | Communication Adapter |
| CLI | plugin CLI registration | developer and operator commands |
| Desktop | contributions, routes, panes, titlebar, palette and scoped plugin API | Runtime-console prototypes and behavior extraction only |
| Web | dashboard extension registry | bounded management views |
| Context | ContextEngine and prompt assembly inputs | Context Manifest adapter |
| Secrets | secret source plugins and egress controls | brokered reference resolution |
| Events | plugin hooks, callbacks and gateway events | normalized AGK event input |

## Missing generic seams to evaluate

- neutral behavior extraction contract for gateway, terminal and object inspection
- durable external subagent reconnection
- scheduler execution without a second canonical job store
- complete pre-model and post-model accounting with immutable correlation ids
- runtime checkpoint and resume contract independent of SessionDB internals

A missing seam is not automatically a patch request. The implementation task must first prove it cannot be expressed through the current public API.

The canonical AGK product shell lives in AGK Web and Tauri. No missing Hermes Desktop seam is a reason to move product ownership into Electron.
