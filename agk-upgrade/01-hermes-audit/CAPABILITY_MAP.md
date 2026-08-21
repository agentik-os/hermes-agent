# Hermes Capability Map

**Baseline:** `8794e5a21c980a0f26532cb4883284b786cb3f25`

The static census in `REPOSITORY_INVENTORY.json` records 9,938 tracked files, 92 literal built-in Tool registrations, 36 bundled model-provider directories, 22 platform directories, eight Memory provider directories, eight concrete environment classes and 3,243 Python test files. Dynamic MCP and user plugin Tools are intentionally not counted as built-ins.

## Capability decisions

Two axes are mandatory. `mechanics_disposition` says whether existing Hermes implementation mechanics are reused, adapted or deferred. `agk_strategy` says how the complete mapped AGK capability is delivered. `maps_to` binds those axes to `agk-upgrade/agk-hermes-map.yaml`. For example, Agent-loop mechanics are REUSE while the AGK Agent capability is EXTEND; Browser mechanics are ADAPT while the AGK Tool capability remains REUSE.

| Capability | Source evidence | Native state | AGK decision |
|---|---|---|---|
| agent loop | `run_agent.py::AIAgent` | mature | EXTEND |
| prompt assembly | `agent/system_prompt.py` | mature | ADAPT |
| provider routing | `hermes_cli/runtime_provider.py`, provider plugins | mature wire mechanics | ADAPT |
| Tool registry | `tools/registry.py::ToolRegistry` | mature | REUSE |
| Skills | `tools/skills_tool.py`, `agent/skill_commands.py` | mature | REUSE |
| MCP | `tools/mcp_tool.py` | mature transport, broad secret scope | ADAPT |
| Memory | `agent/memory_manager.py` | personal and pluggable | ADAPT |
| Context | `agent/context_engine.py` | conversation-focused | ADAPT |
| Sessions | `hermes_state.py::SessionDB` | mature runtime history | ADAPT |
| subagents | `tools/delegate_tool.py`, `agent/subagent_lifecycle.py` | mature but process-local | REUSE |
| cron | `cron/scheduler.py` | mature scheduler | ADAPT |
| kanban | `hermes_cli/kanban_db.py` | durable queue | DEFER |
| execution backends | `tools/environments/*` | broad, mixed containment | ADAPT |
| browser runtime | `tools/browser_tool.py`, BrowserProvider and CDP | broad but high authority | ADAPT |
| gateways | `gateway/run.py`, platform adapters | broad | ADAPT |
| plugins | `hermes_cli/plugins.py` | broad in-process extension mapped to Package | EXTEND |
| desktop | `apps/desktop`, `apps/shared`, `tui_gateway` | Runtime console reference mapped to product surfaces | NEW |
| Organizations and AGK Project | none | absent | NEW |
| Oracle, Team, Workforce, OS | execution ingredients only | absent as domain | NEW |
| Knowledge and Artifact | files and projections only | minimal | NEW |
| AGK authorization | fragmented local controls | partial | NEW |
| AGK event ledger | fragmented signals and subsystem ledgers | partial | EXTEND |

The detailed machine registry is `hermes-capabilities.yaml`. Coverage does not imply canonical object equivalence.
