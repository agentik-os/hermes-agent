# AGK Architecture

## Layer model

```text
PRODUCT SHELL
  Learn | Build | Deals | Self
          |
AGK CONTROL PLANE
  Identity | Organizations | Projects | Objects | Permissions | Events
  Search | Inbox | Notifications | Packages | Deployments
          |
AGK INTELLIGENCE CORE
  Agents | OS | Oracles | Teams | Workforces | Knowledge | Memory
  Skills | Tools | Flows | Loops | Evals | Architect
          |
AGK RUNTIME CONTRACT
  Session | Harness | Runtime | Run | Span | Capability negotiation
          |
HERMES RUNTIME ADAPTER
  Agent loop | Providers | Tools | Skills | MCP | Memory adapters
  Subagents | Scheduler mechanisms | Gateways | Execution backends
          |
PHYSICAL EXECUTION
  Local | Desktop | Docker | SSH | VPS | Cloud sandbox | Remote worker
```

## Authority boundaries

| Layer | Owns | Must not own |
|---|---|---|
| Product shell | Navigation, projections, interaction state and layout | Canonical object state or runtime process state |
| Control plane | AGK object identity, tenancy, policy, configuration and deployment intent | Terminal bytes, model internals or secret bodies |
| Intelligence core | Reusable and installed intelligence semantics | Provider-specific transport behavior |
| Runtime contract | Execution lifecycle, capability declaration and normalized events | AGK product ontology |
| Hermes adapter | Translation between AGK runtime operations and Hermes behavior | AGK tenancy, Project, Oracle, Team, Workforce or OS truth |
| Physical execution | Process, filesystem, network and sandbox enforcement | Business authorization decisions |

## Distributed truth

```text
AGK operational domain state  -> control-plane store
Source code                   -> Git
Large artifact bytes          -> object storage
Secret values                 -> secret broker or vault
Runtime process state         -> Runtime
High-volume spans             -> telemetry backend
External service truth        -> source service
```

AGK stores references, projections and synchronization state for truths it does not own. It keeps current state plus a durable semantic event ledger and is not event sourced.

## One shell, bounded modules

AGK Web is the reference shell and Tauri wraps it for desktop. Both preserve stable regions:

```text
Top header with Organization and surface switcher
Contextual product sidebar
Polymorphic workspace
Context inspector
Optional surface status bar
Runtime drawer on Build and Inspect-capable views
```

Switching Learn, Build, Deals or Self reconfigures the lazy-loaded navigation module, layout, inspector and chrome. It does not fork identity, permissions or object ids. Switching Organization is a security boundary and forces all object surfaces to re-resolve.

Expo mobile uses the same objects, commands and Stax history with a narrower client capability profile. It supports observe, decide and converse, and refuses structural Flow or organization authoring.

## Build experience

Build exposes three coordinated modes:

- Operate: outcomes, Projects, Missions, Tasks, Chat and Artifacts
- Build: Architect, Canvas, OS, Oracles, Teams, Workforces, Skills, Tools and Flows
- Inspect: Runs, Spans, Context, Memory, logs, cost, evals, Runtime and Machines

These are role views and layout arrangements, not new product surfaces.

## Recursive Canvas

The Canvas projects one canonical object graph at several scopes:

```text
Project Canvas -> Workforce Canvas -> Team Canvas -> OS Installation Canvas
```

Design edits declarations through semantic commands. Live overlays execution status and event flow. Inspect overlays Runs, Spans, context, tool calls, cost and evals. Layout state remains separate from semantic state.

## Runtime substitution

AGK depends on `AgentRuntime`, not directly on `AIAgent`. Hermes is the first adapter. Alternative adapters are not implemented speculatively, but the boundary preserves the ability to add one without changing domain objects.

## Modularity rule

Product modules may depend on shared platform and intelligence contracts. Intelligence contracts never depend on Course, Deal, CommunityPost or JournalEntry. Cross-surface effects use events, commands and explicit policies rather than direct table reads.
