# AGK Team Model

## Definition

A Team is a bounded group responsible for one functional domain or mission. It can contain Humans, Agents and Oracles as distinct member types.

## Required contract

A continuously operating Team declares:

- mission and functional boundary
- owning Project and optional Workforce
- manager or explicit routing strategy
- Human, Agent and Oracle memberships
- shared Knowledge and Memory scopes
- OS Installation bindings
- Task queue and capacity
- delegation and communication rules
- quality gates
- escalation paths
- KPIs
- optional nested Budget allocation

## Routing

Addressing a Team resolves a route before members:

```text
manager | router | round_robin | capability_match | explicit_broadcast
```

Broadcast is never the implicit default. A Team without a manager or declared route causes AGK to ask in interactive use or escalate in unattended use.

## Budget

A Team Budget is an optional allocation nested within a Workforce and Project Budget. It can be soft for warning or hard for enforcement. It is not a root account and does not travel inside a package.

## Lifecycle

```text
forming -> active -> paused -> dissolved
```

Dissolution removes memberships and bindings. It does not delete Project-owned OS Installations, Knowledge, Artifacts or history.

## Hermes mapping

Hermes subagent batches and kanban workers provide coordination mechanics but not Team semantics. AGK may use `agent/subagent_lifecycle.py` for bounded AgentCalls and may evaluate kanban as a runtime work queue, while Team identity, routing, scope, membership and policy remain canonical AGK state.

## Canvas

A Team Canvas shows its route, members, OS bindings, Knowledge access, Tools, MCP and Runtime relationships. Every edge is semantic and permissioned. Live mode overlays current Task and Run state without changing the Team Definition.
