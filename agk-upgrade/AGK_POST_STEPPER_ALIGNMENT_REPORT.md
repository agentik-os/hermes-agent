# AGK Post-Stepper Alignment Report

**Status:** Independently validated planning SSOT. The canonical Stepper is unchanged and implementation remains closed.

**Implementation authority:** None. The pinned AGK Build Gate remains closed.

## 1. Executive architecture summary

The refined vision does not require replacing the validated AGK ontology. It requires making three parts more explicit:

1. an OS Definition can declare a complete composable execution system while an OS Installation and Oracle retain scoped state and ownership;
2. the canonical AGK Web and Tauri shell can reuse proven Hermes runtime and UI behavior while its top bar switches bounded Learn, Build, Deals and Self layouts;
3. the Organization Canvas is a recursive semantic projection with Design, Live and Inspect overlays, not a process diagram or source of truth.

Hermes remains a bounded AgentRuntime. AGK owns Organizations, Projects, object identity, governance, Knowledge, Artifacts and product surfaces.

## 2. What changed after the Stepper

The new prompt adds code-level Hermes audit requirements, expands OS programmatic and automation composition, specifies recursive Canvas behavior, defines Operate, Build and Inspect, broadens product surface bridges and emphasizes shared identity, packages, privacy and eventual economic loops.

It also proposes top-bar presentation labels. Canonical ids remain Learn, Build, Deals and Self. `Collectif` is retained as a Learn label candidate, not a canonical type. The retired personal label is not adopted.

## 3. What remains valid

The pinned Stepper's 6,441 Feature mapping, 1,197 planned Steps, cycle-free graph, 29 contracts, named journeys, threat models and technical Pre-Build PASS remain evidence for that exact snapshot.

The following architecture remains valid:

- Organization then Project
- universal object graph
- Definition, Installation or Instance, Deployment and Run
- Agent, Oracle, Team and Workforce distinctions
- Memory, Knowledge, Context and Artifact boundaries
- Session, Harness, Runtime and Run separation
- one platform with four bounded surfaces
- Hermes as a bounded adapter under AD-312
- self-improvement proposal-only boundary

## 4. Canonical ontology

Models provide cognition. Prompts provide instructions. Tools provide capabilities. Skills provide procedures. Agents perform work. OS Definitions package reusable domain intelligence and execution declarations. OS Installations bind those declarations to reality. Oracles own persistent domain responsibility. Teams organize bounded groups. Workforces package deployed organizational systems. Flows define reusable processes. Loops define bounded iteration. Harnesses define logical execution. Runtimes provide physical execution. Memory retains experience. Knowledge retains reusable truth. Artifacts retain managed work. Labs contain experimentation. Projects organize operational organizations around outcomes. AGK connects and governs everything.

## 5. Final AGK OS definition

An AGK OS is a reusable, composable Definition that packages the intelligence, procedures, capabilities, automation declarations, Knowledge schemas and governance required to operate a domain.

The Definition may declare Agent roles, Skills, Tools, MCP and Connector requirements, scripts, functions, Flows, Loop definitions, triggers, Knowledge and Memory schemas, policies, inputs, outputs, evals, quality gates, dependencies, Runtime requirements and versions.

The Installation carries real configuration, resources, Knowledge, Memory, Automations, permissions, Budgets, Agents, Runtime targets and overrides. The Oracle owns live domain responsibility.

This model supports autonomous operation without turning one reusable Definition into mutable state shared across Projects.

## 6. Hermes capabilities reused by OS

- AIAgent for worker execution
- ToolRegistry and Toolsets
- SKILL.md and Skill runtime
- MCP client and OAuth
- provider plugins and credential pools
- MemoryProvider and ContextEngine seams
- bounded subagent execution
- cron and Session controller mechanics where a single authority is proven
- execution environment backends
- plugin hooks, middleware and runtime callbacks
- SessionDB as Hermes history
- desktop panes and gateway client for inspection

## 7. Missing OS capabilities

Hermes does not supply OS Definition identity, Installation state, dependency DAG, package manifest, authority and autonomy axes, Project ownership, Oracle relationship, AGK policy compilation, Knowledge and Artifact graph, cross-Organization permissions, semantic events or recursive Canvas.

These remain AGK-owned P0 and P1 work.

## 8. Agent model

Agent Definition declares role, instructions, route policy, Tools, Skills, Knowledge, Memory policy, permissions, Harness, communication, outputs and evals. Agent Instance binds Project, OS, Team, tasks, Budget and Runtime profile.

AIAgent is the execution implementation. Hermes process identity never replaces AGK Agent identity.

## 9. Oracle model

Oracle requires mandate, domain state, decisions, inbox, event subscriptions, KPIs, risks, backlog, authority and escalation. A manager Agent that delegates is not an Oracle. Hermes executes work for an Oracle and does not define ownership.

## 10. Team model

Team is a bounded Human and AI group with manager or explicit routing, memberships, shared information scopes, capacity, queue, communication, quality, escalation and optional nested Budget. Broadcast is explicit.

Hermes AgentCalls can execute Team work but do not define Team identity.

## 11. Workforce model

Workforce Definition contains Oracle, Team and Agent templates, OS dependencies, Flows, policy, eval and layout templates. Instance binds live members, connectors, Knowledge, permissions, Budgets and Runtime. Deployment Snapshot pins versions.

Hermes profiles and kanban workers remain execution mechanisms, not the Workforce object.

## 12. Project model

Project is an outcome-oriented operational organization with outcome, constitution, Oracle, OS Installations, optional Teams and Workforces, Missions, Sessions, Knowledge, Memory, Artifacts, repositories, permissions, events and decisions.

Hermes Project is a named multi-folder runtime record. It remains private `HermesProjectRecord` adapter data, and imported folders map to canonical `RepositoryBinding` records.

## 13. Canvas architecture

Canvas recursively projects Project, Workforce, Team and OS Installation scope. Nodes reference canonical objects. Edges reference typed relationships. Presentation coordinates have a separate revision.

Structural edits compile to semantic commands and use optimistic concurrency. Architect-generated changes are reviewable before and after graph diffs.

## 14. Design, Live and Inspect

Design edits Definition drafts and bindings. Live overlays execution status and event flow. Inspect resolves Runs, Spans, Context, model calls, Tool calls, files, Memory reads, Knowledge retrieval, cost and evals.

All three modes share object identity and never maintain separate organizational state.

## 15. Runtime relationship

`AgentRuntime` is versioned and capability-negotiated. Hermes implements `HermesRuntimeAdapter`. AGK Runtime supervises the process, sandbox, checkpoint, recovery and stream. The control plane owns Session and Run records.

The adapter normalizes Hermes callbacks, hooks and history and reports any fidelity loss.

## 16. Learn architecture

Learn owns Paths, Courses, Modules, Lessons, Exercises, Labs, evaluations, certification and its Community domain. It references Build-owned Projects through explicit assignment and Open in Build bridges and consumes shared Agent, OS, Skill, Artifact, Eval, Evidence, Package and Project contracts.

`Open in Build` uses the same object reference and entitlement. Hermes can execute Tutors and Labs but does not store learning domain state.

## 17. Community architecture

Community is Learn's bounded human-collaboration domain. It owns Spaces, Channels, Posts, Threads, Messages, Rooms, Events, Groups and moderation. Hermes gateways can provide transport and execute clearly labeled AI participants. Community permissions and durable records remain in the control plane.

Creating an Opportunity from a Post requires explicit consent.

## 18. Deals architecture

Deals owns commercial Opportunity, Engagement, Proposal, Deal, Contract, referral, Commission reference, delivery bridge and review. `Opportunity` never means product discovery.

A contracted Engagement creates or binds the delivery Project after the canonical `Opportunity -> Deal -> Engagement -> Contract -> Project` chain. Build handles delivery. Deals handles economic state. Proposal is an Artifact and governed portfolio publication creates a `PortfolioItem`.

## 19. Self architecture

Self uses the same OS and intelligence primitives under a restrictive private zone. Personal Memory, Journal, goals, decisions and routines do not enter Build, Deals, Learn or community without an explicit scoped grant.

A Personal Oracle remains a proposed product decision rather than an automatic object.

## 20. Shared platform architecture

Identity, Organizations, memberships, permissions, objects, events, search, inbox, notifications, Artifacts, Knowledge, Memory, packages, integrations and entitlements are shared.

Product modules depend on the shared platform and intelligence core. Intelligence core never depends on product-specific objects.

## 21. Cross-surface object graph

One graph allows Course to teach Skill, Lab to produce Evidence, Skill to configure Agent, Agent to belong to Workforce, Workforce to run in Project, Project to support a governed PortfolioItem, and CapabilityClaim to support Deal matching.

Privacy zones and permissions filter graph visibility and content access. A relationship engine knowing that an object exists does not grant its contents.

## 22. Privacy boundaries

- Self private by default
- Build scoped to owning Organization and Project
- Learn progress shared only according to profile policy
- Deals Opportunity visibility explicit
- community spaces have public, member, cohort, Project, Organization and private scopes
- cross-surface use records purpose, fields, policy, actor and expiry

Organization switching closes and re-resolves every open object surface.

## 23. Permission architecture

Capability is physical affordance. Authorization is Permission, Risk, Policy, Environment and Approval. Approval is durable and conditional. Autonomy is time-bounded. Stale projections never authorize consequential action.

Hermes Toolsets, approvals and gateway allowlists are enforcement inputs, not AGK Permission objects.

## 24. Package architecture

Package manifest declares type, publisher, version, dependencies, configuration, capabilities, permissions, Runtime requirements, evals and docs. Installed bytes become PackageSnapshot. Rights become LicenseGrant.

Hermes plugins, portable packages and Skills can be mapped through adapters. In-process privilege and capability class determine security posture.

## 25. Marketplace readiness

OS, Workforce, Agent, Skill, Tool, Flow and template Definitions can be packageable after provenance, eval, compatibility, capability disclosure and trust exist. Live Instances, credentials, customer Memory and Budgets are excluded.

Marketplace UI and monetization are P3. Payments and complex commissions are P4.

## 26. Updated dependency graph

P0 evidence precedes shared contracts. Authorization and events precede Hermes adapter execution. Project and Agent precede Session binding. OS Installation precedes Oracle. Team and Oracle precede Workforce. Packages and evals precede Architect. Semantic commands precede Canvas. Cross-surface grants precede product bridges.

The machine roadmap is `05-roadmap/roadmap.yaml`.

## 27. Stepper changes

A future Stepper patch should add pinned Hermes source evidence, semantic collision checks, runtime capability negotiation, event replay and loss reporting, whole-process sandbox and effect-broker acceptance, scheduler single-authority decision, exact sixteen-part OS mappings, canonical Web and Tauri surface switcher, recursive Canvas and cross-surface permission dependencies.

It should preserve existing ids wherever semantics remain and regenerate all artifacts through the established generator.

## 28. Tasks removed

No validated Step is deleted in this checkout. Proposed implementation approaches removed from consideration are:

- rebuilding the agent loop;
- creating AGK-specific Tool, Skill, MCP or cron engines;
- mapping Hermes Project to AGK Project;
- making Canvas or runtime stores canonical domain state;
- creating separate object graphs for product surfaces;
- letting OS Definition own live state;
- allowing self-improvement to promote itself.

## 29. Tasks added

`06-implementation/tasks.json` contains the dependency-indexed planning families covering architecture validation, universal objects, identity, authorization, events, Artifacts, Knowledge and Memory, the execution spine, Runtime protocol, sandbox, host and supervisor, effect broker, routing, Tools and Skills, Sessions, Project, Agent, OS, Oracle, Team, Workforce, evals, packages, surface switcher, Inspector, Canvas, Architect, bounded product bridges, the pinned Hermes Runtime bundle, Automation binding, Hermes UI behavior extraction and the bounded mobile surface.

These are planning units and not implementation evidence.

## 30. Implementation sequence

1. Validate architecture.
2. Publish shared object and security contracts.
3. Build control-plane spine.
4. Implement and test Hermes adapter.
5. Build Project, Agent and Session.
6. Build OS and Oracle.
7. Build Team, Workforce, evals and packages.
8. Build shell, Inspector and Canvas.
9. Build Architect foundation.
10. Add bounded product bridges.

Each boundary has an independent gate.

## 31. Migration risks

- semantic name leakage from Hermes Project, Task, Goal, Loop and profile;
- dual state between AGK objects and Hermes stores;
- importing Memory without scope;
- treating plugin capabilities as sandboxing;
- floating upstream versions;
- incomplete event mediation;
- moving existing desktop users to a new product shell without preserving context;
- Stepper ids changing unnecessarily;
- product bridges leaking Self or Deal data.

Migration decisions in `07-post-stepper-alignment/MIGRATION_DECISIONS.md` address these.

## 32. Upstream Hermes implications

No production file is modified now. The preferred order is existing behavior, config, Skill or MCP, native plugin, desktop contribution, generic extension seam, wrapper, direct patch and replacement.

Potential missing seams are durable child reconnection, scheduler execution without dual job state, full checkpoint portability and complete event correlation. AGK product branding and surface switching belong to canonical AGK Web and Tauri rather than a Hermes seam.

Any direct patch is registered, tested and considered for generic upstream contribution.

## 33. Open questions

1. Can Hermes scheduler execution be used without a second canonical job store?
2. Which Hermes gateway and UI behaviors pass the extraction spike for reuse in canonical AGK Web and Tauri?
3. What checkpoint fidelity is available across Hermes process and provider changes?
4. Which control-plane implementation repository owns P0 AGK domain state?
5. Should `Collectif` become a presentation alias for Learn after formal product review?
6. Does Self require a Personal Oracle beyond OS Installations and shared personal coordination?
7. Which audited runtime blockers are fixed upstream before AGK begins implementation, and which remain disabled behind adapter capability negotiation?
8. Does Provider Account rotation rebind a live Session or apply only on the next Session binding?

These are explicit and do not block completion of the architecture audit. They block the related implementation choices.

## 34. Explicit deferred capabilities

- full academy and course creator economy
- voice and video community rooms
- complex moderation automation
- full Deals CRM and payment custody
- advanced commissions and revenue shares
- marketplace publication and ratings
- certifications and automated Deal matching
- creator and white-label Organizations
- advanced personal pattern and recommendation engines
- large-scale autonomous Labs
- automatic production self-improvement
- alternative AgentRuntime implementations
- complete mobile Canvas

## Final verdict

The refined vision can remain compatible with AGK canon when Hermes is treated as a bounded execution foundation, the exact sixteen-part OS anatomy is preserved, Automation stays one binding, canonical client boundaries hold and every colliding Hermes noun remains private adapter data. The largest deltas are not a new Agent loop. They are control-plane identity and governance, a sandbox-external enforcement boundary, semantic adapters, recursive Canvas and cross-surface privacy.

The remediated architecture set passed four fresh independent reviews covering canon, Runtime and security, validator quality and Hermes source accuracy. This does not constitute a Stepper patch or transfer the previous validation. Product implementation remains closed until the canonical Stepper is patched, regenerated, independently audited and affirmatively ratified for an exact snapshot.
