# AGK Workforce Model

## Definition

A Workforce is a deployable organizational system containing Teams, Agents, Oracles, operating rules and OS dependencies. It is not a larger agent group.

## Layers

```text
Workforce Definition
  -> Workforce Instance
  -> Deployment Snapshot
  -> Runs
```

The Definition may include:

- Oracle Definitions
- Team Definitions and routes
- Agent templates
- OS dependencies
- Flow and Loop Definitions
- policies and evals
- Knowledge and Memory schemas
- package requirements
- dashboard and LayoutDefinition templates

The Instance adds real members, connector bindings, Knowledge, Budgets, permissions, runtime targets and live state. The Deployment Snapshot pins every executable version.

## Packaging

Only a versioned Workforce Package is shared or sold. A live Workforce Instance, credentials, private Memory, connector bindings, customer data and Budget are never packaged.

Installation follows:

```text
inspect permissions -> resolve dependencies -> install Definitions
-> connect accounts -> bind Knowledge -> create Instance
-> simulate -> evaluate -> approve -> deploy
```

## Hermes mapping

Hermes profiles, delegation and kanban provide useful worker execution and durable queue mechanisms but do not constitute a Workforce. AGK composes them behind Runtime bindings. The Workforce remains an AGK object with version, policy, permissions and deployment semantics.

## Upgrade

A package update produces a semantic diff. It never mutates production automatically. Migration, evals, policy simulation, human review where required and an immutable new Deployment Snapshot precede activation.

## Canvas

The Workforce Canvas shows Oracles, Teams, Agents, OS dependencies and shared resources. It supports recursive drill-in, Design, Live and Inspect overlays, and graph diff review. Layout positions never become organizational truth.

## Lifecycle

```text
definition: draft -> published -> deprecated
instance: installed -> configured -> simulated -> deployed -> paused -> retired
deployment: immutable snapshot
```
