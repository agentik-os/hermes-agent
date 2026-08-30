# AGK on Hermes Architecture Decisions

This register records every decision made while reconciling AGK with the Hermes baseline pinned in `00-input/SOURCE_MANIFEST.json`. A decision marked `RATIFIED` restates an authority that already exists in the AGK decision register. A decision marked `PROPOSED` is not permission to implement it.

## D-001. Source precedence and vocabulary

**Status:** RATIFIED

**Decision:** The ratified AGK canon and decision register at the pinned AGK-OS commit govern AGK semantics. Actual Hermes behavior at the pinned Hermes commit governs claims about Hermes capability. The operator prompt is preserved as vision input and is reconciled rather than silently edited.

**Context:** The prompt contains earlier surface names and several definitions that overlap with later ratified AGK decisions.

**Options:** Let the newest prose silently replace canon; ignore the new prompt; preserve the prompt and reconcile conflicts explicitly.

**Chosen:** Preserve and reconcile explicitly.

**Why:** This keeps operator intent visible without creating two competing ontologies.

**Hermes impact:** None.

**AGK impact:** AD-314 ratifies `collective`, `learn`, `build`, `deals`, `evolve` as canonical universe ids. Self remains the private internal domain behind Evolve. `Opportunity` remains the Deals object and product discovery remains `ProductOpportunity`.

**Future consequences:** Any proposed ontology amendment needs a new operator decision in AGK-OS before implementation.

**Reversibility:** High. A later ratified decision can update this register and the derived documents.

## D-002. Hermes is a bounded AgentRuntime foundation

**Status:** RATIFIED, from AGK AD-312

**Decision:** Hermes is accessed through a versioned `AgentRuntime` adapter under canonical AGK Session, Context Firewall, Runtime, permissions and trace contracts. Hermes is not the AGK control plane and does not own AGK domain identity.

**Context:** Hermes already provides a mature agent loop, providers, tools, skills, MCP, memory adapters, sessions, subagents, schedulers, gateways and execution backends.

**Options:** Rebuild those primitives; import Hermes internals directly into AGK domain code; supervise Hermes behind a typed adapter.

**Chosen:** Supervise Hermes behind a typed adapter.

**Why:** It maximizes reuse while preserving removal, upgrade and alternative-runtime boundaries.

**Hermes impact:** Prefer supported plugin, provider, memory, MCP, gateway and JSON-RPC seams. Core patches require recorded proof that no supported seam can satisfy the contract.

**AGK impact:** AGK owns higher-order objects, policies, state and product surfaces. Runtime capability is negotiated, never assumed.

**Future consequences:** A second runtime can implement the same contract without changing AGK object semantics.

**Reversibility:** High if the adapter remains the only dependency edge.

## D-003. Semantic collisions are adapted, not renamed blindly

**Status:** RATIFIED in principle, implementation mapping PROPOSED

**Decision:** A Hermes noun that has different semantics from an AGK canonical noun is mapped at the compatibility boundary and is not exposed as that AGK object.

**Context:** Hermes `Project` is a per-profile named multi-folder workspace in `hermes_cli/projects_db.py`. AGK `Project` is an outcome-oriented operational organization. Hermes goals, loops, kanban tasks and profiles also differ from their AGK counterparts.

**Options:** Reuse names as if semantics matched; rename Hermes core; wrap the Hermes records in explicitly named adapter types.

**Chosen:** Wrap with explicit private adapter types. Initial mappings are `HermesProject -> HermesProjectRecord`, `HermesProfile -> HermesRuntimeProfile`, `HermesGoal -> SessionGoalController`, `HermesLoop -> SessionLoopController`, and `HermesKanbanTask -> RuntimeWorkItem` when used at all. Imported folder entries map to the existing canonical `RepositoryBinding`.

**Why:** Name equality is not semantic equality. Silent reuse would corrupt the AGK graph.

**Hermes impact:** Hermes storage and APIs can remain unchanged behind the adapter.

**AGK impact:** Only AGK objects receive AGK ids, ownership, permissions, lifecycle and events.

**Future consequences:** Compatibility DTOs must never leak into public AGK contracts.

**Reversibility:** Medium. Adapter names can change before the runtime contract is published.

## D-004. OS Definition and OS Installation preserve the refined OS intent

**Status:** RATIFIED

**Decision:** An OS Definition retains exactly the canonical sixteen parts: Purpose, Principles, Commands, Flows, Agents, Skills, Tools, Knowledge, Memory, Policies, Inputs, Outputs, Evals, Quality Gates, Dependencies and Versions. The refined multi-agent intent is expressed inside those parts. An OS Installation binds that Definition to scoped configuration, resources, permissions, Knowledge, Memory and deployment state. The Oracle owns live domain responsibility and state.

**Context:** The prompt correctly rejects an OS as a large prompt and asks for an autonomous composable system. The canon also forbids an OS Definition from owning live project state.

**Options:** Make OS a prompt bundle; make the reusable definition itself mutable and stateful; separate immutable definition from installation and owner.

**Chosen:** Separate definition, installation and Oracle ownership.

**Why:** This preserves composable autonomous operation without leaking one project's state into every installation.

**Hermes impact:** Hermes agents, skills, tools, MCP, scripts, scheduler primitives, memory providers and execution environments can implement installation behavior through adapters.

**AGK impact:** OrganizationOSInstallation, ProjectOSBinding and OSBinding remain distinct. Dependency conflicts follow the canonical composition rules. Automation remains one deployment binding, `Trigger + executable target + policy`.

**Future consequences:** The Canvas can recurse into an OS Installation while editing the underlying Definition through versioned drafts.

**Reversibility:** Low after package and installation schemas are published.

## D-005. Reuse scheduler mechanisms without creating a second scheduler authority

**Status:** DEFERRED pending single-authority proof and operator ratification

**Decision:** AGK owns canonical Automation, Loop Deployment, Mission and scheduling state. Hermes cron and session loop mechanisms may be reused only as runtime trigger providers behind an adapter, with AGK ids, policy, bounds and events remaining authoritative.

**Context:** The earlier F22 text disables Hermes cron to avoid two schedulers. The refined prompt correctly asks not to rebuild a functioning scheduler.

**Options:** Disable all Hermes scheduling; let Hermes jobs become canonical; reuse trigger and execution mechanics behind AGK control-plane state.

**Chosen:** Permit an architecture spike only. `schedule_trigger` remains unpublished for governed use until Hermes storage, provider fallback and crash disposition are proven single-authority and the result is ratified.

**Why:** It avoids duplicated execution code without surrendering AGK orchestration semantics.

**Hermes impact:** Likely ADAPT through `CronScheduler` and `run_job` seams, not an `AGKCronEngine` fork.

**AGK impact:** No Hermes job is allowed to exist outside a corresponding AGK Automation or operational exception.

**Future consequences:** If dual persistence cannot be made fail-closed, the scheduler adapter is deferred and AGK uses only the execution path.

**Reversibility:** High before the adapter is implemented.

## D-006. One shell, five bounded universe layouts

**Status:** RATIFIED by AGK AD-314 for the shell, universe ids and Build modes

**Decision:** The desktop exposes one persistent shell with a top-level universe switcher. Selecting Collective, Learn, Build, Deals or Evolve changes the lazy-loaded navigation module, workspace layout, inspector capabilities and optional status bar while identity, Organization context, search, inbox, notifications and object references remain shared. Build adds Operate, Design, Code and Inspect modes.

**Context:** The operator proposed a top-bar menu that completely switches the layout for each universe.

**Options:** Five separate applications; five cosmetic tabs over one unchanged layout; one shell with bounded universe modules and context-preserving transitions.

**Chosen:** One shell with bounded surface modules.

**Why:** It implements AGK AD-001, AD-076 and AD-314 while allowing each universe to have the right complexity.

**Hermes impact:** Reuse gateway and transport behavior directly. Treat the Electron contribution registry, routes, panes, titlebar, palette and profile-routing UX as extraction candidates and test references for the canonical Web and Tauri shell.

**AGK impact:** Universe ids are stable product keys. Self remains a privacy domain, and Code remains a Build mode. Presentation cannot change object or event contracts.

**Future consequences:** Collective owns Community and network presentation without duplicating Member identity. Evolve presents private Self data through explicit authorization. The validated Hermes plugin spike is interaction evidence, not domain state.

**Reversibility:** High for labels, low for shared-shell identity and surface ids.

## D-007. Canonical AGK clients reuse Hermes behavior without making Electron the product shell

**Status:** RATIFIED for the client targets, PROPOSED for the extraction plan

**Decision:** The reference client remains AGK Web, the desktop client remains its Tauri wrapper, and mobile remains Expo, as the AGK locked stack requires. Hermes Electron is a behavioral reference, runtime control surface and optional transition prototype. Reuse proceeds through transport, gateway, component or behavior extraction into the canonical clients, never by silently making Electron the final AGK shell.

**Context:** The Hermes desktop plugin SDK supports routes, sidebar entries, panes, titlebar items, palette commands, themes, gateway RPC and scoped backend APIs. The AGK canon independently locks Next.js Web, Tauri desktop and Expo mobile. The public SDK also cannot programmatically apply an existing layout preset and Hermes panes do not implement canonical Stax semantics.

**Options:** Replace the locked AGK clients with Hermes Electron; rebuild every Hermes behavior; keep canonical AGK clients and extract only proven reusable behavior and contracts.

**Chosen:** Keep canonical AGK clients and use an evidence ladder for extraction.

**Why:** It preserves the ratified client architecture while avoiding a second Agent runtime, terminal, gateway or execution state layer.

**Hermes impact:** No AGK product routes are required in Hermes core. A desktop plugin may prove an interaction temporarily. Neutral reusable seams or components are extracted only after license, behavior and upstream review.

**AGK impact:** AGK Web and Tauri own product identity, Stax, surface switching, Canvas and Inspector. They consume Hermes through shared runtime contracts and gateway adapters.

**Future consequences:** Web and desktop parity is designed once. Mobile implements the same object and command semantics with reduced authoring capability. Hermes Electron can remain available as an expert runtime console.

**Reversibility:** Low for the locked client targets, high for which Hermes UI behaviors are extracted.

## D-008. Security boundary is outside the in-process plugin layer

**Status:** RATIFIED by Hermes security posture and AGK governance requirements

**Decision:** AGK never treats Hermes plugin capabilities, command approval patterns, toolsets or redaction as containment. Tenant and adversarial-input isolation requires a whole-process OS boundary plus AGK authorization at every action.

**Context:** `SECURITY.md` states that the operating system is the only security boundary against an adversarial model. Plugins run in-process with full agent privileges.

**Options:** Rely on hooks and allowlists as sandboxing; isolate terminal commands only; run each governed Hermes process inside a declared whole-process sandbox and mediate its external effects.

**Chosen:** Whole-process isolation for governed or untrusted workloads, with hooks as policy and observability seams rather than containment.

**Why:** An in-process plugin can read the same credentials and memory as the agent process.

**Hermes impact:** One profile per AGK Agent instance is necessary but not sufficient. The process tree must receive the appropriate OS sandbox, network and secret policy.

**AGK impact:** `pre_tool_call` can deny an action, but the Runtime and egress boundary enforce what a compromised process can physically reach.

**Future consequences:** AGK cannot claim multi-tenant isolation from `HERMES_HOME` separation alone.

**Reversibility:** Low.

## D-009. Analysis and architecture tooling are allowed before the Build Gate

**Status:** RATIFIED by the operator prompt and current gate state

**Decision:** Documentation, static audit collectors and architecture validators may be created in `agk-upgrade`. Product implementation and production behavior changes remain prohibited until reconciliation and architecture validation pass and the relevant Build Gate is affirmatively opened.

**Context:** The AGK-OS audit passed technically, but the operator explicitly kept its Build Gate closed. The new prompt also says analysis first and no production code before reconciliation.

**Options:** Stop all work; treat the new prompt as automatic gate ratification; allow evidence and specification work while keeping product execution closed.

**Chosen:** Allow evidence and specification work only.

**Why:** This satisfies the new audit mission without contradicting the explicit closed-gate decision.

**Hermes impact:** No production files are modified during the architecture phase.

**AGK impact:** Every implementation task remains planned or deferred, never represented as built.

**Future consequences:** Implementation requires a fresh exact-snapshot validation and operator authorization.

**Reversibility:** High.

## D-010. Upstream identity and merge direction

**Status:** RATIFIED for this fork

**Decision:** `origin` remains `NousResearch/hermes-agent` and is the upstream fetch reference. `fork` remains `agentik-os/hermes-agent` and is the AGK publication destination. AGK work is isolated on `agk/upgrade-architecture` until review.

**Context:** The checkout has both remotes and was on upstream `main` at the pinned commit.

**Options:** Replace origin with the fork; work directly on main; keep the two-remote model and a dedicated branch.

**Chosen:** Keep the two-remote model and dedicated branch.

**Why:** It makes upstream comparison and intentional AGK publication explicit.

**Hermes impact:** Upstream updates are fetched, reviewed against the compatibility contract and merged through the playbook rather than pulled blindly. Governed guest bundles contain no stock update authority and are replaced only by a signed AGK Runtime deployment.

**AGK impact:** AGK commits do not masquerade as upstream state.

**Future consequences:** CI and release automation must name the correct remote explicitly.

**Reversibility:** High.
