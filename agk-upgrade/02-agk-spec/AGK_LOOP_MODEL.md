# AGK Loop Model

## Definition

A Loop is a reusable bounded iterative controller. A Loop Deployment is persistent and creates finite Mission cycles.

```text
Loop Definition -> Loop Deployment -> trigger -> finite Mission -> evaluation -> next cycle
```

## Required bounds

Every Loop declares maximum cycles or a stopping condition, time and Budget limits, failure policy, escalation, concurrency, backoff, idempotency and review rules.

## State

```text
draft -> deployed -> active -> waiting | paused -> completed | failed | retired
```

A long-lived service is not an infinite Mission.

## Hermes mapping

Hermes `/loop` is a session-scoped recurring wakeup controller and `/goal` is a judge-driven session objective. Hermes cron is a durable scheduler. These may implement portions of a Loop Deployment through adapters, but their records are not canonical AGK Loop or Mission objects.

## Safety

A Loop cannot extend its own autonomy, Budget or authority. Repeated failure triggers bounded recovery and escalation rather than silent infinite retry.
