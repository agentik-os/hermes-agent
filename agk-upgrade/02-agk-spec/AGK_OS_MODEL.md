# AGK OS Model

## Canonical definition

An AGK OS is a reusable, composable Definition that packages persistent institutional intelligence for one category of problem. It declares how a domain operates and survives any individual Agent, Session, model or Tool.

An OS is not a prompt, Agent, Oracle, Flow or live Project state container.

## Anatomy

An OS Definition has exactly the canonical sixteen parts:

1. Purpose
2. Principles
3. Commands
4. Flows
5. Agents
6. Skills
7. Tools
8. Knowledge
9. Memory
10. Policies
11. Inputs
12. Outputs
13. Evals
14. Quality Gates
15. Dependencies
16. Versions

The refined vision fits inside those parts. Loop and automation references belong in Flows or Dependencies. MCP and Connectors expose Tools and belong in Tool and dependency contracts. Scripts and deterministic functions are Tool implementations or Flow nodes. Runtime and Harness requirements are deployment compatibility constraints. Package provenance belongs to Versions. None becomes a seventeenth OS part.

## Installation

```text
OS Definition -> OS Installation -> Project-specific operation
```

The generic `OSInstallation` carries:

- pinned Definition version
- scope of `organization | project | os`
- autonomy A0 to A5
- governance authority G0 to G3
- configuration and override patches
- Agent, Skill, Tool and Connector bindings
- Knowledge and Memory bindings
- Resources and deployment bindings
- permissions, Budget and deployment state

Organization and Project scope are distinct objects:

```text
OrganizationOSInstallation  carries authority_floor
ProjectOSBinding            carries the Project A and G pair at or above the floor
OSBinding                   gives an Oracle or department controlled use of a Project installation
```

A Project installation belongs to the Project. An Oracle or department binds to it and never owns it. A Project may tighten an Organization installation and may never loosen its `authority_floor`.

An Installation can operate continuously through bounded Automations and Loop Deployments. Live responsibility and domain state remain with the Oracle and Project objects.

## Composition

OS dependencies are typed and versioned. Installation is blocked on an unsatisfied dependency. One OS may invoke another through a declared contract and never by loading the other OS's private state directly. Dependency composition and conflict resolution follow the canonical law, scope, specificity and strength rules. The architecture does not add a new blanket acyclic rule unless the canonical resolver requires it for a particular executable dependency kind.

## Hermes reuse

Hermes provides strong foundations for OS execution:

- `run_agent.py::AIAgent` for agent work
- `tools/skills_tool.py` and `agent/skill_commands.py` for Skills
- `tools/registry.py::ToolRegistry` for Tools
- `tools/mcp_tool.py` for MCP
- `agent/memory_manager.py::MemoryManager` for an adaptable Memory seam
- `tools/delegate_tool.py` and `agent/subagent_lifecycle.py` for bounded AgentCalls
- `cron/scheduler.py` and session loops as candidate runtime trigger mechanisms
- `tools/environments` for execution targets
- plugin and hook surfaces for governance and observability

AGK adds domain identity, Definition and Installation schemas, composition, typed contracts, policy, package provenance, organization relationships and product projections.

## Canvas

An OS opens recursively into an internal Canvas. Design edits the Definition draft and Installation bindings separately. Live displays active Agents, Automations and events. Inspect resolves Runs, model calls, Tool calls, Memory reads, Knowledge retrievals, cost and evals.

## Governance

An OS may propose a stronger policy or organization-wide hook and cannot self-install one. Self-improvement may produce candidates in a Lab and can never ratify or promote them.

## Publication gate

An OS cannot publish without typed inputs and outputs, dependency resolution, permissions requirements, evals, quality gates, compatibility metadata and package provenance.
