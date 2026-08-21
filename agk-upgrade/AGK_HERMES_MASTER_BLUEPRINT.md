# AGK and Hermes Master Blueprint

**Hermes baseline:** `8794e5a21c980a0f26532cb4883284b786cb3f25`

**AGK baseline:** `a0a3284edfb21eeeec77d9e185b98ef05dbada0a`

**Status:** Architecture SSOT. Product implementation remains disabled.

## Executive summary

Hermes is a strong personal Agent runtime with a mature model loop, provider routing, Tools, Skills, MCP, Memory providers, Session persistence, subagents, cron, kanban, gateways, execution backends and a deep native desktop shell. AGK should not rebuild those mechanics.

Hermes is not an organization control plane. Its security policy is single-tenant, its Project is a multi-folder runtime record, its Goals and Loops are Session controllers, its kanban Task is a queue row, and it has no canonical Organization, outcome-oriented Project, Oracle, Team, Workforce, OS Definition and Installation, Knowledge or Artifact graph.

The architecture therefore uses Hermes as the first implementation of a versioned `AgentRuntime` contract. AGK owns identity, Organizations, Projects, objects, policy, domain state, packages and product surfaces. The adapter translates AGK Agent, Session, Harness, Tool, Skill, Context, Budget and Run contracts into Hermes behavior and normalizes runtime evidence back into AGK events and Spans.

AGK Web is the reference shell and Tauri wraps that same client for desktop. A canonical top-level switcher selects Collective, Learn, Build, Deals or Evolve and applies each universe's navigation module, workspace layout, inspector and optional status bar. Build adds Operate, Design, Code and Inspect modes. Hermes Electron remains a Runtime console, behavior source and validated visual prototype, not the final AGK client.

## 1. Hermes architecture today

Hermes exposes several entry points over one core Agent loop:

- `cli.py::HermesCLI`
- `gateway/run.py::GatewayRunner`
- `tui_gateway/server.py` and `ui-tui`
- `apps/desktop` over `apps/shared`
- `hermes_cli/web_server.py` and `web`
- `acp_adapter`
- `batch_runner.py`

`run_agent.py::AIAgent` performs prompt assembly, provider calls, Tool execution, interruption, fallback, usage and Session persistence. `agent/system_prompt.py` builds stable, context and volatile prompt tiers. `model_tools.py` resolves model-facing Tool schemas and dispatches through `tools/registry.py::ToolRegistry`.

`hermes_state.py::SessionDB` stores runtime Sessions, messages, lineage, usage, routing and async delegation records in SQLite with WAL and FTS5. Other Hermes authorities include projects.db for named multi-folder workspaces, kanban databases for durable queue state, cron JSON for jobs and profile files for config, Skills and Memory.

General native plugins register Tools, hooks, middleware, state and CLI commands through `hermes_cli/plugins.py`. Specialized registries handle model providers, Memory providers, Context Engines, gateway adapters, browser and media providers, scheduler providers and desktop contributions. MCP contributes dynamic Tools.

Hermes Desktop separates authority cleanly: Electron owns machine facts, the gateway owns Agent and Session truth, and the renderer owns presentation. Its contribution registry supports panes, routes, sidebar entries, titlebar, status bar, palette, keybinds, themes, composer and transcript directives.

Detailed evidence lives in `01-hermes-audit` and `hermes-capabilities.yaml`.

## 2. Hermes capabilities retained

AGK retains these Hermes mechanisms unless later behavior tests prove a blocker:

- `AIAgent` tool-calling execution
- provider profiles, API transports and custom compatible endpoints
- credential pools and allowed fallback mechanics
- Tool registry, Toolsets and availability gates
- SKILL.md loading, commands, hub and curator lifecycle
- MCP transports, OAuth, catalog and Tool discovery
- bounded leaf subagents and public lifecycle API
- SessionDB as Hermes runtime history
- local, Docker, SSH, Singularity, Modal, Daytona and Vercel execution backends
- browser, terminal, file, web, vision and media Tools
- gateway transport adapters and delivery
- prompt caching and context compression mechanics
- Electron shell behavior, terminal, files, git, preview and contribution patterns as extraction references
- TUI, dashboard and ACP runtime surfaces where useful
- logging, monitoring, trajectories and eval mechanisms as runtime evidence

Retained does not mean canonical. These mechanisms are accessed through AGK contracts and bindings.

## 3. Hermes capabilities extended or adapted

The following require AGK semantics above or around the native mechanism:

| Hermes capability | AGK extension |
|---|---|
| AIAgent | Agent Definition, Agent Instance, scope, contract, permissions and evals |
| SessionDB | canonical AGK Session and HermesSessionBinding |
| Profile | HermesRuntimeProfile bound to one Agent instance |
| MemoryProvider | scoped AGK Memory behind Context Firewall |
| prompt assembly | immutable Context Manifest and law provenance |
| providers | Provider Account, Budget and routing decision |
| Tool registry | Tool Definition, risk floor, binding and authorization |
| Skills | Skill Definition, OS Skill Binding and package provenance |
| MCP | Connector and Adapter identity plus Tool bindings |
| cron and loops | Runtime trigger or Session controller beneath AGK Automation or Loop Deployment |
| gateway | Actor identity, Message contract and Organization policy |
| hooks and callbacks | normalized AGK Event and Span envelope |
| desktop | Runtime console and behavior extraction reference; canonical AGK Web, Tauri and Expo clients remain AGK-owned |
| plugin packages | AGK Package, snapshot, trust and compatibility |

Every adaptation has one authority. No Hermes record and AGK object both claim canonical state.

## 4. Hermes limitations

Material limitations for AGK are:

1. single-tenant personal Agent trust model;
2. profiles are state isolation, not tenant security;
3. Hermes Project semantics conflict with AGK Project;
4. no Organization, Oracle, Team, Workforce or OS domain model;
5. no universal object and relationship graph;
6. Memory is not first-class Knowledge;
7. files and attachments are not complete Artifacts;
8. events are fragmented across hooks, callbacks, RPC, logs and trajectories;
9. native plugins run in-process with full privilege;
10. subagent reconnection does not survive process restart;
11. cron and kanban have independent stores;
12. desktop identity and information architecture are Hermes chat-first;
13. several core modules are large and expensive to patch directly.

These are layer boundaries, not a reason to replace strong runtime mechanics.

## 5. AGK target architecture

```text
ONE AGK SHELL
  Collective | Learn | Build | Deals | Evolve
        |
AGK CONTROL PLANE
  Identity | Organizations | Projects | Objects | Permissions
  Events | Search | Inbox | Packages | Deployment intent
        |
AGK INTELLIGENCE CORE
  Agent | OS | Oracle | Team | Workforce | Knowledge | Memory
  Skills | Tools | Flows | Loops | Evals | Architect
        |
AGENT RUNTIME CONTRACT
        |
HERMES RUNTIME ADAPTER
  AIAgent | Providers | Tools | Skills | MCP | Sessions
  Subagents | Scheduler mechanics | Gateways | Environments
        |
AGK RUNTIME AND PHYSICAL EXECUTION
  local | desktop | Docker | SSH | VPS | cloud sandbox | remote
```

AGK product modules depend on shared platform and intelligence contracts. The intelligence core never imports Course, CommunityPost, Deal or JournalEntry.

## 6. AGK domain model

Organization is tenancy. Project is an outcome-oriented operational organization. Nothing sits between them.

Definitions are reusable and immutable by version. Installations or Instances bind them to real scope. Deployment Snapshots pin executable versions. Runs record execution.

The operating chain is:

```text
Project -> Mission -> Plan -> Task -> Actor -> Session -> Harness -> Runtime
        -> Run -> Span -> Artifact -> Evidence -> Verification
```

The one object graph carries stable identity, owner, Organization, scope, revision, lifecycle, permissions, relationships, events, history and provenance. Canvas and Chat are projections, never truth.

## 7. Hermes and AGK mappings

The canonical machine mapping is `agk-hermes-map.yaml`. The most important mappings are:

- `AIAgent` implements AGK Agent execution, not Agent identity.
- Hermes Profile becomes `HermesRuntimeProfile`.
- Hermes Project becomes private `HermesProjectRecord` adapter data; imported folders use canonical `RepositoryBinding`.
- SessionDB Session becomes runtime evidence behind `HermesSessionBinding`.
- Hermes Goal becomes `SessionGoalController`.
- Hermes Loop becomes `SessionLoopController`.
- leaf subagent remains an ephemeral child Agent; its invocation becomes an AgentCall Span.
- Hermes Skill and Tool implementations are reused through AGK Definitions and bindings.
- MCP remains transport.
- kanban is deferred until Task authority can remain singular.

No compatibility DTO appears in the public AGK ontology.

## 8. Missing capabilities

P0 gaps are universal object identity, Organization tenancy, AGK Project, Agent Definition and Instance, Mission through canonical Run state, authorization and effect brokering, event ledger and outbox, Artifact, Knowledge, Context Manifest, signed Package trust, AgentRuntime protocol, sandbox supervisor, OS Definition and Installation, Oracle and whole-process runtime governance.

P1 gaps are Team, Workforce, advanced Package lifecycle, Eval and Verification authority, deployment reconciliation, recursive Canvas, canonical AGK Web and Tauri shell and Architect foundation.

P2 and later gaps are Learn, community, Deals and Self product foundations, marketplace, certification, matching, creator Organizations, payments and advanced Labs.

## 9. Runtime abstraction

`AgentRuntime` declares capability negotiation, Agent and Session lifecycle, Run execution, interruption, AgentCalls, Tool execution, Skill binding, deferred scheduler trigger binding, checkpoint, resume, effect query, reconciliation and event streaming with acknowledgment.

The contract uses authenticated length-delimited Protobuf under AGK AD-301 between a sandbox-external supervisor and sandbox-internal guest host. A Runtime descriptor declares adapter version, protocol, supported operations, backends, model modes, Tool and Skill capabilities, sandbox posture, streaming and replay guarantees, checkpointable and portable flags, limits, health and compatibility.

Hermes implements the contract through `HermesRuntimeAdapter`. Alternative runtimes are not built speculatively.

## 10. Persistence architecture

AGK uses distributed canonical truth:

- operational domain state in the control-plane store;
- source code in Git;
- large bytes in object storage;
- secret values in a vault or broker;
- process state in Runtime;
- high-volume telemetry in the telemetry backend;
- external service truth in the source service.

Hermes state.db remains Hermes runtime history. projects.db, kanban databases and cron JSON never become AGK domain stores. Explicit adapters correlate records through stable bindings.

## 11. Events architecture

Every consequential mutation emits one registered semantic event. Events carry id, schema version, Actor, object, Organization, Project, Session, Run, causality, effective classification, timestamp and provenance.

Runtime hooks and callbacks are inputs to an event normalizer. The normalizer reports fields it cannot preserve. Semantic lifecycle events enter the durable ledger. High-volume Run detail enters telemetry as ModelCall, ToolCall, AgentCall or RuntimeCommand Spans.

AGK keeps current state plus the event ledger and is not event sourced. A semantic command atomically writes current state, event and transactional outbox. Runtime events carry guest ids and sequence, are acknowledged only after durable ingest and report any replay gap explicitly.

## 12. Security model

AGK authorization is:

```text
ALLOWED ACTION = Capability intersect Permission intersect Risk
                 intersect Policy intersect Environment intersect Approval
```

Hermes `SECURITY.md` states that OS isolation is the only containment boundary against an adversarial model. One profile per Agent instance is necessary for state separation and insufficient for tenancy.

Every governed workload runs inside a whole-process sandbox with declared filesystem, network, process and secret policy and no local fallback. A sandbox-external effect broker mediates models, Tools, files, network, processes and secrets. Hooks, Toolsets and command approvals remain defense in depth. Secret values never enter the guest profile, checked-in configuration or AGK object state.

Self defaults to a private zone. Cross-surface access is an explicit field-level grant with purpose and expiry.

## 13. Machine and Runtime architecture

Machine is Runtime host metadata. Runtime is the first-class physical execution environment. Harness is logical configuration.

Hermes Environment backends are adapted as capability implementations only when their effective mounts, egress, resources and sync behavior can be attested. Local and SSH are execution connectors rather than containment. AGK Runtime supervises process trees, restarts, drains, kills, checkpoints and reconciles desired with actual state. A Hermes process crash never changes Project, Mission, Task, Agent or Session identity.

Terminal and browser bytes bypass the operational database and use a low-latency Runtime Gateway.

## 14. Project architecture

A Project owns outcome, objectives, constitution, policies, Oracle, optional Teams and Workforces, OS Installations, Missions, Sessions, Knowledge, Memory, Artifacts, repositories, permissions, events and decisions.

A Project can exist without a folder or active Runtime. A repository uses canonical `RepositoryBinding`; Hermes Project remains private adapter data whose folders may be imported. The minimum Project is one Human, one Project and one Executive or Project Oracle.

## 15. Agent architecture

Agent Definition declares role, instructions, model policy, Tools, Skills, Knowledge, Memory policy, permissions, Harness requirements, communication, outputs and evals. Agent Instance binds scope, OS, Team, Budget, Runtime profile and tasks.

Hermes AIAgent executes the Instance. AGK identity survives process replacement. An Agent cannot increase its own permissions, Budget, autonomy or risk ceiling.

## 16. Oracle architecture

Oracle persists responsibility for one domain. It owns mandate, domain state projection, decisions, inbox, subscriptions, objectives, risks, KPIs, backlog, escalation and OS bindings.

A manager Agent is not an Oracle. The default is one Project Oracle. Domain Oracles are earned by independent state and authority.

Hermes may execute Oracle work but never owns Oracle identity or state.

## 17. Team architecture

A Team is a bounded Human and AI group with a manager or routing strategy, members, shared Knowledge and Memory scopes, OS bindings, queue, capacity, communication, quality, escalation and optional nested Budget.

Addressing resolves a route first. Broadcast is explicit. Hermes subagents supply bounded AgentCalls and do not create Team semantics.

## 18. Workforce architecture

Workforce Definition packages Oracles, Teams, Agent templates, OS dependencies, Flows, policies, evals, Knowledge schemas and layout templates. Workforce Instance binds real members, connectors, Knowledge, permissions, Budgets, Runtime and live state. Deployment Snapshot pins versions.

Only versioned packages are shared or sold. Live credentials, Memory and customer state never travel.

## 19. OS architecture

OS Definition packages reusable operational intelligence in exactly sixteen parts: Purpose, Principles, Commands, Flows, Agents, Skills, Tools, Knowledge, Memory, Policies, Inputs, Outputs, Evals, Quality Gates, Dependencies and Versions. Loop, MCP, Connector, script, Runtime and Harness details map inside those parts and never expand the anatomy.

OSInstallation binds real configuration, resources, permissions, Knowledge, Memory, Automations, Agents, Runtime and overrides at organization, project or OS scope. `OrganizationOSInstallation` carries `authority_floor`, `ProjectOSBinding` may tighten and never loosen it, and departments or Oracles consume Project installations through `OSBinding`. At autonomy A4 or A5 an installation can operate continuously through bounded Missions. Oracle remains the live owner.

Hermes provides most execution ingredients. AGK provides identity, composition, bindings, governance, package and product projection.

## 20. Artifact architecture

Artifact is a managed work product with stable id, type, owner, Project, creator, Session, Mission, Task, Run, inputs, dependencies, content reference, checksum, version, status, classification, review and provenance.

Hermes file and attachment mechanics are reused for transport and execution. They do not automatically promote arbitrary files into Artifacts.

## 21. Memory architecture

Memory retains experience and is distinct from Knowledge, Context, files and transcripts. Scope can be Session, Agent, OS Installation, Project, Organization or Self. Contradictions retain provenance until governed resolution.

Hermes MemoryProvider is adapted. Governed runs fail closed when the AGK Memory provider is unavailable and never silently write a second ungoverned memory.

## 22. Knowledge architecture

Knowledge is reusable truth or doctrine with type, scope, source namespace, maturity, citations, classification, contradiction links and version.

Knowledge enters model Context only through the Context Firewall and immutable Context Manifest. A local Project fact can override a general OS preference, while a fact cannot repeal a rule.

Hermes has no complete Knowledge domain. Files, Skills and retrieval remain implementation inputs.

## 23. Architect architecture

Architect converts intent into a proposed semantic graph diff. It resolves dependencies, identifies permissions, validates contracts, simulates policy and presents before and after state. Apply uses normal object commands and requires authority.

Architect is not natural language to unchecked JSON and cannot deploy its own proposal. It begins only after target schemas, semantic commands, packages and evals exist.

## 24. Labs architecture

Lab is a bounded Learn, Organization, Project or OS environment for experiments, benchmarks and improvement. An Experiment declares subject versions, variants, data, metrics, Budget, isolation, stopping rule and promotion criteria.

Hermes trajectories, evals, batch execution and the separate self-evolution project can produce candidates. Labs may propose and never ratify or promote.

## 25. Marketplace compatibility

AGK Packages can contain Agent, OS, Workforce, Skill, Tool, Flow or template Definitions. A manifest declares metadata, dependencies, compatibility, configuration, required capabilities, permissions, Runtime requirements, evals and docs.

Installed bytes become an immutable PackageSnapshot. A separate LicenseGrant records execution and update rights. Trust tiers depend on capabilities, not marketing labels.

Hermes plugin and Skill formats are import or implementation formats, not the entire AGK package contract.

## 26. Upstream Hermes strategy

`origin` remains NousResearch upstream. `fork` remains agentik-os publication. AGK work uses dedicated branches and a pinned baseline.

The footprint ladder is reuse, configure, Skill or MCP, plugin, desktop contribution, generic seam, wrapper, direct core patch, replacement. A direct patch requires evidence, tests, conflict analysis and registration in `04-upstream-strategy/HERMES_FILES_MODIFIED.md`.

No Hermes production file is modified in this architecture phase.

## 27. Technical roadmap

The roadmap is:

1. evidence and alignment;
2. shared object, identity, authorization, event, Artifact, Knowledge, Memory and runtime contracts;
3. control-plane spine;
4. Hermes Runtime adapter;
5. Project, Agent and Session;
6. OS and Oracle;
7. Team, Workforce, packages and evals;
8. desktop shell, Inspector and Canvas;
9. Architect;
10. bounded Learn, community, Deals and Self foundations;
11. ecosystem and future capabilities.

Implementation starts only after exact-snapshot validation and operator authorization.

## 28. Implementation dependency graph

Governance and event contracts precede Hermes integration. Project precedes importing a Hermes folder group into Repository bindings. OS Installation precedes Oracle operation. Team and Agent precede Workforce. Semantic commands precede Canvas. Packages and evals precede Architect apply. Cross-surface grants precede product bridges. Marketplace and Labs follow provenance and promotion.

The detailed graph is `05-roadmap/DEPENDENCY_GRAPH.md`, and 36 task contracts live in `06-implementation`.

## 29. Risks

Primary risks are semantic name leakage, dual state authority, insufficient plugin mediation, treating profiles as tenancy, relying on in-process controls as containment, breaking prompt caching, incomplete event normalization, upstream merge conflict in large modules, Canvas becoming a second truth, overbuilding product domains, leaking Self data and allowing architecture generation to self-approve.

The pinned audit also blocks governed deployment until the `execute_code` empty nested-Tool fail-open, background-process owner validation, A2A outbound URL and bearer policy, per-MCP secret grants, remote sync-back policy and AGK update channel are resolved or disabled.

Every risk has a fail-closed contract or deferred decision in the alignment documents.

## 30. Explicit non-goals

This phase does not:

- modify Hermes production code;
- open the AGK Build Gate;
- implement the full product ecosystem;
- build a marketplace or payment system;
- add alternative Runtime adapters;
- rebuild Tools, Skills, MCP, providers, gateways or execution backends;
- turn Hermes Project into AGK Project;
- make Canvas canonical state;
- make OS Definition a mutable live owner;
- expose retired surface names in contracts;
- let self-improvement ratify itself.

The success criterion is the smallest coherent AGK architecture that leverages Hermes execution while keeping AGK identity, ontology, governance and product experience independent.
