# Canonical Reconciliation Notes

This file is a working input to the derived specifications. It identifies operator-prompt concepts that must be preserved while using the canonical AGK vocabulary recorded in `00-input/SOURCE_MANIFEST.json`.

| Prompt concept | Canonical interpretation | Treatment |
|---|---|---|
| legacy four-surface labels in the source capture | AGK Learn, Build, Deals, Self | Preserve the four-surface intent. Use canonical ids and names. Retired labels remain only in the verbatim capture. |
| Collectif as the Learn top-bar label | Candidate presentation alias for Learn | Record as a UX proposal. Do not change the canonical `learn` surface id without a new ratified AGK decision. |
| Deal as a top-bar label | Deals | Use the canonical plural label. |
| retired personal top-bar label | Self | Use Self. The source-capture label is retired by AGK AD-001. |
| OS as persistent autonomous intelligence and execution system | exact sixteen-part OS Definition plus OS Installation plus Oracle ownership | Map Agents, Skills, Tools, MCP, scripts, Loops, Automation, evals and Runtime requirements inside the canonical sixteen parts. Put scoped resources and configuration on the Installation and live domain state on the Oracle. |
| OS can work by itself | An Installation may run at autonomy A4 or A5 within policy | Preserve autonomous operation. Do not make the reusable Definition a live mutable owner. |
| OS owns subagents, memory and artifacts | OS Definition declares composition and schemas; Installation binds runtime components; Oracle owns live domain responsibility | Replace physical ownership claims with typed declarations, bindings and provenance. |
| legacy authored-process term | Flow | Always use Flow in derived specifications. |
| Graph as a builder object | Task Graph or execution topology projection | AGK Graph is engine data, not a first-class user object. Canvas views edit canonical objects and typed relationships. |
| Agent equals worker | Agent is the canonical primitive, persistent or ephemeral; Worker is a role | Preserve the worker meaning without adding a second primitive. |
| Hermes Project | Named multi-folder runtime record | Never map directly to AGK Project. Keep a private adapter record and map imported folders to canonical RepositoryBinding. |
| Hermes Goal | Session-scoped goal controller | Do not map directly to AGK Goal, Mission or Project outcome. It may implement a bounded Run controller. |
| Hermes Loop | Session-scoped recurring wakeup controller | Do not map directly to an AGK Loop Definition or Loop Deployment. It may serve as one runtime mechanism. |
| Hermes Kanban Task | Durable Hermes work-queue row | AGK Mission, Plan and Task remain canonical. Reuse only behind an explicit adapter or not at all. |
| Hermes profile | Isolated HERMES_HOME runtime profile | Bind one profile to one AGK Agent runtime instance. It is not an AGK User, Organization, Project or Agent Definition. |
| Canvas stores the organization | Canvas is a projection and semantic editor over the object graph | Store layout separately. Structural edits compile into typed commands with optimistic concurrency. |
| Existing AGK Stepper passed | Technical audit PASS, operator gate CLOSED | Preserve all validated planning evidence. Do not run Builder or claim implementation. |

## Top-bar surface switching

The operator's latest UX idea is compatible with the ratified one-shell architecture when it is implemented as a stable surface switcher over canonical ids:

```text
learn | build | deals | self
```

A switch changes the lazy-loaded navigation module, workspace layout, context inspector capabilities and optional status bar. It does not change identity, Organization membership, permissions, search, inbox, notification routing or object identity. Context-preserving transitions use explicit deep links and object references. An Organization switch is different: it closes and re-resolves all open object surfaces to avoid a scope leak.
