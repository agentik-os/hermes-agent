# Feature Matrix

Coverage is architectural, not implementation progress. Percentages are bounded estimates derived from the pinned source audit and indicate how much of the AGK capability contract Hermes supplies without AGK domain layers.

| AGK capability | Hermes evidence | Coverage | Decision |
|---|---|---:|---|
| Agent execution | `run_agent.py::AIAgent`, `model_tools.py` | 80% | EXTEND |
| Tools | `tools/registry.py::ToolRegistry`, `toolsets.py` | 95% | REUSE |
| Skills | `tools/skills_tool.py`, `agent/skill_commands.py` | 90% | REUSE |
| MCP | `tools/mcp_tool.py`, `hermes_cli/mcp_config.py` | 95% mechanics | ADAPT |
| Provider and model routing | `hermes_cli/runtime_provider.py`, provider plugins, credential pools | 90% wire mechanics | ADAPT |
| Session execution and history | `hermes_state.py::SessionDB`, `gateway/session.py` | 75% | ADAPT |
| Memory mechanism | `agent/memory_manager.py`, MemoryProvider plugins | 60% | ADAPT |
| Knowledge domain | context files, files and retrieval only | 15% | NEW |
| Artifact domain | file tools, attachments and renderer projections | 20% | NEW |
| Subagent execution | `tools/delegate_tool.py`, `agent/subagent_lifecycle.py` | 85% | REUSE |
| Durable work queue | `hermes_cli/kanban_db.py`, dispatcher | 75% mechanics | DEFER |
| Scheduler mechanics | `cron/jobs.py`, `cron/scheduler.py` | 85% | ADAPT |
| Automation binding | cron, Loop and webhook mechanisms | 35% | ADAPT |
| Session goal controller | `/goal`, persisted `state_meta` | 85% controller | REUSE internally |
| Session recurring loop | `/loop`, cron | 80% controller | ADAPT |
| Execution environments | `tools/environments/*` | 90% mechanics | ADAPT |
| Gateway channels | `gateway/run.py`, platform adapters | 90% transport | ADAPT |
| Plugin extension | `hermes_cli/plugins.py::PluginManager` | 90% | REUSE |
| Hermes Desktop behavior | `apps/desktop`, contribution registry and SDK | 80% Runtime console, 35% canonical client | ADAPT |
| Web and TUI surfaces | `web`, `ui-tui`, `tui_gateway` | 75% Runtime surfaces, not AGK clients | ADAPT |
| Organizations and tenancy | single-tenant profiles only | 5% | NEW |
| Outcome-oriented Project | Hermes Project is a multi-folder runtime record | 10% | NEW |
| Oracle | none | 5% execution substrate only | NEW |
| Team semantics | delegation and board workers only | 25% | NEW |
| Workforce semantics | profiles and kanban only | 15% | NEW |
| OS Definition and Installation | primitives exist separately | 30% foundation | NEW |
| AGK permissions and law stack | approvals, allowlists and plugin consent only | 25% | NEW |
| Canonical object graph | no universal AGK domain graph | 5% | NEW |
| Versioned event ledger | fragmented hooks and runtime events | 30% | EXTEND |
| Eval domain | eval scripts, judge and verify mechanisms | 35% | EXTEND |
| Packages and marketplace readiness | plugins, skills and portable packages | 45% | EXTEND |
| Recursive Organization Canvas | panes and contribution system only | 15% behavior reference | NEW |
| Learn | no course or certification domain | 5%, P2 | NEW |
| Community | messaging transports, no community domain | 15%, P2 | NEW |
| Deals | no economic domain | 0%, P2/P3 | NEW |
| Self | personal memory, no governed Self domain | 15%, P2 | NEW |

## Interpretation

High Hermes coverage does not imply that the Hermes record is the AGK object. It usually means Hermes supplies runtime mechanics beneath an AGK adapter. Low coverage does not justify immediate implementation. Priority remains Foundation first, then core product, then bounded ecosystem expansion.
