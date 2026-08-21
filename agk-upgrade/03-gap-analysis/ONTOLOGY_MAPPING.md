# Ontology Mapping

| Hermes concept | Actual Hermes semantics | AGK mapping | Decision |
|---|---|---|---|
| `AIAgent` | One configured agent execution loop | Agent Runtime implementation for an Agent Instance | EXTEND |
| Profile or `HERMES_HOME` | Isolated config, memory, sessions, skills and gateway state | `HermesRuntimeProfile` bound to one Agent instance | ADAPT |
| Project | Per-profile named multi-folder runtime record | private `HermesProjectRecord`; folders map to `RepositoryBinding`, never AGK Project | ADAPT |
| SessionDB session | Conversation and tool-call lineage | Runtime session projection bound to canonical AGK Session | ADAPT |
| Goal | Session-scoped judge-driven continuation | `SessionGoalController` inside a bounded Run | REUSE |
| Loop | Session-scoped recurring wakeup | `SessionLoopController` implementation option | ADAPT |
| Cron job | Hermes-owned scheduled prompt and delivery | Runtime trigger provider for AGK Automation when single authority is proven | ADAPT |
| Kanban Board | Durable multi-profile task queue | Optional runtime work queue, never canonical Project or Mission store | DEFER |
| Kanban Task | Work row with assignee and lifecycle | Runtime work item correlated to AGK Task if an adapter exists | DEFER |
| Subagent | Child Hermes session spawned by a parent turn | Ephemeral AgentCall under an AGK Run | REUSE |
| Skill | SKILL.md procedure | AGK Skill Definition plus OS Skill Binding | REUSE |
| Tool | Registered callable schema and handler | AGK Tool implementation binding | REUSE |
| MCP server | External tool transport | MCP Connector and exposed Tool bindings | REUSE |
| Memory Provider | Agent memory backend | AGK Memory adapter, not Knowledge | ADAPT |
| Context Engine | Conversation compression policy | Runtime context implementation under AGK Context Manifest | ADAPT |
| Gateway Adapter | External messaging transport and routing | Communication Adapter below AGK Actor and Message contracts | ADAPT |
| Desktop pane or route | UI contribution | AGK layout and view implementation | REUSE |
| Desktop layout | Window presentation state | Workspace and LayoutDefinition projection | EXTEND |
| Plugin | In-process executable extension | AGK Plugin implementation subject to package and capability policy | ADAPT |
| Portable Agent Plugin | Skills and MCP package subset | Candidate package import format, not full AGK package | ADAPT |

## Unmapped AGK primitives

Organization, outcome-oriented Project, Oracle, OS Definition, OS Installation, Team, Workforce, Mission, Plan, canonical Task, Knowledge, Artifact, Policy, Eval, PackageSnapshot, LicenseGrant and the four product domains require AGK-owned semantics.
