# AGK Automation Model

## Definition

Automation is a deployed binding:

```text
Trigger + executable target + Policy = Automation
```

It is not a second orchestration engine. The target is a reference to a Flow, Loop, Mission or Agent that already knows how to run. Graph and Tool are not Automation targets.

## Contract

```text
Automation
├── trigger
├── conditions
├── target: Flow | Loop | Mission | Agent
├── permissions
├── schedule
├── budget
├── failure handling
├── alerts
├── policy
└── owner
```

Automation is itself the deployment binding. It has no separate Definition or Deployment ontology, contains no branching or node model and does not duplicate execution logic. Retry, compensation and misfire behavior belong to the target and applicable Policy or to supporting queue and retry engines.

## Trigger types

- schedule or calendar
- semantic event subscription
- external webhook or Connector event
- object state transition
- manual fire
- Runtime or health signal

A Trigger is a source declaration and never owns target execution semantics.

## Execution evidence

Each fire is recorded as Trigger evidence and creates or references the appropriate Job, Mission, Session and Run records. Those records carry correlation, idempotency, authorization, effect disposition and recovery state. They are not a separate fire-attempt domain type.

```text
Trigger:     armed -> fired -> matched | filtered | cooled-down
Automation:  draft -> deployed -> paused -> disabled -> archived
Job:         queued -> running -> succeeded | failed | retrying | dead-lettered
```

An external effect with unknown disposition is represented on the Job or Run effect receipt and reconciled there.

## Hermes mapping

Hermes cron, `/loop`, gateway hooks and webhooks are candidate trigger providers. They remain Runtime bindings and never peer authorities.

- `cron/jobs.py` and `cron/scheduler.py` can supply schedule parsing and execution mechanics.
- `/loop` can supply one Session-scoped controller.
- gateway webhooks and plugin hooks can supply edge signals.
- the cron execution ledger is Evidence and not a retry queue.

A corresponding AGK Automation id, owner, Policy, Budget and event record is mandatory. A raw Hermes job outside that mapping is disabled in governed mode or treated as an explicit operational exception.

## Retry and recovery

Retry is permitted only when the target and Policy allow it. Queue, Retry, Circuit Breaker and Health engines own operational mechanics. Automation references their policy and never copies their execution state. A model or Runtime cannot extend its own schedule, Budget or authority.

## Security

Authorization is evaluated on every fire using current canonical state. A previously valid scheduled job does not retain permission after revocation. Webhook authentication proves source transport and does not authorize the target action.

## Surface

Automations show trigger, target, owner, next fire, last attempt, Policy, Budget, health and reconciliation state. Learn, Build, Deals and Self may use the same primitive with different domain views.
