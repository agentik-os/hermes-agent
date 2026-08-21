# 031. Mission, Plan, Task and Run Spine

**Priority:** P0

**Repository target:** canonical AGK domain and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the canonical execution spine required before any Runtime can execute work.

## Why it exists

RunRequest references Mission, Plan, Task, Agent, Session and Run. A Runtime adapter cannot be executable before these identities, transitions and ownership rules exist.

## Hermes capabilities reused

- Hermes session and run history as migration evidence only
- kanban Task rows as optional runtime correlation, never canonical state

## Files inspected

- AGK Mission, Plan, Task, Session and Runtime canon
- `hermes_state.py`
- `hermes_cli/kanban_db.py`

## Files to create

- `packages/agk-domain/src/mission.ts`
- `packages/agk-domain/src/plan.ts`
- `packages/agk-domain/src/task.ts`
- `packages/agk-domain/src/run.ts`

## Files to modify

- None during architecture phase

## Schemas

- Mission
- Plan
- Task
- Run
- EffectIntent
- EffectReceipt
- Lease
- FencingEpoch

## Interfaces

- createMission
- publishPlan
- transitionTask
- admitRun
- acquireLease
- renewLease
- releaseLease
- recordEffectIntent
- reconcileEffect

## API impact

Adds semantic commands and projections for the execution hierarchy.

## Migration impact

Hermes Session, Goal and kanban rows can carry correlation references only. They are never renamed into canonical objects.

## Tests

- Mission spans multiple Sessions
- Task transitions use compare-and-set revision
- Run cannot start without admitted Task, Agent, Session, Harness and Budget
- stale lease and fencing epoch deny
- unknown external effect requires reconcile, compensate, adopt or abandon

## Acceptance criteria

- Every RunRequest resolves existing canonical ids
- Run uses the canonical `queued -> running -> succeeded | failed | cancelled | timed_out` state machine
- execution retry or replay creates a new Run id with parent correlation and never mutates history
- Effects are idempotent or carry unknown disposition
- Runtime loss never changes Mission, Plan or Task identity

## Risks

- collapsing Run and Session
- using kanban as canonical Task state
- retrying unknown effects blindly

## Dependencies

- `002`
- `003`
- `004`
- `005`
- `006`
- `014`
- `015`
