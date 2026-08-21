# Hermes Scheduler Map

## Cron

`cron/jobs.py` stores jobs atomically in profile-scoped JSON. `cron/scheduler.py` executes due jobs and delivery. `cron/scheduler_provider.py` separates trigger providers from execution, with `InProcessCronScheduler` as built-in and managed alternatives such as Chronos.

Supported schedules include relative delays, intervals, cron expressions and ISO timestamps. Jobs can bind Skills, scripts, models, providers, workdirs, continuity and delivery targets. Fresh Session isolation and recursion guards are explicit.

## Session controllers

Hermes `/goal` runs judge-driven continuation with deterministic quality gates and wait barriers. `/loop` runs fixed or self-paced recurring Session wakeups. Both persist state and preserve prompt caching through user-role continuation turns.

## Kanban dispatcher

The gateway can run the durable board dispatcher, reclaim workers, promote dependencies and spawn profiles. This is a work queue rather than a scheduler definition.

## AGK mapping

- Cron trigger and execution mechanics: ADAPT behind Automation authority.
- `/loop`: optional Session Loop controller beneath an AGK Loop Deployment.
- `/goal`: bounded Run completion controller, not an AGK Goal object.
- Kanban: DEFER until one canonical Task authority is proven.

A governed deployment cannot allow uncorrelated Hermes jobs beside AGK Automations.

## Durability semantics

Cron advances recurring schedule state before execution and records attempts in a separate execution ledger. A crash after dispatch may become `unknown` and is not automatically retried because an external effect may already have occurred. The Agent timeout is inactivity-based rather than a fixed wall-clock ceiling.

AGK adoption therefore needs idempotency, effect disposition, owner, Budget and reconciliation. The ledger is evidence and not a retry queue.
