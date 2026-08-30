@file:prompt.md

GIT ADD ALL PUSH

then : Prompt: AGK Upgrade Architecture on Top of Hermes

You are working inside a fork of NousResearch/hermes-agent.

Your mission is not to rebuild Hermes.

Your mission is to transform Hermes into the execution foundation of AGK, while preserving as much of Hermes’ existing capabilities as possible and implementing only the missing AGK-specific layers.

Create a new top-level folder:

/agk-upgrade

This folder must become the single source of truth for all AGK-specific extensions, architecture decisions, mappings, specifications, migration plans and implementation work required to evolve Hermes into AGK.

Do not start by coding blindly.

First understand Hermes completely.

Then understand AGK completely.

Then determine the exact delta between both systems.

Then build only that delta.

⸻

1. Core principle

Follow this rule throughout the project:

Reuse before extend. Extend before wrap. Wrap before rewrite. Rewrite only when Hermes fundamentally prevents the AGK architecture.

Never rebuild functionality already provided adequately by Hermes.

Never duplicate Hermes concepts under AGK names unless there is a genuine semantic difference.

Every proposed AGK feature must first answer:

1. Does Hermes already provide this?
2. Does Hermes partially provide this?
3. Can Hermes be extended cleanly?
4. Does AGK need an abstraction above Hermes?
5. Is a rewrite genuinely necessary?

For every component, explicitly classify it as:

REUSE
EXTEND
WRAP
ADAPT
REPLACE
NEW
DEFER

⸻

2. AGK product vision

AGK is:

The Agentic Organization Operating System

AGK is not simply an AI agent, coding assistant, workflow builder or chat application.

AGK allows users to create, operate and evolve intelligent organizations around outcomes.

The canonical ontology is:

Models       = cognition
Prompts      = instructions
Tools        = capabilities
Skills       = reusable procedures
Agents       = workers
Oracles      = persistent domain owners
Teams        = bounded functional groups
Workforces   = deployed organizational systems
Flows        = processes
Graphs       = execution topology
Loops        = iteration
Harnesses    = execution environments
Memory       = preserved experience
Knowledge    = reusable truth
Artifacts    = structured work and outputs
Labs         = research and intelligence improvement
OS           = persistent domain intelligence
Projects     = intelligent organizations around outcomes
AGK          = control plane operating and connecting everything

Critical distinction:

Agents are workers.
OSs are intelligence systems.
Oracles are owners.
Projects are organizations.
AGK is the control plane.

AGK must remain:

project-first
outcome-first
organization-first

Not:

asset-first
prompt-first
workflow-first
agent-first

⸻

3. AGK product universes

The wider ecosystem contains:

AGK Learn
AGK Build
AGK Earn
AGK Evolve

For this repository, prioritize the technology foundation required by AGK Build and AGK Runtime.

Do not unnecessarily implement Learn, Earn or Evolve product surfaces here unless shared infrastructure is required.

Architect shared primitives so these surfaces can consume them later.

⸻

4. Target architecture

Hermes should evolve toward becoming the execution/runtime foundation underneath AGK.

Conceptually:

                    AGK
             CONTROL PLANE
                   │
     ┌─────────────┼─────────────┐
     │             │             │
 Projects      Workforces       OS
     │             │             │
 Oracles        Teams        Knowledge
     │             │             │
     └─────────────┼─────────────┘
                   │
             AGK Runtime API
                   │
              Hermes Core
                   │
 ┌─────────────────┼────────────────────┐
 │                 │                    │
Models           Tools                Skills
Memory           MCP                  Shell
Sandbox          Scheduler            Gateways
Subagents        Providers            Execution

Hermes is therefore not the AGK product identity.

Hermes is an important runtime foundation.

AGK owns the higher-level product ontology, orchestration, persistent organization model, UX and control plane.

⸻

5. First task: perform a complete Hermes capability audit

Before defining AGK work, inspect the entire Hermes repository.

Study:

source tree
documentation
README
CLI
agent loops
agent runtime
tool system
skill system
memory
context management
subagents
task delegation
scheduling
MCP
providers
model routing
sandboxes
Docker
SSH
remote execution
gateways
Telegram
Discord
terminal integration
browser capabilities
filesystem capabilities
sessions
configuration
hooks
event systems
state
storage
observability
logging
prompt loading
system prompts
agent definitions
authentication if present
APIs
web interfaces
tests
deployment
package structure
extension points

Do not rely only on documentation.

Read the actual implementation.

Build a comprehensive Hermes capability map.

Create:

/agk-upgrade/01-hermes-audit/

With at minimum:

CAPABILITY_MAP.md
ARCHITECTURE_MAP.md
RUNTIME_MAP.md
TOOLS_MAP.md
SKILLS_MAP.md
MEMORY_MAP.md
SUBAGENTS_MAP.md
MCP_MAP.md
PROVIDERS_MAP.md
SANDBOX_MAP.md
GATEWAYS_MAP.md
SCHEDULER_MAP.md
CONFIG_MAP.md
EXTENSION_POINTS.md
LIMITATIONS.md
TECHNICAL_DEBT.md

Each document must contain actual code references.

Use paths, modules, classes and functions.

Do not write generic documentation.

⸻

6. Build a Hermes capability registry

Create a machine-readable registry:

/agk-upgrade/01-hermes-audit/hermes-capabilities.yaml

Example schema:

capabilities:
  memory:
    status: native
    implementation:
      files: []
      classes: []
      functions: []
    capabilities: []
    limitations: []
    agk_relevance: high
  subagents:
    status: native
    implementation:
      files: []
    capabilities: []
    limitations: []
    agk_relevance: high

Cover every important Hermes primitive.

This registry will later be compared programmatically against AGK requirements.

⸻

7. Define AGK requirements independently

Create:

/agk-upgrade/02-agk-spec/

Do not distort AGK’s architecture simply to fit Hermes.

Define the ideal AGK system first.

At minimum document:

AGK_VISION.md
AGK_ONTOLOGY.md
AGK_ARCHITECTURE.md
AGK_OBJECT_MODEL.md
AGK_RUNTIME_CONTRACT.md
AGK_CONTROL_PLANE.md
AGK_PROJECT_MODEL.md
AGK_ORACLE_MODEL.md
AGK_AGENT_MODEL.md
AGK_TEAM_MODEL.md
AGK_WORKFORCE_MODEL.md
AGK_OS_MODEL.md
AGK_MEMORY_MODEL.md
AGK_KNOWLEDGE_MODEL.md
AGK_ARTIFACT_MODEL.md
AGK_LABS_MODEL.md
AGK_FLOW_MODEL.md
AGK_GRAPH_MODEL.md
AGK_LOOP_MODEL.md
AGK_HARNESS_MODEL.md
AGK_TOOL_MODEL.md
AGK_SKILL_MODEL.md
AGK_PROMPT_MODEL.md
AGK_MODEL_ROUTING.md
AGK_OBSERVABILITY.md
AGK_EVALUATION.md
AGK_GOVERNANCE.md
AGK_SECURITY.md
AGK_PERMISSIONS.md
AGK_VERSIONING.md

⸻

8. Core AGK objects

At minimum, investigate and specify these first-class objects.

Project

A Project is not a folder.

A Project is:

an intelligent organization assembled around an outcome.

A project may contain:

objectives
context
knowledge
memory
artifacts
repositories
agents
oracles
teams
workforces
OSs
skills
tools
flows
graphs
loops
harnesses
sessions
events
evaluations
permissions
members
machines
deployments

⸻

Agent

An Agent is a worker.

It should have:

identity
role
instructions
model policy
tools
skills
memory scope
knowledge access
permissions
runtime
environment
goals
tasks
communication
observability
evaluation
version

Determine exactly what Hermes already provides.

⸻

Oracle

An Oracle is NOT merely a long-running agent.

An Oracle is:

a persistent owner of a domain inside an intelligent organization.

Examples:

Product Oracle
Engineering Oracle
Growth Oracle
Research Oracle
Finance Oracle
Brand Oracle
Operations Oracle

An Oracle should potentially own:

domain memory
domain knowledge
domain state
domain artifacts
agents
teams
objectives
policies
evaluation
context
communications
continuous responsibilities

Investigate whether Hermes primitives can implement this cleanly.

⸻

Team

A Team is:

a bounded group responsible for one functional domain or mission.

Examples:

Frontend Team
Research Team
Content Team
Acquisition Team
QA Team

⸻

Workforce

A Workforce is:

a deployable organizational system containing agents, teams, Oracles and operating rules.

It should eventually be:

versionable
forkable
shareable
installable
deployable
publishable
commercializable

⸻

OS

An OS is:

persistent domain intelligence.

Examples:

Research OS
Mindset OS
Strategy OS
Sales OS
Builder OS
Design OS
Librarian OS
Decision OS

An OS may include:

system instructions
knowledge
skills
tools
memory
agents
flows
evaluations
governance
artifacts
templates
commands

Do not model OS as just another prompt.

⸻

9. Compare Hermes and AGK

Create:

/agk-upgrade/03-gap-analysis/

Generate:

FEATURE_MATRIX.md
ONTOLOGY_MAPPING.md
CAPABILITY_GAPS.md
DUPLICATION_RISKS.md
SEMANTIC_CONFLICTS.md
REUSE_PLAN.md
EXTENSION_PLAN.md
REWRITE_DECISIONS.md

Create a matrix such as:

AGK Capability	Hermes Equivalent	Coverage	Decision
Agent	Hermes agent	80%	EXTEND
Skills	Hermes skills	95%	REUSE
Tools	Hermes tools	95%	REUSE
Memory	Hermes memory	70%	EXTEND
Oracle	none	15%	NEW
Team	subagent grouping?	30%	NEW/WRAP
Workforce	none	10%	NEW
Project	session/workspace?	20%	NEW
OS	skills/prompts?	25%	NEW
MCP	Hermes MCP	100%	REUSE
Sandbox	Hermes sandbox	95%	REUSE
Scheduler	Hermes scheduler	90%	REUSE
Gateway	Hermes gateways	90%	EXTEND
Model routing	Hermes providers	?	AUDIT

Numbers must be based on actual repository analysis.

⸻

10. Create an AGK compatibility layer

Avoid invasive modifications to Hermes wherever possible.

Create a clean internal architecture that separates:

Hermes upstream
AGK compatibility/adapters
AGK runtime abstractions
AGK domain objects
AGK control plane

Prefer architecture similar to:

hermes-agent/
│
├── existing Hermes code
│
├── agk/
│   ├── runtime/
│   ├── adapters/
│   ├── domain/
│   ├── orchestration/
│   ├── persistence/
│   ├── control_plane/
│   ├── api/
│   └── services/
│
└── agk-upgrade/
    └── architecture + implementation SSOT

Do not move existing Hermes code unnecessarily.

Keep upstream mergeability.

⸻

11. Define a runtime interface

Introduce an abstraction so AGK does not become permanently coupled to Hermes internals.

Conceptually:

class AgentRuntime:
    async def create_agent(...)
    async def run_agent(...)
    async def stop_agent(...)
    async def spawn_subagent(...)
    async def execute_tool(...)
    async def install_skill(...)
    async def get_memory(...)
    async def schedule(...)
    async def stream_events(...)

Hermes then implements:

HermesRuntimeAdapter

Long-term AGK could theoretically support:

HermesRuntime
CodexRuntime
ClaudeRuntime
LocalRuntime
RemoteRuntime
CustomRuntime

Do not over-engineer adapters that are not needed today, but preserve this architectural boundary.

⸻

12. Model provider architecture

AGK must be model-agnostic.

Audit all Hermes provider capabilities.

AGK should ultimately support routing across providers such as:

OpenAI
Anthropic
Google
OpenRouter
local models
self-hosted models
Nous models
future providers

Separate:

model
provider
credential
routing policy
runtime
agent

An Agent should not be structurally coupled to one provider.

Support potential policies such as:

preferred model
fallback model
cost ceiling
latency preference
reasoning level
context requirement
task-specific routing
automatic routing

Reuse Hermes wherever possible.

⸻

13. Machines and runtimes

AGK should eventually execute on:

local machine
desktop
VPS
Docker
SSH host
cloud machine
remote worker
sandbox

Audit Hermes support before adding anything.

Define:

Machine
Runtime
Environment
Sandbox
Deployment
ExecutionTarget

Avoid duplicate abstractions.

⸻

14. Sessions and terminals

AGK should support rich sessions potentially containing:

chat
terminal
agent runs
subagents
tasks
artifacts
execution logs
tool calls
memory
context
files
repository
evaluations

Audit Hermes’ session model.

Determine whether the existing model can become the underlying implementation.

⸻

15. Artifacts

Introduce first-class Artifacts.

Artifacts can include:

documents
plans
reports
code
designs
datasets
research
images
files
generated applications
structured outputs
decisions
evaluations

Artifacts should have provenance:

created_by
project
agent
oracle
session
task
timestamp
inputs
dependencies
version
status

⸻

16. Memory and knowledge

Do not conflate:

memory
knowledge
context
artifacts
files
logs

Define precise boundaries.

Memory = experience retained by the system.

Knowledge = reusable truth.

Context = information currently loaded for cognition.

Artifact = structured work output.

Audit Hermes’ memory system and extend it rather than replacing it unless necessary.

⸻

17. Communication layer

AGK agents, Oracles and humans must eventually communicate.

Potential channels:

internal messaging
events
task delegation
agent-to-agent
agent-to-oracle
oracle-to-team
human-to-agent
human-to-oracle
Telegram
Discord
mobile push
web
desktop
API

Reuse Hermes gateways wherever applicable.

Create a normalized communication/event model above them if needed.

⸻

18. Events and observability

AGK must be inspectable.

Create an event model supporting events such as:

agent.created
agent.started
agent.completed
agent.failed
task.created
task.assigned
task.completed
tool.started
tool.completed
tool.failed
oracle.decision
oracle.delegated
artifact.created
memory.updated
knowledge.updated
workforce.deployed
evaluation.completed

Audit Hermes’ existing logging/hooks/events first.

Extend rather than duplicate.

⸻

19. Evaluations

AGK must support systematic quality control.

Eventually:

task evaluations
agent evaluations
workflow evaluations
workforce evaluations
OS evaluations
oracle evaluations
artifact evaluations
regression tests
benchmarks
human feedback
automated judges

Create evaluation primitives only where Hermes does not already have sufficient equivalents.

⸻

20. AGK Architect

Define AGK Architect as the meta-builder of the ecosystem.

Its responsibility is to create or modify:

Agents
Oracles
Teams
Workforces
OSs
Skills
Tools
Flows
Graphs
Loops
Harnesses
Projects

Architect should understand the AGK ontology and validate generated systems.

Do not implement Architect until foundational object schemas exist.

⸻

21. AGK Labs

Labs are:

systems dedicated to research, experimentation, evaluation and improvement of intelligence.

Labs may eventually:

research
benchmark
evaluate
compare models
improve prompts
improve skills
improve agents
analyze failures
propose upgrades
run experiments
generate knowledge

Specify the abstraction but avoid premature implementation if core architecture is not ready.

⸻

22. Versioning

AGK objects should eventually support version history where relevant:

Agent versions
Skill versions
Tool versions
OS versions
Workforce versions
Oracle versions
Flow versions
Graph versions

Investigate whether Git can serve some of this naturally.

Do not create a redundant version system if repository-native versioning works better.

⸻

23. Marketplace readiness

Do not build the marketplace yet unless instructed.

However, design objects so they could eventually be:

exported
packaged
forked
installed
shared
published
sold
updated
rated
verified

Potential package types:

Skill
Agent
OS
Workforce
Tool
Template
Project Template
Integration

⸻

24. Multi-user and organizations

AGK will eventually require:

users
organizations
memberships
roles
permissions
projects
teams
shared resources
billing
ownership

Do not pollute Hermes runtime primitives with SaaS concerns.

Keep this primarily in the AGK control-plane layer.

⸻

25. Security model

Define boundaries for:

tool permissions
filesystem permissions
network permissions
MCP permissions
machine access
secrets
repository permissions
project permissions
user permissions
organization permissions
agent permissions
Oracle authority
sandbox levels

Reuse Hermes sandbox/security primitives.

Build missing governance above them.

⸻

26. Upstream compatibility

This is critical.

We are forking Hermes, but we want to continue benefiting from future Hermes improvements.

Create:

/agk-upgrade/04-upstream-strategy/

Including:

UPSTREAM_POLICY.md
PATCH_POLICY.md
MERGE_STRATEGY.md
HERMES_FILES_MODIFIED.md
AGK_EXTENSION_POINTS.md
UPGRADE_PLAYBOOK.md

For every direct modification of Hermes code, record:

file
reason
AGK requirement
whether adapter was impossible
expected upstream conflict risk

Minimize core patches.

⸻

27. Implementation roadmap

Create:

/agk-upgrade/05-roadmap/

Generate a dependency-aware plan.

Suggested phases:

PHASE 0
Hermes audit
PHASE 1
AGK ontology and schemas
PHASE 2
Hermes runtime adapter
PHASE 3
Project primitive
PHASE 4
Agent extension model
PHASE 5
Oracle primitive
PHASE 6
Teams and Workforces
PHASE 7
OS primitive
PHASE 8
Artifacts / Knowledge / Memory alignment
PHASE 9
Events / observability
PHASE 10
Control plane APIs
PHASE 11
Architect
PHASE 12
Labs
PHASE 13
Marketplace foundations
PHASE 14
Cloud / multi-user product layers

Challenge this sequence based on actual dependencies.

⸻

28. Implementation tasks

Create granular task files under:

/agk-upgrade/06-implementation/

For example:

001-runtime-interface.md
002-hermes-runtime-adapter.md
003-project-schema.md
004-agent-extension.md
005-oracle-schema.md
006-team-schema.md
007-workforce-schema.md
...

Every task must contain:

objective
why it exists
Hermes capabilities reused
files inspected
files to create
files to modify
schemas
interfaces
API impact
migration impact
tests
acceptance criteria
risks
dependencies

⸻

29. Decision log

Create:

/agk-upgrade/DECISIONS.md

Every architectural decision should use:

Decision:
Context:
Options:
Chosen:
Why:
Hermes impact:
AGK impact:
Future consequences:
Reversibility:

Never make hidden architectural decisions.

⸻

30. AGK ↔ Hermes mapping registry

Create:

/agk-upgrade/agk-hermes-map.yaml

Example:

agk:
  agent:
    hermes:
      coverage: partial
      components: []
    strategy: extend
  oracle:
    hermes:
      coverage: minimal
      components: []
    strategy: new
  skill:
    hermes:
      coverage: native
      components: []
    strategy: reuse

Keep this updated throughout development.

⸻

31. AGK implementation boundaries

The following should generally remain Hermes responsibilities when Hermes already implements them well:

base agent execution
LLM calls
tool invocation
skills loading
MCP
sandbox execution
shell
subprocess execution
provider integrations
context handling
subagent runtime
scheduler primitives
gateway primitives
basic memory primitives

AGK should focus on missing higher-order capabilities:

Project organization
Oracle ownership
Team semantics
Workforce orchestration
OS semantics
Artifact system
Knowledge architecture
organization-level memory
control plane
cross-agent coordination
persistent domain ownership
governance
evaluation
visual orchestration
higher-level runtime management
multi-machine organization
product-facing APIs
multi-user organization layer
marketplace-ready packaging

This list is provisional.

The Hermes audit determines final boundaries.

⸻

32. No blind renaming

Do not rename Hermes concepts just to make them sound AGK-branded.

Example:

If Hermes has a Tool, AGK should normally use the Hermes Tool primitive.

Do not create:

HermesTool
AGKTool
ToolV2
CapabilityTool

without genuine architectural necessity.

AGK vocabulary should sit at the correct abstraction level.

⸻

33. No premature UI

Do not start by building dashboards.

First establish:

domain model
runtime contracts
storage model
event model
APIs
orchestration
tests

The UI will consume these later.

⸻

34. No unnecessary rewrites

If Hermes has 90% of a solution, implement the remaining 10%.

Do not replace functioning infrastructure because a greenfield implementation feels cleaner.

The objective is:

maximize AGK differentiation while minimizing duplicated infrastructure.

⸻

35. Code quality standards

All new AGK code should be:

typed
modular
testable
documented where necessary
dependency-injected when useful
event-aware
observable
provider-agnostic
runtime-aware
secure by default

Avoid:

god classes
global mutable state
hidden coupling
duplicated schemas
magic strings
premature abstractions
framework-heavy architecture without need

⸻

36. Tests

Every implemented feature requires appropriate tests.

Include:

unit tests
integration tests
runtime tests
regression tests where Hermes behavior could be affected

Most importantly:

Existing Hermes capabilities must continue working after AGK extensions.

Run Hermes’ existing test suite where possible.

⸻

37. Definition of done for each AGK feature

A feature is not complete merely because code exists.

It must have:

architecture documented
Hermes reuse documented
schema defined
implementation complete
tests passing
events observable
errors handled
security considered
API defined if applicable
migration considerations documented
AGK mapping registry updated
decision log updated if architectural decisions were made

⸻

38. Initial execution sequence

Begin with analysis only.

Do not immediately modify production code.

Execute in this order:

Step 1

Inspect the entire repository structure.

Step 2

Read Hermes documentation.

Step 3

Trace major runtime flows through the actual code.

Step 4

Generate /agk-upgrade/01-hermes-audit.

Step 5

Generate /agk-upgrade/02-agk-spec.

Step 6

Generate /agk-upgrade/03-gap-analysis.

Step 7

Generate the Hermes ↔ AGK capability matrix.

Step 8

Propose the minimum architecture changes.

Step 9

Generate the implementation roadmap.

Step 10

Only then begin implementation.

⸻

39. Questions you must continuously answer

Throughout the repository analysis ask:

What can Hermes already do?
What does Hermes do better than what we planned?
Which AGK ideas are already solved?
Which concepts overlap but have different semantics?
Where can Hermes become the underlying primitive?
Where do we need an AGK abstraction?
Where would modifying Hermes make upstream merges painful?
Which AGK features create genuine differentiation?
Which architecture decisions would create technical debt later?
Which primitives need to become first-class database objects?
Which things can simply remain configuration or files?
Which components require persistent state?
Which components require events?
Which components require versioning?
Which components need human permissions?
Which components need agent permissions?
What should execute locally?
What belongs in the cloud/control plane?

⸻

40. Challenge AGK assumptions

Do not blindly implement this specification.

Act as a principal architect.

If Hermes reveals a better implementation strategy, document it.

If an AGK concept duplicates another concept, flag it.

If two AGK objects should actually be one, explain why.

If one concept needs to be split into several primitives, explain why.

If a planned AGK capability belongs in Hermes runtime rather than AGK control plane, say so.

If a proposed architecture creates unnecessary complexity, reject it.

Preserve the product vision, but challenge implementation assumptions.

⸻

41. Required final architecture deliverable

Before major implementation, produce:

/agk-upgrade/AGK_HERMES_MASTER_BLUEPRINT.md

It must explain:

1. Hermes architecture today
2. Hermes capabilities we retain
3. Hermes capabilities we extend
4. Hermes limitations
5. AGK architecture
6. AGK domain model
7. Hermes ↔ AGK mappings
8. missing capabilities
9. runtime abstraction
10. persistence architecture
11. events architecture
12. security model
13. machine/runtime architecture
14. project architecture
15. agent architecture
16. oracle architecture
17. team architecture
18. workforce architecture
19. OS architecture
20. artifact architecture
21. memory architecture
22. knowledge architecture
23. Architect architecture
24. Labs architecture
25. future marketplace compatibility
26. upstream Hermes strategy
27. technical roadmap
28. implementation dependency graph
29. risks
30. explicit non-goals

This document becomes the architectural SSOT for the Hermes → AGK evolution.

⸻

42. Final objective

At the end of this transformation, the repository should not feel like:

Hermes with a few AGK features.

It should feel like:

AGK, powered by a heavily leveraged Hermes runtime foundation.

Hermes should save us from rebuilding solved infrastructure.

AGK should provide the higher-order system Hermes does not attempt to provide:

persistent intelligent organizations
projects
domain ownership
Oracles
teams
workforces
OS intelligence
organizational memory
knowledge
artifacts
governance
control plane
multi-runtime orchestration
organization-level collaboration
system creation
system evolution

The success metric is not how much code we add.

The success metric is:

How much of Hermes we can intelligently leverage while adding the smallest possible amount of architecture necessary to create the full AGK vision.

Oui, là tu tiens quelque chose de très fort. Mais je ne garderais pas exactement cette structure comme interface finale d’AGK.

L’écran actuel est excellent comme power-user / developer interface, parce qu’il donne immédiatement accès aux sessions, fichiers, terminal, tâches et runtime. En revanche, si AGK doit devenir un véritable Agentic Organization Operating System, il faut que l’interface reflète l’organisation que l’utilisateur construit, pas l’implémentation technique de Hermes.

La règle fondamentale

Je structurerais AGK autour de cette hiérarchie :

AGK
│
├── Organization
│   │
│   ├── Projects
│   │   ├── Objectives
│   │   ├── Oracles
│   │   ├── Teams
│   │   ├── Agents
│   │   ├── Workflows
│   │   ├── Knowledge
│   │   ├── Artifacts
│   │   └── Runtime
│   │
│   ├── Workforces
│   ├── OS
│   ├── Knowledge
│   ├── Assets
│   └── Settings
│
└── AGK Runtime
    └── Hermes

La différence est importante :

Hermes pense en sessions et agents.
AGK doit penser en projets, organisations et outcomes.

Hermes reste derrière.

⸻

1. Le layout principal

Je garderais exactement l’idée de ton écran actuel : 3 colonnes + bottom drawer.

Mais je modifierais leur rôle.

┌─────────────────────────────────────────────────────────────────────────────┐
│ AGK   Organization / Project                         Search     Run     User │
├───────────────┬──────────────────────────────────────────┬──────────────────┤
│               │                                          │                  │
│ NAVIGATION    │             WORKSPACE                    │    CONTEXT       │
│               │                                          │    INSPECTOR     │
│ Projects      │                                          │                  │
│ Oracles       │ Chat / Artifact / Graph / Tasks / etc.  │ Files            │
│ Teams         │                                          │ Properties       │
│ Agents        │                                          │ Memory           │
│ Workforces    │                                          │ Context          │
│ OS            │                                          │ Runs             │
│ Knowledge     │                                          │ Git              │
│               │                                          │                  │
├───────────────┴──────────────────────────────────────────┴──────────────────┤
│ Terminal / Runtime / Logs / Events / Problems                              │
└─────────────────────────────────────────────────────────────────────────────┘

C’est selon moi la bonne fondation.

⸻

2. Ta colonne gauche actuelle

Aujourd’hui tu as :

Sessions
Bots
New session
Capabilities
Messaging
Artifacts
Scheduled jobs
Fleet Sessions

Pour Hermes c’est logique.

Pour AGK, je la transformerais.

Niveau global

AGK
⌘ Search / Command
HOME
Organizations
Projects
BUILD
Oracles
Agents
Teams
Workforces
OS
Flows
INTELLIGENCE
Knowledge
Memory
Artifacts
Labs
RUNTIME
Machines
Sessions
Scheduled Jobs
Deployments

Mais il ne faut surtout pas afficher les 15 éléments en permanence.

La navigation doit changer avec le contexte.

⸻

3. Project devient le centre

Quand j’ouvre :

AGK / AGK Build

la sidebar devient :

AGK BUILD
Overview
Work
  Tasks
  Sessions
  Runs
Organization
  Oracle
  Teams
  Agents
  Workforces
Intelligence
  OS
  Knowledge
  Memory
Build
  Flows
  Graphs
  Skills
  Tools
Outputs
  Artifacts
Runtime
  Machines
  Deployments
  Jobs

Et là AGK commence réellement à se différencier.

Parce que l’utilisateur n’a plus besoin de se demander :

« Quel agent dois-je lancer ? »

Il dit :

« Je veux lancer AGK Build. »

Le système sait quelle organisation travaille derrière.

⸻

4. Le centre doit être polymorphe

Là où ton interface devient vraiment intéressante, c’est si la grande zone centrale n’est pas seulement un chat.

Elle doit pouvoir afficher différents types de vues.

Par exemple :

CHAT

comme actuellement.

Mais également :

ARTIFACT

document, code, recherche, design, rapport.

BOARD

tasks / kanban.

GRAPH

agents, Oracles, workflows, dependencies.

ORGANIZATION

visualisation de l’équipe.

CODE

éditeur.

TERMINAL

terminal plein écran.

LAB

experiments / evals.

DASHBOARD

KPIs / project status.

Ça donne :

                 Project AGK
 Chat   Tasks   Artifacts   Graph   Organization   Runtime
 ─────────────────────────────────────────────────────────
                   MAIN WORKSPACE

⸻

5. Le chat reste extrêmement important

Je ferais même du chat l’interface universelle de commande AGK.

Mais tu ne discutes pas nécessairement avec « Hermes ».

Tu discutes avec :

Project
Oracle
Agent
Team
Workforce
OS

Exemple :

Talk to:
◉ AGK Project
○ Product Oracle
○ Engineering Oracle
○ Growth Oracle
○ Claude Builder
○ Research Team
○ AGK Architect

Ça change complètement le produit.

Tu peux écrire :

Build the onboarding we’ve discussed.

Et Project Oracle détermine :

Product Oracle
    ↓
Design Team
    ↓
Frontend Agent
    ↓
QA Agent

Hermes exécute les agents en dessous.

L’utilisateur ne gère pas nécessairement les appels.

⸻

6. Ton panneau droit est excellent

Le panneau actuellement utilisé comme explorateur de fichiers devrait devenir un Context Inspector universel.

Selon ce que tu sélectionnes, son contenu change.

Si tu sélectionnes un Agent :

ENGINEERING AGENT
Status
● Working
Model
GPT-5.6
Oracle
Engineering Oracle
Current task
Implement authentication
Context
23 resources
Memory
156 entries
Skills
12
Tools
18
Permissions
Filesystem
Git
Terminal
Browser
Machine
MacBook Pro
Runtime
Hermes

Si tu sélectionnes un Project :

AGK BUILD
Outcome
Ship AGK beta
Progress
68%
Oracles
6
Agents
24
Active
7
Tasks
54 / 81
Artifacts
123
Machines
3

Si tu sélectionnes un fichier :

FILE
Preview
History
Git
References
Agents using it
Knowledge relations

Donc le panneau de droite devient extrêmement puissant.

⸻

7. Et ton file explorer actuel ?

Je le garde.

Mais pas comme panneau principal permanent.

Je mettrais des tabs :

Context | Files | Git | Runs | Memory

Le développeur peut cliquer Files.

L’utilisateur normal n’a jamais besoin de regarder .agk, NEXT, TRACEABILITY.md, etc.

⸻

8. Le terminal en bas est parfait

Je garderais exactement cette logique.

Un drawer :

Terminal
Problems
Logs
Events
Runs
Agents

Comme VS Code.

Avec possibilité de :

collapsed
30%
50%
fullscreen

Et surtout :

Terminal: This Device
Terminal: VPS Production
Terminal: Sandbox #27
Terminal: Agent Engineering-04

AGK devient alors également une sorte de mission control multi-machine.

⸻

9. Sessions ne doivent surtout pas disparaître

Mais je changerais leur place.

Aujourd’hui :

Sessions = niveau 1.

Dans AGK :

Organization
    ↓
Project
    ↓
Task
    ↓
Session
    ↓
Run

Une Session devient essentiellement un contexte de travail persistant.

Exemple :

Project
AGK Website
Session
Redesign onboarding
Runs
#42 Claude
#43 Codex
#44 Hermes

C’est beaucoup plus propre.

⸻

10. Je renommerais “Bots”

Clairement.

Pas :

Bots

Mais :

Agents

Ensuite :

Agents
Personal
Project
Team
System

Et surtout les Oracles restent séparés.

Parce que :

Agent = worker
Oracle = owner

C’est une distinction conceptuelle extrêmement importante.

⸻

11. Capabilities devient ton Registry / Library

Ton bouton actuel Capabilities peut devenir quelque chose de beaucoup plus ambitieux :

LIBRARY
Agents
OS
Skills
Tools
MCP
Prompts
Workforces
Templates
Integrations

Avec :

Installed
AGK Official
Community
Private

Ça prépare directement le futur marketplace.

⸻

12. L’interface devrait avoir deux profondeurs

C’est probablement la décision UX la plus importante.

Operator Mode

Pour 80 % des utilisateurs.

Ils voient :

Projects
Chat
Tasks
Artifacts
Teams
Knowledge

Pas besoin de comprendre :

MCP
sandbox
context window
provider routing
SSH
agent process

⸻

Builder Mode

Pour toi, les CAIO et les développeurs.

Ils voient tout :

Agents
Models
Skills
Tools
MCP
Prompts
Flows
Graphs
Loops
Hooks
Runtime
Machines
Terminal
Memory
Context
Logs
Events
Evals

Et tu peux avoir :

⌘ Shift B
Operator
─────────
Builder

Même application.

Pas deux produits.

⸻

13. Je pousserais même vers trois modes

À terme :

Operate

Faire travailler l’organisation.

Projects
Tasks
Chat
Artifacts
Dashboard

Build

Construire l’organisation.

Agents
Oracles
Teams
OS
Workforces
Flows
Skills
Tools

Inspect

Comprendre ce qu’elle fait.

Runs
Memory
Context
Logs
Events
Costs
Evals
Machines

Ça donne une structure conceptuelle exceptionnellement propre :

        AGK
   OPERATE
      │
      ▼
    BUILD
      │
      ▼
   INSPECT

⸻

14. Où mettre AGK Architect

Très visible.

Je mettrais un bouton :

+ Create

Et quand tu cliques :

Create
Project
Agent
Oracle
Team
Workforce
OS
Skill
Tool
Flow
─────────────────
✦ Ask Architect

Ask Architect ouvre :

What do you want to build?

Tu écris :

I need a complete marketing organization for AGK.

Architect crée :

Marketing Oracle
├── Strategy Team
│   ├── Market Research Agent
│   └── Positioning Agent
│
├── Content Team
│   ├── Writer
│   ├── Video Agent
│   └── Distribution Agent
│
└── Growth Team
    ├── Ads Agent
    ├── SEO Agent
    └── Analytics Agent

Puis :

Review architecture
[Deploy workforce]

Ça, c’est une énorme expérience produit.

⸻

15. Le dashboard projet

Quand tu rentres dans un Project, je ne t’envoie même pas immédiatement dans un chat.

Je montrerais :

AGK BUILD
Ship the world's most advanced agentic organization platform.
CURRENT OBJECTIVE
Launch Beta
████████████████░░░ 72%
ORGANIZATION
Product Oracle          Active
Engineering Oracle      Active
Growth Oracle           Waiting
ACTIVE WORK
7 agents working
23 tasks running
3 tasks blocked
RECENT ARTIFACTS
Product Blueprint
Auth Architecture
Landing Page
Pricing Research
ATTENTION
2 decisions required
1 failed run
3 proposed changes
──────────────────────────────
Ask AGK anything...

Tu obtiens vraiment le sentiment :

I am operating an intelligent company.

Pas :

« J’utilise un coding agent. »

⸻

16. Et surtout : ne montre jamais Hermes dans l’UX normale

Pour moi :

Hermes = infrastructure
AGK = product

Exactement comme :

Chromium → Chrome
Electron → Slack
Postgres → Supabase
Linux → Android

Le user peut éventuellement voir :

Runtime: Hermes

dans les paramètres avancés.

Mais jamais :

Welcome to Hermes-powered AGK.

L’identité doit complètement appartenir à AGK.

⸻

17. Ce que je ferais avec ton interface actuelle

Franchement, je ne la détruirais surtout pas.

Ton screenshot est presque déjà le futur :

LEFT
navigation / project tree
CENTER
universal workspace
RIGHT
context inspector
BOTTOM
runtime console

Je ferais simplement évoluer :

Sessions
        ↓
Project workspace
Bots
        ↓
Agents + Oracles
Capabilities
        ↓
Library
Messaging
        ↓
Communications
Artifacts
        ↓
Artifacts
Scheduled jobs
        ↓
Automations
Fleet sessions
        ↓
Runtime / Machines
Files
        ↓
Context Inspector tabs

Donc tu gardes énormément de Hermes UI.

Tu changes surtout le niveau d’abstraction.

⸻

Ma structure cible

AGK
│
├── HOME
│   ├── Today
│   ├── Inbox
│   └── Activity
│
├── PROJECTS
│   └── Project
│       ├── Overview
│       ├── Chat
│       ├── Tasks
│       ├── Organization
│       ├── Artifacts
│       ├── Knowledge
│       └── Runtime
│
├── ORGANIZATION
│   ├── Oracles
│   ├── Teams
│   ├── Agents
│   └── Workforces
│
├── INTELLIGENCE
│   ├── OS
│   ├── Knowledge
│   ├── Memory
│   └── Labs
│
├── BUILD
│   ├── Architect
│   ├── Skills
│   ├── Tools
│   ├── Prompts
│   ├── Flows
│   ├── Graphs
│   └── Harnesses
│
├── LIBRARY
│   ├── Installed
│   ├── AGK
│   ├── Private
│   └── Marketplace
│
└── RUNTIME
    ├── Machines
    ├── Sessions
    ├── Runs
    ├── Jobs
    ├── Logs
    └── Deployments

Et la philosophie UX finale tient en une phrase :

Simple enough to operate an AI organization without understanding agent infrastructure, but deep enough that an expert can open the hood and control absolutely everything.

C’est précisément là que l’interface Hermes que tu as maintenant peut devenir une excellente fondation : on ne remplace pas l’IDE agentique, on construit la couche “organization operating system” au-dessus.

Oui. C’est exactement la couche qu’il manque au-dessus de l’interface actuelle. Ce que je décrivais avant comme Organization / Build, je le transformerais en un véritable visual organization canvas, inspiré de Relevance AI mais poussé beaucoup plus loin grâce à la logique AGK.

L’idée n’est pas juste d’avoir une liste de Teams et d’Agents. Il faut pouvoir voir, éditer et opérer toute l’organisation comme un système visuel.

La vue centrale : Organization Canvas

Quand tu ouvres une Workforce, une Team ou un Project, tu dois pouvoir passer en :

Overview | Canvas | Runs | Knowledge | Artifacts | Settings

Et Canvas devient la vue principale de construction.

Conceptuellement :

┌────────────────────────────────────────────────────────────────────────────┐
│ Marketing Workforce                                      Run / Deploy / Edit│
├──────────────┬────────────────────────────────────────────────┬────────────┤
│ COMPONENTS   │                                                │ INSPECTOR  │
│              │                CANVAS                          │            │
│ Agents       │                                                │ Identity   │
│ Oracles      │      ┌──────────────────────┐                  │ Model      │
│ Teams        │      │   Growth Oracle      │                  │ Prompt     │
│ OS           │      │   Owner: Growth      │                  │ OS         │
│ Skills       │      └──────────┬───────────┘                  │ Knowledge  │
│ Tools        │                 │                              │ Memory     │
│ MCP          │        ┌────────┴────────┐                     │ Skills     │
│ Knowledge    │        │                 │                     │ Tools      │
│ Memory       │        ▼                 ▼                     │ MCP        │
│ Flows        │  Research Team      Content Team               │ Scripts    │
│ Graphs       │      │                   │                     │ Runtime    │
│ Scripts      │      ▼                   ▼                     │ Permissions│
│ Triggers     │   Agents              Agents                   │ Evals      │
│ Outputs      │                                                │            │
└──────────────┴────────────────────────────────────────────────┴────────────┘

Le canvas ne représente donc pas seulement un workflow.

Il représente l’organisation entière.

⸻

Chaque node doit être un objet AGK réel

Tu pourrais déposer dans le canvas :

* Oracle
* Team
* Agent
* OS
* Skill
* Tool
* MCP
* Knowledge
* Memory
* Prompt
* Script
* Flow
* Trigger
* Artifact
* Human
* Machine
* External App

Et chaque objet conserve une vraie identité dans le système.

Par exemple un Agent :

Content Strategist
│
├── Role
├── Instructions
├── Model
├── OS
├── Skills
├── Tools
├── MCP
├── Knowledge
├── Memory
├── Scripts
├── Runtime
├── Permissions
├── Inputs
├── Outputs
└── Evaluation

Ça répond directement à ce que tu dis : setup Sinnest / script / MCP / knowledge / OS / tools / prompts / etc.

Tout est visible et éditable dans un seul endroit.

⸻

Le panneau droit devient le vrai Agent Builder

Tu sélectionnes un Agent dans le canvas et le panneau droit affiche :

CONTENT STRATEGIST
GENERAL
Name
Description
Role
Team
Oracle
INTELLIGENCE
Model
System Prompt
OS
Knowledge
Memory
CAPABILITIES
Skills
Tools
MCP
Scripts
Browser
Terminal
Filesystem
EXECUTION
Runtime
Machine
Sandbox
Timeout
Concurrency
COMMUNICATION
Can message
Can delegate
Reports to
Receives tasks from
AUTONOMY
Allowed actions
Approval requirements
Budget
Escalation rules
QUALITY
Evals
Success criteria
Review policy

C’est quasiment un IDE de worker IA.

⸻

OS doit être une vraie couche dans l’Agent

Et ça, je pense que ça peut être une différenciation majeure d’AGK par rapport aux outils type Relevance.

Au lieu d’avoir simplement :

Agent
├── prompt
├── tools
└── knowledge

AGK aurait :

Agent
│
├── Identity
├── Role
├── OS
│   ├── Instructions
│   ├── Domain Knowledge
│   ├── Skills
│   ├── Procedures
│   ├── Evaluation
│   ├── Memory Policy
│   └── Governance
│
├── Tools
├── MCP
├── Runtime
└── Memory

Donc tu peux dire :

Engineering Agent utilise Builder OS

ou :

Research Oracle utilise Research OS + Librarian OS

Et plusieurs agents peuvent partager le même OS.

Très puissant.

⸻

Knowledge doit être attachable visuellement

Imagine que tu as une node :

AGK Product Knowledge

et que tu la connectes à :

Product Oracle
Engineering Oracle
Design Team
Marketing Team

La relation visuelle signifie réellement :

has_access_to

Autre exemple :

Competitor Research Knowledge
       │
       ├── Growth Oracle
       ├── Strategy Agent
       └── Content Agent

Le canvas devient alors le graphe réel de permissions et de contexte. 

Pas juste un dessin.

⸻

Même logique pour MCP

Tu ajoutes :

GitHub MCP
Linear MCP
Notion MCP
Browser MCP
Supabase MCP
Stripe MCP

Puis tu les branches à certains agents :

Engineering Team
      │
      ├── GitHub
      ├── Linear
      └── Vercel

Alors que :

Finance Oracle
      │
      ├── Stripe
      └── Accounting

Encore une fois, le graph représente réellement le système d’accès.

⸻

Scripts / Code / Skills

Je distinguerais bien :

Prompt
= instructions cognitives
Skill
= procédure réutilisable
Tool
= capacité callable
MCP
= accès externe standardisé
Script
= code directement exécutable
Flow
= séquence orchestrée
Graph
= topologie d’exécution

Donc si tu sélectionnes un Agent :

Skills
  Research Competitors
  Write Positioning
  Analyze Landing Pages
Tools
  Browser
  Web Search
MCP
  Notion
  Linear
Scripts
  scrape_competitors.py
  generate_report.ts

Très lisible.

⸻

Team Canvas

Quand tu rentres dans une Team, tu vois uniquement son périmètre.

Exemple :

CONTENT TEAM
                    Content Oracle
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
     Strategist        Writer        Distributor
           │              │              │
           │              │              ├── X
           │              │              ├── LinkedIn
           │              │              └── Telegram
           │              │
           └──────► Content OS ◄─────────┘
                       │
             Brand Knowledge

Et tu peux zoom out :

Project
   ↓
Workforce
   ↓
Teams
   ↓
Agents

Comme Figma / Miro.

⸻

Workforce Canvas

Une Workforce est un niveau au-dessus.

Exemple :

                 BUSINESS WORKFORCE
                  ┌─────────────┐
                  │ CEO Oracle  │
                  └──────┬──────┘
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
 Product Team       Growth Team       Operations Team
      │                  │                  │
 Product Oracle      Growth Oracle      Ops Oracle
      │                  │                  │
 Agents              Agents              Agents

Et tu peux ouvrir chaque Team.

Ça donne exactement la sensation :

« Voici mon entreprise IA. »

⸻

Et Project Canvas encore au-dessus

Project = organisation autour d’un résultat.

Donc :

AGK PROJECT
Outcome:
Launch AGK Beta
         PRODUCT WORKFORCE
                │
         ENGINEERING WORKFORCE
                │
           GROWTH WORKFORCE
                │
          SUPPORT WORKFORCE
Shared resources:
AGK Knowledge
Codebase
Product OS
Brand OS
Customer Data

Là tu dépasses clairement le simple « multi-agent builder ».

⸻

Les connexions doivent avoir une sémantique

Très important : pas des lignes décoratives façon Miro.

Chaque connexion a un type :

reports_to
delegates_to
uses
has_access_to
reads
writes
triggers
produces
reviews
owns
depends_on
runs_on
communicates_with

Exemple :

Growth Oracle
    --delegates_to-->
SEO Agent
SEO Agent
    --uses-->
SEO OS
SEO Agent
    --has_access_to-->
Search Console MCP
SEO Agent
    --writes-->
Growth Knowledge

Donc ton Canvas devient véritablement le graphe d’exécution de l’organisation.

⸻

Mode Design vs Mode Live

Je ferais deux états très clairs.

Design

Tu construis.

Add agents
Edit prompts
Connect MCPs
Assign OS
Configure knowledge
Set permissions
Create workflows

Live

Tu regardes l’organisation travailler.

Et là les nodes changent visuellement :

● idle
● working
● waiting
● blocked
● failed

Tu vois les événements circuler :

Growth Oracle
      ↓
Research Agent
      ↓
artifact created
      ↓
Strategy Agent
      ↓
Growth Oracle review

Et tu peux cliquer sur n’importe quelle exécution.

Ça, ce serait très fort.

⸻

Mode Debug / Inspect

Troisième couche :

Design | Live | Inspect

Dans Inspect :

Agent run
Model calls
Tool calls
Tokens
Cost
Latency
Memory reads
Knowledge retrieved
MCP calls
Files changed
Errors
Evals

Tu combines la beauté du canvas avec la profondeur technique de Hermes.

⸻

Templates et Workforces préconstruites

Une fois cette logique construite, tu peux faire un système comme :

+ Add Workforce

Puis :

AGK Official
SaaS Engineering
Content Engine
Growth Department
Research Department
Sales Organization
Customer Success
Executive Office
CAIO Workforce

Tu cliques :

Install

et tout apparaît :

Oracles
Teams
Agents
OS
Skills
Tools
MCP requirements
Knowledge schemas
Flows
Evals

Ensuite AGK te demande uniquement les connexions manquantes :

Connect GitHub
Connect Linear
Connect Notion
Select model
Choose repository

Puis :

Deploy Workforce

C’est là que ton marketplace prend énormément de sens.

⸻

Là où je veux dépasser Relevance AI

Je reprendrais leur excellente logique visuelle, mais AGK doit aller plus loin sur cinq dimensions :

Relevance-like	AGK
Agent builder	Agent + OS
Multi-agent team	Oracle + Team + Workforce
Tool integrations	Tool + MCP + Skill + Script
Knowledge	Knowledge + Memory + Context + Artifacts
Workflow	Flow + Graph + persistent organization
Agent runs	Organization observability
Templates	Sellable Workforces / OS
Team	Actual hierarchical organization

Le vrai moat devient donc :

Relevance construit des agents et des teams. AGK permet de construire des organisations intelligentes complètes.

Et Hermes est exactement ce qui rend ce projet beaucoup plus réaliste, parce que tu peux laisser Hermes gérer l’exécution pendant que tu construis cette couche visuelle et organisationnelle au-dessus.

Je structurerais donc l’app finale autour de 3 expériences parfaitement intégrées :

OPERATE
Project / Chat / Tasks / Artifacts
BUILD
Canvas / Agents / Oracles / Teams / OS / Workforces
INSPECT
Runs / Runtime / Memory / Context / Logs / Evals

Et dans BUILD, le Organization Canvas devient probablement l’une des interfaces les plus importantes de tout AGK.

Et là je corrigerais un point majeur de l’ontologie qu’on vient de poser : vos OS ne doivent surtout pas être représentés comme de simples “instructions + knowledge”.

Dans votre architecture, un AGK OS est lui-même un système agentique complet, potentiellement plus puissant qu’un Agent.

La distinction que je figerais

AGENT
= Worker spécialisé
OS
= Intelligence opérationnelle complète d'un domaine

Donc :

AGK OS
│
├── Boss / Lead Agent
│
├── Subagents
│   ├── Researcher
│   ├── Planner
│   ├── Executor
│   ├── Critic
│   └── QA
│
├── Prompts
├── Skills
├── Tools
├── MCP
├── Knowledge
├── Memory
│
├── Programmatic Layer
│   ├── Python
│   ├── TypeScript
│   ├── Shell
│   └── deterministic logic
│
├── Flows
├── Graphs
├── Loops
│
├── Cron / Scheduler
├── Triggers
├── Hooks
│
├── Evals
├── Policies
├── Permissions
│
├── Artifacts
└── Runtime configuration

Un OS peut donc travailler tout seul.

C’est fondamental.

⸻

1. Agent ≠ OS ≠ Oracle

Je verrouillerais maintenant les définitions comme ça :

Objet	Fonction
Agent	Worker
OS	Système d’intelligence et d’exécution spécialisé
Oracle	Propriétaire persistant d’un domaine
Team	Groupe opérationnel
Workforce	Organisation déployable
Project	Organisation construite autour d’un outcome

Donc par exemple :

                    PRODUCT ORACLE
                           │
                         uses
                           ↓
                     PRODUCT OS
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
      Research          Strategy         Product
       Agent             Agent            Agent
          │
          └────────────┬───────────────────┘
                       ↓
                Product Knowledge

L’Oracle possède le domaine.

Le Product OS fournit le système d’intelligence opérationnelle.

Les Agents font le travail.

⸻

2. Un OS est pratiquement un mini système autonome

Prenons votre Research OS.

Il ne devrait pas être :

Research OS
Prompt:
"You are an expert researcher..."

Ça serait beaucoup trop pauvre.

Il devrait être :

RESEARCH OS
Boss
└── Research Director
Agents
├── Discovery Agent
├── Web Research Agent
├── Deep Research Agent
├── Source Verification Agent
├── Synthesis Agent
└── Critic Agent
Skills
├── competitor-research
├── source-validation
├── literature-review
├── market-mapping
└── synthesis
MCP
├── Browser
├── GitHub
├── Notion
└── other research sources
Tools
├── Search
├── Browser
├── Files
└── Code
Knowledge
├── research methodology
├── project knowledge
└── previous research
Programmatic
├── scrape.py
├── rank_sources.py
├── deduplicate.py
└── evidence_score.py
Flows
├── quick-research
├── deep-research
└── exhaustive-research
Cron
└── refresh-watch
Evals
├── source quality
├── coverage
├── contradictions
└── confidence

Et son Boss Agent orchestre tout ça.

⸻

3. Builder OS devient encore plus intéressant

Ton Builder OS pourrait être :

BUILDER OS
│
├── Boss
│   └── Builder Director
│
├── Agents
│   ├── Architecture Agent
│   ├── Implementation Agent
│   ├── Test Agent
│   ├── Security Agent
│   ├── Debug Agent
│   └── Review Agent
│
├── Skills
│   ├── architecture
│   ├── implementation
│   ├── testing
│   ├── debugging
│   └── refactoring
│
├── MCP
│   ├── GitHub
│   ├── Linear
│   └── Vercel
│
├── Programmatic
│   ├── test runners
│   ├── linters
│   ├── build scripts
│   ├── migration scripts
│   └── verification scripts
│
├── Loops
│   └── BUILD → TEST → AUDIT → FIX → RETEST
│
├── Hooks
│   ├── pre-build
│   ├── post-build
│   └── failure
│
└── Evals
    ├── correctness
    ├── regression
    ├── security
    └── quality

Donc oui : vos OS sont déjà des multi-agent systems packagés.

⸻

4. Et ça change complètement le Canvas AGK

Je ne montrerais pas immédiatement les 25 composants internes d’un OS.

Sur le canvas principal :

┌──────────────────────┐
│ 🧠 BUILDER OS        │
│                      │
│ ● Running            │
│ Boss        1        │
│ Agents      6        │
│ Skills     18        │
│ MCP         4        │
│ Automations 7        │
│                      │
│ 3 agents active      │
└──────────────────────┘

Double clic.

Et tu entres dans l’OS.

PROJECT CANVAS
      ↓
BUILDER OS
      ↓
OS INTERNAL CANVAS

À l’intérieur :

                    BUILDER BOSS
                         │
       ┌─────────────────┼──────────────────┐
       ↓                 ↓                  ↓
 Architecture       Implementation        QA
    Agent               Agent             Agent
       │                  │                 │
       └──────────┬───────┴─────────┬──────┘
                  │                 │
              GitHub MCP       Builder Skills
                  │
              Repository

Donc canvas récursif.

C’est important.

⸻

5. Un Agent peut également être complexe

Il ne faut pas tomber dans l’excès inverse où Agent = prompt.

Un Agent peut avoir :

AGENT
Identity
Role
Cognition
├── Model
├── Prompt
└── Context policy
Intelligence
├── Skills
├── Knowledge
└── Memory
Capabilities
├── Tools
├── MCP
└── Scripts
Execution
├── Runtime
├── Sandbox
├── Machine
└── Permissions
Automation
├── Triggers
├── Hooks
└── Cron
Quality
└── Evals

Mais normalement :

Agent exécute. OS orchestre une capacité complète.

⸻

6. Et un OS peut utiliser d’autres OS

Ça devient très puissant.

Ton Strategy OS pourrait faire :

STRATEGY OS
│
├── Librarian OS
│
├── Research OS
│
├── Market Research OS
│
├── Decision OS
│
└── Strategy Agents

Et Builder OS :

BUILDER OS
│
├── Blueprint OS
├── Design OS
├── Stepper OS
├── Quality OS
└── Builder Agents

Il faut simplement éviter les dépendances circulaires.

AGK doit donc gérer un véritable dependency graph des OS.

⸻

7. Et là ton Librarian OS devient particulièrement important

Par exemple :

              STRATEGY OS
                   │
          needs knowledge
                   ↓
             LIBRARIAN OS
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
     Books       Papers       Web
       │           │           │
       └───────────┼───────────┘
                   ↓
             KNOWLEDGE
                   │
                   ↓
              STRATEGY OS

Le Strategy OS n’a pas besoin de réimplémenter toute la recherche documentaire.

Il appelle un autre système spécialisé.

C’est composition d’intelligences.

⸻

8. Cron est une propriété de premier rang

Je mettrais même une section Automation dans chaque OS :

AUTOMATION
Cron
Triggers
Hooks
Watchers
Recurring Loops
Event subscriptions

Exemple Growth OS :

08:00  → analyze metrics
09:00  → produce daily report
Every 6h
→ monitor competitors
On new lead
→ Sales OS
On customer churn
→ Customer Success OS
Every Monday
→ weekly strategy review

L’OS devient vivant, même lorsqu’aucun humain ne lui parle.

⸻

9. Programmatic doit aussi être first-class

Parce que toutes les tâches ne doivent surtout pas passer par un LLM.

AGK doit distinguer :

Cognitive
LLM reasoning
        +
Programmatic
deterministic execution

Exemple :

Research Agent
      ↓
LLM determines search strategy
      ↓
Python performs 5,000 operations
      ↓
Programmatic filtering
      ↓
LLM analyzes final 50 results

Beaucoup moins cher, beaucoup plus fiable.

Dans l’OS Builder :

PROGRAMMATIC
Scripts
Functions
Commands
Jobs
Pipelines
Validators
Transformers
Parsers

⸻

10. Donc je modifierais notre ontologie officielle

Je passerais de :

OS = persistent domain intelligence

à quelque chose de plus précis :

OS = persistent, composable domain intelligence and execution system.

Ou encore :

An AGK OS packages the intelligence, agents, procedures, capabilities, automation, knowledge and governance required to operate a domain.

Ça décrit beaucoup mieux ce que vous construisez.

⸻

Et l’architecture devient très élégante

                         AGK
                    CONTROL PLANE
                         │
                         ▼
                      PROJECT
                         │
                    ┌────┴────┐
                    │ ORACLES │
                    └────┬────┘
                         │
                  ┌──────┴──────┐
                  │ WORKFORCES  │
                  └──────┬──────┘
                         │
                     ┌───┴───┐
                     │ TEAMS │
                     └───┬───┘
                         │
              ┌──────────┴──────────┐
              │                     │
             OS                  AGENTS
              │
      ┌───────┼────────┐
      │       │        │
   Agents   Skills    MCP
      │       │        │
   Tools   Knowledge  Scripts
      │       │        │
   Memory   Flows     Cron
      │
   Evals / Governance
              │
              ▼
         AGK RUNTIME
              │
           HERMES

Et là apparaît une distinction importante :

Hermes Agent peut devenir le moteur d’exécution d’un Agent AGK, mais Hermes peut également fournir une grande partie des primitives permettant à un OS AGK d’exécuter ses subagents, skills, MCP, cron, tools, memory et scripts.

Donc encore une fois, on ne reconstruit pas ça dans AGK si Hermes sait déjà le faire. AGK apporte principalement le packaging, l’ontologie, la composition, la gouvernance, le canvas et l’orchestration supérieure.

C’est cette définition de l’OS que je mettrais maintenant dans le agk-upgrade comme contrainte architecturale canonique, parce qu’elle change significativement le gap analysis Hermes → AGK.


AGK Post-Stepper Architecture Alignment Prompt — Continued

Continue from the previous section.

This additional specification extends the architecture beyond the core AGK Build / Runtime system.

The final product must support the complete AGK ecosystem:

AGK
│
├── LEARN
│   └── education + community + progression
│
├── BUILD
│   └── intelligent organization creation + operation
│
├── DEALS / EARN
│   └── opportunities + business + marketplace + commissions
│
└── SELF / EVOLVE
    └── personal intelligence + personal OS + life operating system

Do not treat these as four unrelated applications.

They are four product surfaces over a shared AGK identity, object graph, intelligence layer and economic ecosystem.

The architecture must allow them to become independently navigable products while sharing the correct primitives underneath.

⸻

46. AGK Architect — continued

Example:

User:
Build me a complete autonomous content organization for AGK.

Architect could propose:

CONTENT WORKFORCE
Content Oracle
│
├── Strategy Team
│   ├── Research Agent
│   ├── Trend Agent
│   └── Positioning Agent
│
├── Production Team
│   ├── Writing Agent
│   ├── Video Agent
│   ├── Design Agent
│   └── Editing Agent
│
└── Distribution Team
    ├── X Agent
    ├── LinkedIn Agent
    ├── YouTube Agent
    └── Telegram Agent
Uses:
Content OS
Research OS
Brand OS
Growth OS
Knowledge:
AGK Brand
Product Knowledge
Audience Knowledge
Historical Performance
Integrations:
YouTube
X
LinkedIn
Telegram
Analytics

Architect should not immediately deploy everything.

Preferred flow:

Intent
↓
Architectural proposal
↓
Dependency resolution
↓
Permission review
↓
Human review where appropriate
↓
Deploy
↓
Observe
↓
Evaluate
↓
Improve

Architect is therefore not merely:

natural language → JSON

It is a meta-intelligence for designing intelligent organizations.

⸻

47. AGK Labs

AGK Labs represents the experimental and improvement layer.

Definition:

A Lab is an environment for researching, testing, evaluating and improving intelligence systems.

Labs can eventually operate on:

Models
Prompts
Agents
OSs
Skills
Tools
Flows
Workforces
Retrieval strategies
Memory strategies
Model routing
Programmatic systems

Example:

Builder OS Lab
Experiment:
Can a cheaper model handle QA?
Variant A:
GPT premium model
Variant B:
smaller model + programmatic validators
Evaluation:
Correctness
Latency
Cost
Regression rate

Labs should be capable of producing:

experiment results
benchmarks
recommendations
new versions
knowledge
eval datasets
regression cases

Labs are not necessarily part of MVP implementation.

But the object graph should permit this future intelligence improvement loop.

⸻

48. Self-improvement loop

AGK should eventually support:

EXECUTE
   ↓
OBSERVE
   ↓
EVALUATE
   ↓
LEARN
   ↓
PROPOSE CHANGE
   ↓
VALIDATE
   ↓
DEPLOY
   ↓
EXECUTE

Never allow uncontrolled self-modification of critical production systems.

Changes should have governance.

Potential modes:

observe only
suggest improvement
auto-test improvement
auto-deploy low-risk improvement
human approval required

⸻

49. Unified AGK ecosystem

The complete AGK product is broader than the Build environment.

Target ecosystem:

                       AGK
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
       ▼                ▼                 ▼
     LEARN            BUILD             EARN
       │                │                 │
       └────────────────┼─────────────────┘
                        │
                        ▼
                      SELF

A better conceptual representation is:

LEARN
↓
acquire intelligence
BUILD
↓
create leverage
EARN / DEALS
↓
convert leverage into economic value
SELF / EVOLVE
↓
improve the human operating the system
           ↺

This creates a closed AGK loop.

⸻

50. Shared account and identity

All AGK surfaces should use a shared identity.

Conceptually:

AGK Identity
│
├── User
├── Profile
├── Membership
├── Organizations
├── Projects
├── Skills
├── Certifications
├── Reputation
├── Portfolio
├── Deals
├── Earnings
├── Contributions
├── Learning Progress
└── Personal Systems

Do not create separate identities for:

Learn user
Build user
Deals user
Self user

They are different facets of the same person.

⸻

51. Shared navigation philosophy

The final product may expose the main universes in the top-level navigation.

Example:

AGK
Learn
Build
Deals
Self

or the canonical brand equivalents:

LEARN
BUILD
EARN
EVOLVE

The implementation should allow naming to evolve without requiring architecture changes.

Do not hard-code business semantics unnecessarily into low-level runtime code.

⸻

52. AGK Learn

Definition:

AGK Learn is the intelligence acquisition and professional progression layer of AGK.

It is not simply a course platform.

It combines:

Education
Community
Practice
Projects
Certification
Mentorship
Resources
Systems
Opportunities

The objective is not:

consume content.

The objective is:

develop the ability to operate and create intelligent organizations.

⸻

53. Learn structure

Potential high-level information architecture:

AGK LEARN
│
├── Home
├── Learning Paths
├── Courses
├── Lessons
├── Labs
├── Challenges
├── Projects
├── Community
├── Events
├── Live
├── Coworking
├── Library
├── Certifications
├── Progress
└── Profile

Do not assume all of these must exist in MVP.

Design the domain model to support them progressively.

⸻

54. Learning Paths

Learning should be organized around outcomes and competencies.

Examples:

Chief AI Officer
AI Operator
Agentic Engineer
AI Consultant
AI Founder
AI Builder

A Learning Path may contain:

modules
courses
lessons
resources
exercises
projects
labs
evaluations
milestones
certifications
required systems

Potential progression:

UNDERSTAND AI
      ↓
MASTER AI TOOLS
      ↓
UNDERSTAND AGENTIC SYSTEMS
      ↓
BUILD AGENTS
      ↓
BUILD OSs
      ↓
BUILD TEAMS
      ↓
BUILD WORKFORCES
      ↓
OPERATE PROJECTS
      ↓
CREATE BUSINESS VALUE
      ↓
ACCESS DEALS

Learning should ultimately connect directly to Build.

⸻

55. Learn → Build connection

This is strategically critical.

A lesson should be able to give access to actual AGK assets.

Example:

Lesson:
Building a Research Agent
Resources:
Research Skill
Research Prompt
Research Agent Template
[Open in AGK Build]

Another:

Course:
Build Your First AI Department
Final Project:
Install SaaS Growth Workforce
[Open Workforce]
[Inspect]
[Customize]
[Deploy]

Therefore Learn is not merely educational content.

It can teach by allowing users to manipulate the actual systems being explained.

⸻

56. Interactive learning

Where useful, Learn should support:

Read
Watch
Listen
Practice
Build
Run
Inspect
Submit
Evaluate
Discuss

Potential lesson composition:

LESSON
Explanation
        ↓
Interactive example
        ↓
Open Agent / OS / Workflow
        ↓
Modify
        ↓
Run
        ↓
Automatic evaluation
        ↓
Reflection
        ↓
Complete

This creates a much stronger learning system than passive video consumption.

⸻

57. Community

Community is a first-class AGK product capability.

Potential community primitives:

Spaces
Channels
Posts
Threads
Chat
DMs
Groups
Voice
Video
Live rooms
Events
Coworking
Announcements
Resources
Member directory
Profiles
Reactions
Moderation

Do not implement all communication infrastructure from scratch without evaluating existing solutions or shared infrastructure.

But the AGK architecture should define community objects independently from agent runtime objects.

⸻

58. Community Spaces

Potential spaces:

General
Introductions
AI News
Agentic Engineering
CAIO
Business
Builds
Wins
Feedback
Jobs
Deals
Resources
Local Communities

Courses may also expose dedicated spaces.

Projects or cohorts may expose private spaces.

⸻

59. Community identity

Community profiles should enrich the shared AGK profile.

Potential fields:

Name
Location
Role
Stage
Skills
Industries
Current Mission
What I Build
What I Can Help With
What I Need
Portfolio
Certifications
AGK Systems
Projects
Reputation

This becomes extremely useful for Deals later.

Learn and Community therefore build the economic graph.

⸻

60. Member graph

AGK should progressively understand relationships between members.

Potential graph:

Member
│
├── knows
├── worked_with
├── referred
├── helped
├── hired
├── collaborated_with
└── transacted_with

Do not turn this into a vanity social follower graph.

Prioritize useful professional relationships and trust.

⸻

61. Reputation

Future AGK reputation can derive from real activity.

Potential signals:

courses completed
certifications
projects delivered
deals completed
peer reviews
client reviews
contributions
systems published
helpful community activity
referrals
dispute history

Avoid reducing reputation to one simplistic number.

Different contexts may require different trust signals.

⸻

62. Events

Learn / Community should support events:

Live classes
Workshops
Office hours
Expert sessions
Demos
Build sessions
Coworking
Networking
Deal rooms
AMAs
Launches

Events may have:

host
speakers
participants
access rules
calendar
recording
resources
chat
follow-up

⸻

63. Coworking / live rooms

Long-term community experience may include:

Voice rooms
Video rooms
Screen sharing
Coworking
Pair building
Office hours
Team rooms

Do not confuse this with agent communication.

These are human collaboration primitives.

⸻

64. Community + agents

Eventually community spaces may include AGK Agents.

Example:

#agentic-engineering
Members
+
Engineering Tutor Agent
+
Documentation Oracle

Potential agent roles:

answer questions
surface documentation
summarize discussions
recommend lessons
moderate spam
identify unanswered questions
create FAQs

Clearly identify AI participants.

Do not create deceptive agent identities.

⸻

65. AGK Deals / Earn

Definition:

AGK Deals is the economic coordination layer connecting skills, systems, opportunities, clients, builders, operators and capital.

The purpose is to convert:

learning
+
capability
+
systems
+
relationships

into:

business opportunities
revenue
ownership
economic leverage

⸻

66. Deals is not just a job board

Avoid reducing Deals to:

list of jobs

The richer model includes:

Leads
Opportunities
Projects
Missions
Clients
Providers
Referrers
Teams
Proposals
Deals
Contracts
Commissions
Revenue shares
Deliverables
Payments
Reviews
Disputes

Implementation can start much smaller.

But the ontology should anticipate the complete economic flow.

⸻

67. Opportunity object

Potential Opportunity:

Opportunity
│
├── Client
├── Problem
├── Outcome
├── Budget
├── Industry
├── Required Skills
├── Required Systems
├── Location
├── Remote status
├── Timeline
├── Source
├── Referrer
├── Privacy
└── Status

Status example:

New
Qualified
Matching
Introduced
Proposal
Negotiation
Won
Lost
Delivered

Do not couple this to one sales methodology.

⸻

68. Deal object

Potential:

Deal
│
├── Opportunity
├── Client
├── Provider
├── Referrer(s)
├── AGK
├── Scope
├── Value
├── Currency
├── Commission Rules
├── Revenue Share
├── Milestones
├── Deliverables
├── Contract references
├── Payment status
├── Reviews
└── Audit trail

Financial functionality must eventually be designed with appropriate compliance and payment infrastructure.

Do not implement financial custody casually.

⸻

69. Referral system

The architecture should support referral attribution.

Example:

Company needs AI transformation
        │
        ▼
Member A introduces company
        │
        ▼
AGK qualifies opportunity
        │
        ▼
Member B / Team selected
        │
        ▼
Deal signed
        │
        ▼
Revenue
        │
        ├── Provider
        ├── Referrer
        └── AGK

Every referral relationship should be traceable.

Avoid hidden commission logic.

⸻

70. Commission engine

Future commission rules may include:

percentage
fixed fee
tiered percentage
recurring percentage
one-time
multi-party split
duration-limited recurring

Keep commission policies explicit and auditable.

Do not prematurely build complex multi-level structures without legal/compliance review.

The system architecture should support transparent attribution without assuming a legally unsafe business model.

⸻

71. Deal matching

Matching may eventually use AGK intelligence.

Inputs:

Opportunity requirements
Member skills
Certifications
Industry experience
Availability
Location
Past performance
Portfolio
Systems owned
Team capability
Reputation
Price range

Output:

recommended professionals
recommended Teams
recommended Workforces
recommended AGK systems

Potentially:

Client problem
↓
AGK Architect
↓
required Workforce
↓
available certified operators
↓
proposed team

This is a very important future loop.

⸻

72. Build → Deals connection

A user should potentially be able to commercialize what they build.

Examples:

Agent
OS
Workforce
Template
Skill
Tool
Integration
Solution

Potential flow:

Build OS
↓
Test
↓
Evaluate
↓
Package
↓
Publish
↓
Sell / License
↓
Install into another organization

This makes AGK Build economically useful.

⸻

73. Marketplace

Deals and Build may share a marketplace layer.

Potential categories:

Agents
OSs
Workforces
Skills
Tools
Templates
Integrations
Services
Experts
Training

Potential sellers:

AGK
Creators
Consultants
CAIOs
Agencies
Companies
Developers

Potential pricing:

Free
One-time
Subscription
Usage-based
License
Service

Marketplace is future-facing unless explicitly prioritized.

But packaging architecture must support it.

⸻

74. Service marketplace

A system can be sold with a human operator.

Example:

Growth Workforce
+
Certified Growth CAIO
+
Monthly operation

This creates an important distinction:

Buy system
vs
Buy system + operator

That connects Learn, Build and Deals naturally.

⸻

75. Learn → Deals connection

Certification should have real economic utility.

Example:

Complete CAIO Path
↓
Pass evaluations
↓
Earn certification
↓
Create portfolio
↓
Become eligible for Deals
↓
Receive opportunities
↓
Use AGK Workforces
↓
Deliver client outcomes

This is a central AGK loop.

⸻

76. Community → Deals connection

Community relationships can also surface opportunities.

Example:

Member posts:
Need help automating our sales organization.
↓
Opportunity detected / created
↓
Qualified privately
↓
Relevant builders matched

Do not automatically turn private community discussion into commercial leads without explicit user consent.

Design privacy boundaries.

⸻

77. Portfolio

A user may eventually have a portfolio derived from actual AGK activity.

Potential content:

Projects
Systems
Agents
OSs
Workforces
Case Studies
Certifications
Results
Reviews
Contributions

Where possible, results should be verifiable through system provenance rather than pure self-reporting.

⸻

78. AGK Self / Evolve

Definition:

AGK Self is the personal operating-system layer used to improve the human operating the organization.

This is not merely:

habit tracker
+
journal
+
to-do list

AGK Self should use the same deeper intelligence architecture as AGK Build.

The user can operate a personal collection of OSs.

Examples:

Mindset OS
Journal OS
Decision OS
Strategy OS
Health OS
Habit OS
Relationship OS
Learning OS
Money OS
Identity OS
Goal OS

⸻

79. Personal OS architecture

A Personal OS is still an AGK OS.

Therefore:

MINDSET OS
│
├── Boss Agent
├── Reflection Agent
├── Pattern Agent
├── Coach Agent
│
├── Knowledge
├── Memory
├── Journal
├── Skills
│
├── Daily routines
├── Cron
├── Triggers
├── Evals
└── Artifacts

Do NOT create a second incompatible PersonalOS architecture.

Use the common AGK OS primitive with personal-domain configuration.

This is crucial.

⸻

80. Self should reuse Build primitives

Examples:

Decision OS

can use:

Agents
Knowledge
Memory
Prompts
Skills
Programmatic scoring
Evals

A Journal OS can use:

Daily cron
Questions
Memory retrieval
Pattern detection
Weekly synthesis
Artifacts

A Money OS can use:

financial data connectors
goals
decision rules
reports
automation

The same engine powers business and personal intelligence.

⸻

81. Personal Oracle concept

Consider carefully whether Self should expose a personal Oracle.

Potential:

SELF ORACLE

Responsibility:

long-term personal alignment
goals
identity
priorities
cross-OS coordination
reflection
decision escalation

Potential architecture:

Self Oracle
│
├── Mindset OS
├── Decision OS
├── Journal OS
├── Strategy OS
├── Health OS
├── Money OS
└── Learning OS

Do not implement this merely because the concept sounds attractive.

Evaluate whether it genuinely improves the ontology.

Document the decision.

⸻

82. Personal memory

Self requires particularly careful memory architecture.

Potential types:

journal memory
decision history
goals
values
preferences
habits
personal knowledge
reflections
commitments
historical plans

Privacy must be significantly stronger here.

Personal memory should have explicit scope and access controls.

Business Agents must not automatically access Self information.

⸻

83. Privacy boundary

This is critical.

Do NOT create one unrestricted memory graph across:

Self
Community
Learn
Build
Deals

Use explicit scopes.

Conceptually:

Identity
│
├── Public Profile
├── Community Profile
├── Learning Profile
├── Professional Profile
│
├── Build Organizations
│   └── scoped organizational memory
│
└── Self
    └── highly private personal memory

Cross-surface access must be deliberate.

⸻

84. Self + Learn

Self may support learning optimization.

Example:

Learning OS
↓
understands current objectives
↓
Learn recommends relevant module
↓
user completes module
↓
Learning OS stores capability progression

But avoid over-personalized surveillance patterns.

The user should understand and control what information is shared.

⸻

85. Self + Build

Personal Strategy OS may understand professional objectives.

Example:

Goal:
Reach €25k/month
↓
Strategy OS
↓
Professional objective:
Acquire 3 CAIO clients
↓
AGK Build:
prepare CAIO Delivery Workforce
↓
AGK Deals:
surface relevant opportunities

These cross-product loops are powerful but must be user-controlled.

⸻

86. Self + Deals

Potential future relationship:

Personal goals
↓
professional strategy
↓
availability
↓
preferred opportunities
↓
Deals recommendations

Again:

explicit permission, not invisible data leakage.

⸻

87. Unified user dashboard

Long-term AGK Home can act as a personalized control plane.

Example:

GOOD MORNING
PRIORITIES
3 important outcomes
BUILD
2 Workforces active
7 Agents running
LEARN
Continue Agentic Engineering
72% complete
DEALS
3 matching opportunities
1 proposal awaiting response
SELF
Daily review pending
Weekly objective progress 68%
ATTENTION
2 approvals
1 failed deployment
1 decision required

This is more valuable than four isolated dashboards.

⸻

88. AGK Inbox

Consider a universal Inbox.

Sources:

Oracle requests
Agent approvals
Project decisions
Community mentions
Direct messages
Course updates
Deal opportunities
Client responses
Self reminders
System alerts

Each inbox item should retain its source context.

Example:

Engineering Oracle
Approval required
Deploy authentication migration?
[Inspect]
[Approve]
[Reject]

or:

AGK Deals
Opportunity
AI transformation
Budget: qualified
[View opportunity]

Do not overload the user with raw notifications.

Prioritize actionability.

⸻

89. Universal search

AGK should eventually expose one search / command layer across:

Projects
Agents
OSs
Knowledge
Artifacts
Community
Courses
Members
Deals
Workforces
Skills
Tools
Files

Potential command palette:

⌘K
Search anything
or
Ask AGK...

This can become a major navigation primitive.

⸻

90. Universal creation

Likewise, a global:

+ Create

may expose context-aware options:

Project
Agent
OS
Oracle
Team
Workforce
Skill
Flow
Post
Event
Opportunity
Personal OS

Prefer contextual prioritization rather than a giant static menu.

⸻

91. AGK Learn product model

Potential core objects:

LearningPath
Course
Module
Lesson
Resource
Exercise
Challenge
Lab
ProjectAssignment
Evaluation
Certification
Cohort
Progress

Relationships should be explicit.

Example:

LearningPath
contains
Course
Course
contains
Module
Module
contains
Lesson
Lesson
references
AGK Asset
Certification
requires
Evaluations

⸻

92. Community product model

Potential objects:

Space
Channel
Post
Comment
Thread
Message
Room
Event
Member
Group
Reaction
ModerationAction

Keep community data outside the runtime domain unless there is actual cross-linking.

⸻

93. Deals product model

Potential objects:

Opportunity
Lead
Deal
Proposal
Party
Referral
Commission
Deliverable
Milestone
PaymentReference
Review
Dispute
Match

Start with the minimal subset required by product requirements.

⸻

94. Self product model

Potential objects:

PersonalGoal
PersonalProject
Reflection
JournalEntry
Habit
Routine
Decision
Metric
Commitment
PersonalArtifact

However, avoid recreating objects already represented generically.

Example:

A personal goal may potentially use a generic Objective.

A personal project may use a normal Project with private ownership.

Analyze before adding duplicate entities.

⸻

95. Shared primitives vs surface-specific primitives

Create an explicit matrix.

Example:

Primitive	Learn	Build	Deals	Self
User	✓	✓	✓	✓
Profile	✓	✓	✓	✓
Project	learning projects	core	delivery	personal
Agent	tutor	core	matching	personal
OS	learning OS	core	sales OS	personal OS
Knowledge	course	project	deal	private
Artifact	assignments	outputs	proposals	journal
Event	class	runtime event	business event	routine
Evaluation	quiz	system eval	delivery	reflection
Community Post	✓	optional	opportunity source	no
Deal	no	service output	✓	no

Do this rigorously.

The goal is:

maximum reuse without semantic corruption.

⸻

96. Shared object graph

Where appropriate, AGK should allow real links across surfaces.

Example:

Course
↓ teaches
Skill
Skill
↓ used by
Agent
Agent
↓ belongs to
Workforce
Workforce
↓ used in
Project
Project
↓ produces
Case Study
Case Study
↓ appears in
Portfolio
Portfolio
↓ used for
Deal Matching

That creates a powerful compounding data graph.

⸻

97. AGK economic flywheel

Preserve this strategic loop:

LEARN
develop capability
        ↓
BUILD
create systems
        ↓
USE
create outcomes
        ↓
DEALS
monetize capability
        ↓
REPUTATION
prove capability
        ↓
COMMUNITY
share knowledge
        ↓
LEARN

And parallel:

SELF
improve operator
↓
better decisions
↓
better Build
↓
better outcomes
↓
better Deals
↓
more leverage
↓
better Self

The architecture should make these loops possible without forcing them prematurely.

⸻

98. AGK product surfaces must remain modular

Do NOT produce a monolithic codebase where:

Learn imports random Build internals
Deals imports UI state from Learn
Self directly reads Build database tables

Prefer:

Shared Domain / Platform
        │
 ┌──────┼────────┬────────┐
 ▼      ▼        ▼        ▼
Learn  Build    Deals     Self

Cross-surface interactions should use explicit contracts.

⸻

99. Suggested platform decomposition

Evaluate an architecture conceptually similar to:

AGK PLATFORM
Identity
Organizations
Permissions
Billing
Events
Search
Notifications
Files
Artifacts
Knowledge
Memory
Packages
Integrations
        │
AGK INTELLIGENCE CORE
Models
Prompts
Agents
OS
Oracles
Teams
Workforces
Skills
Tools
MCP
Flows
Graphs
Runtime
Evals
        │
PRODUCT SURFACES
Learn
Build
Deals
Self

Hermes primarily belongs beneath:

AGK Intelligence Core / Runtime

Do not force Hermes into:

community
courses
deal CRM
social profiles
billing

unless Hermes genuinely provides reusable infrastructure.

⸻

100. Product navigation

Evaluate a final navigation model similar to:

AGK
HOME
LEARN
BUILD
DEALS
SELF
────────────────
Inbox
Search
Library
Profile

Within Build:

Projects
Organization
Architect
Library
Runtime

Within Learn:

Home
Paths
Courses
Community
Events
Library
Progress

Within Deals:

Opportunities
My Deals
Network
Marketplace
Portfolio

Within Self:

Today
Goals
OS
Journal
Decisions
Progress

Do not blindly implement this exact structure.

Use it as the intended conceptual model and challenge it during UX design.

⸻

101. Context-preserving navigation

Moving between surfaces should preserve context.

Example:

Learn
Course: Building Research OS
      ↓
Open in Build
      ↓
Research OS Builder

Another:

Deals
Opportunity: AI Sales Automation
      ↓
Create Project
      ↓
AGK Architect
      ↓
Sales Workforce

Another:

Build
Completed Client Project
      ↓
Create Case Study
      ↓
Portfolio
      ↓
Deals

These transitions must feel native.

⸻

102. AGK Home should surface outcomes, not applications

Instead of showing:

Learn
Build
Deals
Self

as four disconnected tiles only, Home should eventually answer:

What requires my attention?
What is working?
What changed?
What should I do next?
What opportunities exist?
What am I learning?
What decisions are pending?

The product should behave like an operating system.

⸻

103. Notifications

Create a normalized notification system above surface-specific events.

Categories may include:

ACTION REQUIRED
UPDATE
OPPORTUNITY
COMMUNITY
LEARNING
SYSTEM
PERSONAL

Notifications should deep-link into the originating object.

⸻

104. Global activity graph

Long-term, AGK can expose an activity timeline:

10:02 Engineering Oracle delegated authentication audit
10:14 QA Agent created artifact
10:31 You completed Agentic Systems Lesson 12
11:05 Member Sarah replied to your post
11:40 New opportunity matched
12:00 Journal OS generated weekly reflection

Privacy filtering is essential.

⸻

105. Shared AI assistant vs entity-specific conversations

Do not collapse all conversations into one assistant.

Consider:

AGK Assistant
= global navigation / help / coordination
Project Chat
= project organization
Oracle Chat
= domain owner
OS Chat
= operational system
Agent Chat
= direct worker
Learn Tutor
= education
Deals Assistant
= opportunity support
Self Oracle
= personal intelligence

They may share infrastructure while maintaining correct context and authority.

⸻

106. Community moderation

Community needs governance:

roles
permissions
moderators
reporting
spam prevention
blocking
private spaces
member removal
content policies
audit logs

AI moderation may assist but should not be the only layer for important decisions.

⸻

107. Course creation

Long-term creators may build Courses using AGK intelligence.

Potential flow:

Create Course
↓
Architect course structure
↓
Librarian OS
↓
Research
↓
Learning Design Agent
↓
Lessons
↓
Exercises
↓
Evals
↓
Publish

This is another example of Build powering Learn.

⸻

108. Creator economy

Eventually a creator may publish:

Course
Agent
OS
Workforce
Skill
Template
Community
Service

AGK can unify:

education
software
systems
services
opportunities

under one creator identity.

Do not implement monetization complexity until business requirements are confirmed.

⸻

109. Certifications

Certification should ideally prove ability rather than content consumption.

Potential requirements:

course completion
practical project
system build
evaluation
human review
client outcome

A certification can then feed:

Profile
Portfolio
Deal eligibility
Reputation

⸻

110. Capability graph

Consider eventually representing human capability similarly to agent capability.

Example:

Gareth
Capabilities
├── AI Strategy
├── Agentic Architecture
├── Sales
└── Product
Certified
├── CAIO
└── Agentic Builder
Systems
├── Builder OS
├── Research OS
└── Growth Workforce
Experience
└── Project outcomes

This graph can power:

learning recommendations
team assembly
deal matching
community discovery

Do not conflate human and Agent identities.

⸻

111. Human + AI Teams

AGK Teams may eventually contain both:

Humans
+
Agents

Example:

CLIENT DELIVERY TEAM
Human CAIO
│
├── Strategy Oracle
├── Research Agent
├── Automation Agent
└── Reporting Agent

This is particularly relevant to Deals.

The architecture should allow a Team member to have a member type:

human
agent
oracle

without making them equivalent entities internally.

⸻

112. Client access

Projects may eventually allow external clients.

Potential access:

Dashboard
Approvals
Artifacts
Messages
Progress
Decisions
Reports

Clients should not automatically gain access to:

internal prompts
private memory
agent internals
other clients
private workspace

Define granular project permissions.

⸻

113. Delivery Rooms

A Deal may spawn a Project / Delivery Room.

Flow:

Opportunity
↓
Deal
↓
Project
↓
Workforce
↓
Delivery
↓
Artifacts
↓
Approval
↓
Completion
↓
Review
↓
Case Study

This creates a clean bridge between Deals and Build.

⸻

114. Learn projects can become portfolio work

Similarly:

Learn Challenge
↓
Build Project
↓
Evaluation
↓
Verified Project
↓
Portfolio

This allows users to prove competence before getting client work.

⸻

115. Self projects

Likewise, a personal transformation goal could potentially use a Project.

Example:

Project:
120-Day Transformation
Outcome:
defined target
Uses:
Strategy OS
Journal OS
Mindset OS
Decision OS

Do not force every personal activity into a Project.

But preserve the possibility.

⸻

116. Daily intelligence layer

AGK can eventually generate a personalized operating brief.

Example:

TODAY
BUILD
Engineering Workforce blocked on deployment approval.
LEARN
Continue Model Routing module.
DEALS
One high-fit opportunity expires tomorrow.
SELF
Strategy OS recommends prioritizing client acquisition.
COMMUNITY
Two replies require attention.

This could become one of the most valuable integrations across the ecosystem.

⸻

117. Recommendation engine

Recommendations may eventually operate across:

Learning
Systems
Skills
People
Deals
Projects
Content
Personal priorities

But recommendations must remain explainable.

Example:

Recommended opportunity
Why:
✓ required skill match
✓ your certification
✓ industry experience
✓ available Workforce
✓ budget fit

Avoid opaque scoring wherever possible.

⸻

118. Search / discovery graph

Users should eventually discover:

People
Systems
Knowledge
Courses
Projects
Opportunities
Services
Agents
OSs
Workforces

using semantic search plus explicit filters.

This may become AGK’s universal discovery layer.

⸻

119. Cross-surface permissions

Explicitly model whether information can cross product boundaries.

Example:

Learn certification
→ Public Profile
ALLOW
Private Self Journal
→ Build Agent
DENY
Professional skill
→ Deals matching
USER CONTROLLED
Project result
→ Portfolio
USER APPROVAL
Community post
→ Deals opportunity detection
USER CONSENT

Create policy abstractions rather than hard-coded exceptions everywhere.

⸻

120. Shared artifact system

Artifacts should work across all universes.

Examples:

Learn
assignment
Build
technical specification
Deals
proposal
Self
weekly reflection

Same artifact infrastructure.

Different types and permissions.

⸻

121. Shared evaluation system

Likewise:

Learn
student evaluation
Build
agent/system eval
Deals
delivery evaluation
Self
goal/review evaluation

Determine whether one flexible Evaluation primitive can support all four without becoming meaningless.

⸻

122. Shared event bus

Surface events should eventually integrate with a shared event architecture.

Example:

learn.course.completed
build.project.completed
deals.opportunity.created
self.review.completed

These events may trigger automation.

Example:

learn.certification.earned
↓
update professional profile
↓
recalculate deal eligibility

⸻

123. Automations across surfaces

Potential examples:

WHEN certification earned
THEN unlock Workforce template
WHEN Deal won
THEN create Project
WHEN Project completed
THEN request review
WHEN review approved
THEN create Portfolio item
WHEN weekly Self review completes
THEN update priority dashboard

Use event-driven composition rather than hard-coded direct calls where appropriate.

⸻

124. Cron across product surfaces

Cron / Scheduler should not exist only inside OSs.

Potential scheduled systems:

Learn
weekly learning recap
Build
scheduled Workforce operations
Deals
follow-up reminders
Self
daily journal
weekly review
monthly strategy

Reuse a shared scheduler infrastructure when technically appropriate.

⸻

125. Mobile strategy

The architecture should eventually support mobile surfaces particularly well for:

Chat
Oracle conversations
Approvals
Community
Learn
Deals
Self
Notifications
Quick actions
Voice

Heavy Canvas / terminal / graph construction may remain desktop-first.

Do not force identical UX across device classes.

⸻

126. Desktop strategy

Desktop can expose the deepest AGK environment:

Canvas
Terminal
Runtime
Files
Agents
OS internals
Knowledge
Code
Artifacts
Inspector

This aligns well with the existing Hermes-style shell.

⸻

127. Web strategy

Web should eventually support the majority of:

Learn
Community
Build management
Deals
Self
Project operation

Runtime capabilities may depend on connected machines / cloud runtimes.

⸻

128. AGK Runtime topology

Potential deployment model:

AGK CONTROL PLANE
        │
        ├── Local Runtime
        ├── Desktop Runtime
        ├── VPS Runtime
        ├── Cloud Runtime
        └── Remote Runtime

Hermes can power much of this execution layer.

Learn / Community / Deals / Self should not need direct knowledge of Hermes implementation details.

⸻

129. SaaS control plane

The shared cloud/control plane may eventually own:

Identity
Organizations
Memberships
Permissions
Metadata
Projects
Marketplace
Community
Learn
Deals
Billing
Notifications
Search
Package Registry
Deployment coordination

Actual sensitive execution may occur:

locally
on user machine
on VPS
in sandbox
in AGK Cloud

Keep execution architecture flexible.

⸻

130. Offline / local ownership

AGK should preserve the possibility that a user owns substantial parts of their intelligence system locally.

Potential local resources:

repositories
personal files
skills
OS packages
memory
knowledge
runtime
agents

The cloud product should coordinate rather than unnecessarily centralize every execution artifact.

⸻

131. Package model

We need a common package architecture for distributable intelligence.

Potential package types:

AgentPackage
OSPackage
WorkforcePackage
SkillPackage
ToolPackage
FlowPackage
TemplatePackage

A package should potentially contain:

manifest
metadata
dependencies
version
configuration schema
resources
permissions requirements
runtime requirements
installation hooks
evaluation
documentation

Do not reinvent a package manager prematurely.

First investigate Hermes Skills and existing repository packaging conventions.

⸻

132. Provenance

Every important created system should know where it came from.

Example:

Builder OS Instance
source:
AGK Official Builder OS
version:
3.2
installed:
2026-08-21
modified:
yes
forked_from:
agk/builder-os@3.2

This becomes important for:

updates
marketplace
trust
security
maintenance

⸻

133. Trust tiers

Eventually packages/integrations may require trust levels.

Potential:

AGK Official
Verified Publisher
Community
Private
Local
Untrusted

Capabilities should influence risk.

A Prompt package is not equivalent to:

runtime plugin with filesystem access

Design trust around capabilities, not marketing labels.

⸻

134. Capability security

Potential capability classes:

UI extension
Prompt/knowledge package
Skill
Tool
MCP connector
Script
Runtime plugin
Model adapter
System plugin

Each may require different security policies.

Do not create one flat plugin permission system.

⸻

135. Marketplace security

Before installing a package, AGK should eventually be able to state:

This Workforce requires:
GitHub read/write
Terminal access
Filesystem access
Network access
Vercel deployment
OpenAI model access
It includes:
5 Agents
2 OSs
13 Skills
4 Scripts
3 Cron jobs
[Inspect]
[Install]

Transparency is essential.

⸻

136. AGK Build UX should remain the deepest surface

The main Build shell remains approximately:

LEFT
navigation
CENTER
polymorphic workspace
RIGHT
context inspector
BOTTOM
runtime drawer

Within Canvas, support:

Design
Live
Inspect

Within an OS:

Overview
Canvas
Agents
Skills
Tools
MCP
Knowledge
Scripts
Automation
Evals
Settings

This is the deepest technical experience.

⸻

137. Learn UX should feel simpler

Learn should prioritize:

What am I learning?
What comes next?
Where can I practice?
Who can help me?
What can I now build?

Avoid exposing unnecessary runtime complexity.

A user can open Build when deeper manipulation is needed.

⸻

138. Deals UX should prioritize economic action

Deals should answer:

What opportunities exist?
Which are relevant to me?
Who introduced them?
What needs action?
What is the deal status?
What am I earning?
Who is delivering?

Avoid turning it into a generic CRM unless AGK-specific workflow requires it.

⸻

139. Self UX should prioritize clarity

Self should answer:

What matters today?
What am I trying to achieve?
What decisions are open?
What patterns are emerging?
What should change?

Avoid turning it into a cluttered quantified-self dashboard.

The intelligence should reduce complexity.

⸻

140. Different complexity, same platform

Canonical principle:

Shared architecture does not require shared interface complexity.

Build can be extremely advanced.

Learn can remain educational.

Deals can remain commercial.

Self can remain personal and calm.

They share primitives beneath the interface.

⸻

141. Community should connect all surfaces carefully

Community could appear globally, but context matters.

Examples:

Learn Community
education discussions
Builder Community
systems and technical discussions
Deals Network
business opportunities
Private Groups
cohorts / teams / organizations

Do not fragment community unnecessarily into incompatible products.

Use spaces and permissions.

⸻

142. Organizations as community + work systems

Long-term, an AGK Organization may itself contain:

Members
Community Spaces
Projects
Workforces
Knowledge
Events
Courses
Deals

This creates the possibility for users to build their own intelligent communities/organizations on AGK.

This is strategically important.

⸻

143. Organization-as-product

A creator or business may eventually create an AGK Organization that combines:

Community
Education
Systems
Agents
Workforces
Members
Services
Opportunities

Example:

AI Growth Collective
Community
+
Growth Academy
+
Growth OS
+
Growth Workforce
+
Deal Network

That is far beyond a conventional community platform.

⸻

144. Organization memberships

Potential memberships:

Owner
Admin
Operator
Builder
Member
Student
Client
Partner
Guest

Use capability-based permissions rather than relying exclusively on fixed roles.

⸻

145. Organization monetization

Future organizations may monetize:

Membership
Courses
Systems
Workforces
Services
Deals
Events
Marketplace assets

Do not implement all monetization now.

But avoid architecture that assumes only AGK itself can publish content or systems.

⸻

146. White-label / creator organizations

Potential future direction:

Creator creates Organization
↓
adds Community
↓
adds Course
↓
adds proprietary OS
↓
adds Workforce
↓
invites members
↓
sells access

This combines:

Circle
Skool
Relevance AI
AI agent platforms
marketplaces

into an intelligence-native organization platform.

Treat this as future product capability, not necessarily immediate MVP.

⸻

147. AGK differentiator

The product should not be framed internally as:

Relevance AI + Circle + marketplace + journal.

The deeper architecture is:

One system where people can learn intelligence, build intelligent organizations, operate them, distribute them, monetize them and use the same intelligence architecture for themselves.

Everything must remain coherent around this concept.

⸻

148. Canonical product loop

Use this as a strategic validation test:

PERSON
│
├── SELF
│   improve operator
│
├── LEARN
│   acquire capability
│
├── BUILD
│   create intelligence + leverage
│
├── COMMUNITY
│   collaborate + build trust
│
├── DEALS
│   create economic value
│
└── back into SELF / LEARN / BUILD

If a feature does not strengthen this loop or a core infrastructure capability, challenge whether it belongs.

⸻

149. First-time user experience

Do not throw the entire ontology at a new user.

Potential onboarding:

What do you want to achieve?
Learn AI
Build something
Automate my business
Find opportunities
Improve my personal system

Then progressively guide toward the relevant surface.

The ontology remains powerful underneath.

The UX remains outcome-first.

⸻

150. Advanced user experience

An advanced user should eventually be able to inspect everything.

Example:

Project
→ Oracle
→ OS
→ Team
→ Agent
→ Prompt
→ Skill
→ Tool
→ MCP
→ Script
→ Runtime
→ Model call
→ Context
→ Memory
→ Artifact
→ Eval

This deep inspectability is a major AGK principle.

⸻

151. Never hide operational reality

Abstraction should simplify the system, not obscure it.

A beginner may see:

Growth Workforce is working.

An expert can expand:

Growth Workforce
↓
Growth Oracle
↓
Research OS
↓
Competitor Agent
↓
Browser Tool
↓
Model Run #412
↓
3 artifacts
↓
evaluation 92%

Both interfaces refer to the same execution.

⸻

152. Progressive disclosure

Use progressive disclosure everywhere.

Examples:

Project
→ expand Workforces
OS
→ expand Agents
Agent
→ expand capabilities
Run
→ expand model/tool calls

Avoid giant dashboards containing every concept at once.

⸻

153. Graph views

Different graph overlays may be useful.

Potential overlays:

Organization
Execution
Knowledge
Permissions
Dependencies
Communication
Runtime

Example:

Organization

Oracle → Team → Agent

Knowledge

Knowledge Base → OS → Agent

Runtime

Agent → Runtime → Machine

Do not render everything simultaneously.

⸻

154. Canvas filters

Potential filters:

Agents
OS
Teams
Oracles
Knowledge
Capabilities
Automation
Runtime
Active only
Errors

Essential for large organizations.

⸻

155. Canvas grouping

Support meaningful visual grouping:

Team
Workforce
Domain
Runtime
Project area

Groups should correspond to domain objects where possible rather than purely visual rectangles.

⸻

156. Canvas creation flow

Potential:

+ Add
Oracle
Team
Agent
OS
Workforce
Capability
Skill
Tool
MCP
Script
Intelligence
Knowledge
Memory
Logic
Flow
Trigger
Cron
Runtime
Machine

Context should determine available node types.

⸻

157. Natural language Canvas editing

AGK Architect should eventually modify the graph through language.

Example:

Add a QA team under Engineering.
Give them access to GitHub but not production.
Use Quality OS.
Have Engineering Oracle approve deployment failures.

Architect produces a diff:

+ QA Team
+ 3 Agents
+ Quality OS
+ GitHub MCP access
Permissions:
production deploy = denied
Policy:
deployment failure → Engineering Oracle

Then:

[Review changes]
[Apply]

⸻

158. Graph diff

Architectural changes should ideally be reviewable.

Potential:

BEFORE
Engineering Workforce
4 teams
18 agents
AFTER
Engineering Workforce
5 teams
21 agents
Changes
+ QA Team
+ 3 Agents
+ Quality OS
+ evaluation flow

This becomes important for trustworthy AI-generated organization modifications.

⸻

159. Organization versioning

Important systems should potentially support snapshots:

v12
Production organization
v13
Added QA Workforce
v14
Changed model routing

Rollback may be important.

Investigate whether Git / declarative manifests can provide this elegantly.

⸻

160. Declarative organization manifests

Strongly evaluate whether major AGK systems should have declarative representations.

Conceptually:

project:
  name: AGK
oracles:
  - engineering
  - product
workforces:
  - engineering
os:
  - builder
  - quality

Do not hand-design a premature format before auditing Hermes configuration patterns.

But declarative representations could enable:

versioning
diffs
forks
marketplace
deployment
reproducibility

⸻

161. Source of truth

Do not allow independent conflicting states across:

database
Canvas
files
runtime
manifest

Define which layer is authoritative for which concern.

Example:

Domain database / manifests
= organizational configuration
Runtime
= execution state
Canvas
= projection/editor
Event store
= historical execution
Artifacts
= outputs

Document this precisely.

⸻

162. AGK control plane vs runtime

Keep the boundary explicit.

Control Plane

Responsible for:

identity
organizations
projects
ontology
configuration
permissions
packages
deployment orchestration
Canvas
marketplace
Learn
Community
Deals
Self metadata

Runtime

Responsible for:

agent execution
model execution
tools
MCP
skills
scripts
sandbox
terminal
subagents
scheduler primitives
execution context

Hermes primarily powers Runtime.

⸻

163. Persistent domain intelligence

OS and Oracle both persist, but differently.

Canonical distinction:

Oracle
persists responsibility
OS
persists operational intelligence
Memory
persists experience
Knowledge
persists reusable truth
Artifact
persists work

Do not collapse these.

⸻

164. Concrete example: complete company organization

Use the following as a reference test.

PROJECT
Launch AGK
CEO / Project-level coordination
├── Product Oracle
│   └── Product OS
│       ├── Research Agent
│       ├── Strategy Agent
│       └── Spec Agent
│
├── Engineering Oracle
│   └── Engineering Workforce
│       ├── Architecture Team
│       ├── Frontend Team
│       ├── Backend Team
│       └── QA Team
│
│       Shared:
│       Builder OS
│       Quality OS
│
├── Growth Oracle
│   └── Growth Workforce
│       ├── Research Team
│       ├── Content Team
│       ├── Acquisition Team
│       └── Analytics Team
│
│       Shared:
│       Growth OS
│       Content OS
│
└── Operations Oracle
    └── Operations OS

The system should be capable of representing, operating and inspecting this cleanly.

⸻

165. Concrete OS test: Builder OS

The architecture must support something equivalent to:

BUILDER OS
Boss
Builder Director
Agents
Architecture Agent
Implementation Agent
Testing Agent
Debug Agent
Security Agent
Review Agent
Skills
architecture
coding
testing
debugging
refactoring
security-review
Tools
shell
filesystem
browser
MCP
GitHub
Linear
Vercel
Knowledge
repository
technical standards
project architecture
Scripts
test runner
lint
build
migration checker
Flows
build
fix
review
Loop
PLAN
→ BUILD
→ TEST
→ AUDIT
→ FIX
→ RETEST
Automation
on code change
on test failure
scheduled regression
Evals
correctness
security
quality
regression

If the implementation model cannot represent this elegantly, the architecture is not ready.

⸻

166. Concrete OS test: Librarian OS

Likewise:

LIBRARIAN OS
Boss
Knowledge Director
Agents
Discovery
Source Retrieval
Source Evaluation
Extraction
Synthesis
Cataloguing
Tools
Search
Browser
Files
MCP
available knowledge systems
Programmatic
deduplication
metadata parsing
ranking
indexing
Knowledge
library
Automation
scheduled refresh
new source ingestion
Outputs
knowledge objects
research packs
citations
summaries

Builder OS or Strategy OS should be able to invoke Librarian OS without duplicating it.

⸻

167. Concrete Self test: Journal OS

JOURNAL OS
Boss
Reflection Director
Agents
Daily Reflection Agent
Pattern Agent
Weekly Review Agent
Goal Alignment Agent
Knowledge
personal goals
values
current strategy
Memory
journal history
past decisions
patterns
Automation
daily prompt
weekly review
monthly synthesis
Programmatic
trend analysis
habit aggregation
Artifacts
daily entry
weekly synthesis
monthly review
Permissions
private by default

This must use the same OS architecture.

⸻

168. Concrete Learn test

COURSE
Agentic Organization Foundations
Module
Build Your First Workforce
Lesson
Teams vs Workforces
Interactive Resource
SaaS Workforce Template
Exercise
Modify Workforce
Evaluation
Deploy and complete objective
Artifact
Project output
Certification Progress
updated

Learn should connect to actual AGK Build primitives.

⸻

169. Concrete Deals test

OPPORTUNITY
AI automation for B2B SaaS
Needs
Sales automation
Research
CRM integration
Matching
Member
+
Sales Workforce
+
Sales OS
Deal
€15,000 setup
+
monthly operation
Delivery
AGK Project created
Completion
Client approval
Outcome
Portfolio + reputation

The architecture should allow this flow without manual duplication across products.

⸻

170. Concrete community test

COMMUNITY POST
Member:
Looking for someone who can build AI research infrastructure.
↓
Member chooses:
Create opportunity
↓
Opportunity
private qualification
↓
Deals matching
↓
Certified Research Operator
↓
Research Workforce
↓
Project

Community remains social.

Deals handles the economic workflow.

Build handles delivery.

⸻

171. Concrete full ecosystem test

The final architecture should support this complete path:

User discovers AGK
        ↓
joins Community
        ↓
starts Learn path
        ↓
completes lessons
        ↓
uses real AGK systems
        ↓
builds first OS
        ↓
builds Workforce
        ↓
passes evaluation
        ↓
earns certification
        ↓
publishes Portfolio
        ↓
receives Deal
        ↓
Deal creates Project
        ↓
Workforce executes
        ↓
Client receives Artifacts
        ↓
Project completed
        ↓
Reputation increases
        ↓
User improves systems
        ↓
User publishes system
        ↓
other members install it

If architectural decisions prevent this loop, highlight them immediately.

⸻

172. Do not overbuild

This specification describes the target architecture.

It does NOT mean every feature should now be implemented.

Your job is to distinguish:

FOUNDATIONAL NOW
NEEDED SOON
ARCHITECTURAL SUPPORT ONLY
FUTURE
NON-GOAL

For every major capability, classify it.

⸻

173. MVP discipline

The current Hermes → AGK transformation should prioritize the foundations that unlock the largest future surface area.

Likely high-priority:

AGK domain model
Project
Agent
OS
Oracle
Team
Workforce
Knowledge
Artifacts
Runtime adapter
Events
Permissions foundations
Canvas foundations
Package foundations

Potentially later:

full community
video rooms
complete academy
advanced Deal payments
creator marketplace
complex reputation
full Self analytics

Challenge these priorities based on actual implementation dependencies.

⸻

174. Required architecture reconciliation

You have already completed the Stepper and validation.

Now compare this refined vision against:

existing Hermes audit
AGK Master Blueprint
gap analysis
architecture decisions
Stepper
implementation tasks
schemas
tests

Do NOT simply append this document.

Perform a real reconciliation.

Create:

/agk-upgrade/07-post-stepper-alignment/

containing at minimum:

REFINED_VISION_DIFF.md
STEPPER_IMPACT_ANALYSIS.md
ONTOLOGY_CORRECTIONS.md
OS_ARCHITECTURE_ALIGNMENT.md
CANVAS_ALIGNMENT.md
LEARN_ALIGNMENT.md
COMMUNITY_ALIGNMENT.md
DEALS_ALIGNMENT.md
SELF_ALIGNMENT.md
SHARED_PLATFORM_ALIGNMENT.md
MIGRATION_DECISIONS.md
UPDATED_DEPENDENCY_GRAPH.md
IMPLEMENTATION_CHANGESET.md

⸻

175. Refined vision diff

REFINED_VISION_DIFF.md must identify:

what changed
what stayed identical
what was misunderstood
what existing Stepper tasks remain valid
what tasks require modification
what new tasks are required
what tasks should be removed
what can be deferred

Do not rewrite validated work unnecessarily.

⸻

176. Stepper impact analysis

For every existing Stepper task classify:

UNCHANGED
MINOR UPDATE
MAJOR UPDATE
SPLIT
MERGE
REMOVE
DEFER
NEW DEPENDENCY

Example:

Task 042: OS schema
Status:
MAJOR UPDATE
Reason:
Existing schema models OS as a static intelligence bundle.
Canonical OS is now a composable multi-agent execution system.
Required additions:
agents
boss
MCP
scripts
automation
flows
dependencies
evals
runtime configuration

⸻

177. Preserve completed validation

Do not invalidate previous validations just because terminology changed.

For each validated component:

Does the validation still hold?
If yes:
preserve it.
If partially:
identify exact invalid assumptions.
If no:
explain precisely why.

Avoid unnecessary rework.

⸻

178. Update canonical ontology

Update the SSOT to reflect:

Models provide cognition.
Prompts provide instructions.
Tools provide capabilities.
Skills provide procedures.
Agents perform work.
OSs package persistent domain intelligence + execution systems.
Oracles own persistent domains.
Teams organize bounded operational groups.
Workforces package deployable organizational systems.
Flows define processes.
Graphs define execution topology.
Loops define iteration.
Harnesses define execution environments.
Memory preserves experience.
Knowledge preserves reusable truth.
Artifacts preserve work.
Labs improve intelligence.
Projects organize intelligent organizations around outcomes.
AGK operates and connects everything.

This is now authoritative.

⸻

179. Update AGK master blueprint

Modify:

/agk-upgrade/AGK_HERMES_MASTER_BLUEPRINT.md

rather than creating competing master blueprints.

Add/refine sections for:

OS architecture
recursive Canvas
product universes
Learn
Community
Deals
Self
shared platform
cross-product event model
privacy boundaries
economic graph
human + AI collaboration

Maintain one architectural SSOT.

⸻

180. Update machine-readable registries

Update:

agk-hermes-map.yaml

and other registries to account for OS internals.

Example:

os:
  strategy: agk_extension
  hermes_foundations:
    - agents
    - skills
    - tools
    - mcp
    - memory
    - scheduler
    - subagents
    - runtime
  agk_additions:
    - domain_identity
    - boss_semantics
    - composition
    - package_manifest
    - governance
    - organization_relationships

⸻

181. Required Hermes analysis update

Specifically re-audit Hermes for capabilities needed by the refined OS definition:

subagent composition
persistent agent definitions
scheduled execution
cron
event triggers
hooks
skills
MCP
programmatic execution
scripts
tool permissions
memory namespaces
knowledge support
session persistence
runtime isolation
remote machines
communication

We need to know exactly how much of an AGK OS Hermes already makes possible.

⸻

182. Avoid false duplication

For example, if Hermes already has:

cron

AGK should not build:

AGKCronEngine

unless additional orchestration semantics are needed.

Instead:

AGK OS automation configuration
        ↓
Hermes scheduler adapter

Same rule for:

MCP
Skills
Tools
Subagents
Memory
Terminal
Sandbox

⸻

183. Product-specific code boundaries

Recommended conceptual modules:

agk/
│
├── platform/
│   ├── identity/
│   ├── organizations/
│   ├── permissions/
│   ├── events/
│   ├── notifications/
│   ├── search/
│   ├── artifacts/
│   └── packages/
│
├── intelligence/
│   ├── agents/
│   ├── os/
│   ├── oracles/
│   ├── teams/
│   ├── workforces/
│   ├── knowledge/
│   ├── memory/
│   ├── flows/
│   ├── evals/
│   └── architect/
│
├── runtime/
│   ├── contracts/
│   └── hermes/
│
├── products/
│   ├── learn/
│   ├── build/
│   ├── deals/
│   └── self/
│
└── ui/

This is conceptual.

Adapt to the actual Hermes repository conventions.

Do NOT create this hierarchy blindly if it conflicts with validated project structure.

⸻

184. Avoid product leakage

Examples of bad architecture:

Agent imports Course
OS imports Deal
HermesRuntime knows CommunityPost
JournalEntry lives inside Hermes agent session schema

Prefer explicit orchestration at higher layers.

⸻

185. Learn can use intelligence, but intelligence should not depend on Learn

Correct:

Learn
↓
uses Agent
uses OS
uses Eval

Incorrect:

Agent core
↓
depends on Course

Same for Deals and Self.

⸻

186. Self privacy defaults

All Self-specific data should default toward restrictive visibility.

Potential:

private to user

unless explicitly shared.

Never expose Self memory to:

community
deal matching
organizations
other members

without explicit authorization.

⸻

187. Deals privacy defaults

Opportunity information can also be sensitive.

Support:

public
community-only
network-only
invite-only
private

as future concepts if needed.

Do not assume every Deal should be globally visible.

⸻

188. Community privacy

Community needs:

public spaces
membership spaces
private spaces
cohort spaces
project spaces
organization spaces
DMs

Permission architecture should support this cleanly.

⸻

189. Learning access

Courses may have:

free
membership
premium
organization access
cohort access
certification access

Avoid hard-coding one membership model.

⸻

190. Commercial system abstraction

Do not bake exact pricing into core architecture.

Represent:

Product
Offer
Entitlement
Purchase
Subscription
Access

where needed.

The business model can evolve.

⸻

191. Entitlements

AGK may eventually need a shared entitlement layer determining access to:

courses
community spaces
OS packages
Workforces
premium models
marketplace assets
Deals access
events

This is preferable to hundreds of ad-hoc booleans.

⸻

192. Affiliate / referral attribution

Design Deals and commercial flows so attribution can be recorded independently of payment.

Potential:

Referral
source
referrer
referred_party
target
created_at
attribution_policy
status

Financial payouts can be a separate regulated operation.

⸻

193. Auditability

Critical business and organizational operations should create audit trails.

Especially:

permissions
package installation
deployment
Oracle decisions
approvals
deals
referrals
commission changes
critical Self sharing changes

⸻

194. Observability across all AGK surfaces

Observability means different things per product.

Build:

runtime
agents
cost
latency
errors

Learn:

progress
completion
evaluation

Deals:

pipeline
introductions
deliverables

Self:

goal progress
reviews
patterns

Use domain-specific views over shared primitives where sensible.

⸻

195. AGK should feel coherent

The user should feel:

I learned a system.
I opened the same system in Build.
I customized it.
I used it on a project.
I sold the outcome through Deals.
I added the result to my profile.
My Self system helps me decide what to do next.

Not:

I used four unrelated SaaS products with the same logo.

This is a core experience requirement.

⸻

196. Final product philosophy

AGK should provide two complementary forms of leverage:

HUMAN LEVERAGE
Learn + Community + Self
MACHINE LEVERAGE
Build + Agents + OS + Workforces
ECONOMIC LEVERAGE
Deals + Marketplace

AGK connects all three.

⸻

197. Strategic architecture test

Before accepting any architecture, ask:

Can a user learn to build an OS?

Can that OS contain real Hermes-powered agents?

Can the OS contain Skills, Tools, MCP, scripts and cron?

Can an Oracle own that OS within a Project?

Can a Team use that OS?

Can a Workforce package the Team + OS + Agents?

Can the Workforce be represented visually?

Can it actually execute from the Canvas configuration?

Can the user inspect its runtime?

Can it eventually be packaged and shared?

Can another user learn how to use it?

Can a certified operator deliver it to a client?

Can the resulting Project generate Portfolio evidence?

Can Self use the same OS architecture privately?

If any major answer is no, investigate whether the architecture is incorrectly constrained.

⸻

198. Implementation priority framework

Classify every capability using:

P0 FOUNDATION
P1 CORE PRODUCT
P2 EXPANSION
P3 ECOSYSTEM
P4 FUTURE

Potential initial classification:

P0
Hermes audit
Runtime contract
AGK ontology
Project
Agent
OS
Oracle
Knowledge
Artifacts
Events
P1
Teams
Workforces
Canvas
Inspector
Runtime observability
Packages
Architect foundation
P2
Learn foundation
Community foundation
Self foundation
Deals foundation
P3
Marketplace
Certifications
Deal matching
Creator organizations
Advanced Self intelligence
P4
Complex economic marketplace
Advanced self-improvement
Large-scale ecosystem automation

Do not blindly accept this exact ordering.

Update it based on dependency analysis.

⸻

199. Required final deliverable before implementation resumes

After completing reconciliation, generate:

/agk-upgrade/AGK_POST_STEPPER_ALIGNMENT_REPORT.md

It must contain:

1. Executive architecture summary
2. What changed after Stepper
3. What remains valid
4. Canonical ontology
5. Final AGK OS definition
6. Hermes capabilities reused by OS
7. Missing OS capabilities
8. Agent model
9. Oracle model
10. Team model
11. Workforce model
12. Project model
13. Canvas architecture
14. Design / Live / Inspect model
15. Runtime relationship
16. Learn architecture
17. Community architecture
18. Deals architecture
19. Self architecture
20. Shared platform architecture
21. Cross-surface object graph
22. Privacy boundaries
23. Permission architecture
24. Package architecture
25. Marketplace readiness
26. Updated dependency graph
27. Stepper changes
28. Tasks removed
29. Tasks added
30. Implementation sequence
31. Migration risks
32. Upstream Hermes implications
33. Open questions
34. Explicit deferred capabilities

⸻

200. Update Stepper instead of replacing it

Once the reconciliation report is validated:

Modify the existing Stepper.

Do NOT create an independent parallel implementation plan.

Preserve task IDs where possible.

If tasks need to be inserted, use the project’s established numbering/versioning strategy.

Every modification must be traceable back to:

refined requirement
architecture impact
Hermes capability
implementation consequence

⸻

201. No coding until reconciliation passes

Before resuming production implementation:

Run an architecture validation pass.

Validate:

ontology coherence
OS composition
Hermes reuse
upstream compatibility
runtime boundary
Canvas consistency
privacy boundaries
product modularity
event relationships
package readiness
Step dependencies

Only then proceed.

⸻

202. Implementation rule

Once implementation begins:

Do not implement the full future ecosystem merely because it exists in this specification.

Build the foundations that make future surfaces possible.

Create stubs/interfaces only where there is a concrete near-term need.

Do not create empty enterprise abstractions.

⸻

203. Final AGK architecture

The target conceptual system is:

                             AGK
                              │
                     ┌────────┴────────┐
                     │   CONTROL PLANE │
                     └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
      LEARN                  BUILD                 DEALS
        │                     │                     │
 Community                    │                  Marketplace
 Education                    │                  Opportunities
 Certification                │                  Services
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                            SELF
                              │
                    Personal Intelligence
                              │
                     ┌────────┴────────┐
                     │ SHARED PLATFORM │
                     └────────┬────────┘
                              │
                         ORGANIZATIONS
                              │
                           PROJECTS
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          ORACLES         WORKFORCES          OS
             │                │                │
             │              TEAMS      ┌──────┼────────┐
             │                │        │      │        │
             └────────────── AGENTS  Skills  MCP   Knowledge
                                  │     Tools   Scripts
                                  │     Memory  Cron
                                  │     Flows   Evals
                                  │
                           AGK RUNTIME
                                  │
                           HERMES FOUNDATION
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                    │
           Models              Tools                Skills
           Memory              MCP                  Shell
           Context             Sandbox              Scheduler
           Subagents           Providers            Gateways
           Sessions            Remote Execution     Terminal

⸻

204. The central architectural insight

Never lose this distinction:

Hermes provides powerful execution primitives.

AGK packages those primitives into persistent intelligence systems and intelligent organizations.

Then:

Learn teaches people how to understand and use them.

Community connects the humans around them.

Deals turns capability and systems into economic opportunity.

Self applies the same intelligence architecture to the individual.

This is the complete system.

⸻

205. Final success condition

The result should NOT feel like:

Hermes
+
some dashboards
+
some courses
+
a community
+
a marketplace

It should feel like:

One coherent operating system for human and machine intelligence.

A person should be able to:

LEARN
what intelligent systems are
BUILD
their own intelligent organization
OPERATE
that organization
INSPECT
how it thinks and works
IMPROVE
its intelligence
SHARE
its systems
COLLABORATE
with other humans
MONETIZE
their capability and systems
EVOLVE
their own personal operating system

while AGK uses Hermes underneath wherever Hermes already solves execution correctly.

⸻

206. Final instruction

Proceed now in this order:

1. Read the completed Stepper.
2. Read all existing validation outputs.
3. Read the AGK Master Blueprint.
4. Read the Hermes capability audit.
5. Compare them against this refined canonical vision.
6. Do not alter validated work unnecessarily.
7. Produce the post-Stepper alignment documents.
8. Update the ontology.
9. Update the AGK/Hermes capability map.
10. Update the Master Blueprint.
11. Update the dependency graph.
12. Patch the Stepper.
13. Run architecture validation again.
14. Report all material changes.
15. Only after validation succeeds, resume implementation.

Throughout the process optimize for:

maximum Hermes reuse
minimum duplication
clear AGK differentiation
strong object semantics
future composability
operational simplicity
deep inspectability
secure permissions
local/cloud flexibility
upstream maintainability

The implementation objective is not to build the most features.

The implementation objective is to create the smallest coherent architecture capable of becoming the full AGK vision without forcing us into a major rewrite later.

The final mental model is:

Models think.
Agents work.
OSs know how to operate domains.
Oracles own domains.
Teams organize workers.
Workforces package organizations.
Projects organize everything around outcomes.
Hermes executes.
AGK operates the entire system.
Learn develops the humans.
Community connects them.
Deals monetizes the network and its capabilities.
Self develops the operator behind everything.


je pense dans la top bar menu on peut afficher Collectif (Learn), Build, Deal, Evolve ! et quand on on clic ca switch completement le layout avec les differente view pour chaque

--- Context Warnings ---
- @file:prompt.md: file not found