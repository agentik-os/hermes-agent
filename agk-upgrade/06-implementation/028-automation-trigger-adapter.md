# 028. Automation and Trigger Adapter

**Priority:** P1

**Repository target:** AGK orchestration core plus Hermes adapter

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the canonical Automation deployment binding while adapting Hermes cron, Loop and webhook mechanisms as bounded trigger providers.

## Why it exists

Hermes has several useful trigger and scheduling planes with separate stores and failure semantics. AGK needs one owner, Policy, idempotency model and event history.

## Hermes capabilities reused

- cron schedule parsing and scheduler provider
- cron execution ledger
- Session Loop controller
- gateway webhook and plugin hook signals

## Files inspected

- `cron/jobs.py`
- `cron/scheduler.py`
- `cron/executions.py`
- `cron/scheduler_provider.py`
- `hermes_cli/loops.py`
- `gateway/platforms/webhook.py`
- `agent/outbound_webhooks.py`

## Files to create

- `packages/agk-domain/src/automation.ts`
- standalone `agk_hermes_runtime/automation.py`

## Files to modify

- None until a single-authority adapter spike proves the required Hermes seam

## Schemas

- Automation
- TriggerBinding
- Job
- RuntimeTriggerBinding
- EffectDisposition

## Interfaces

- createAutomation
- deployAutomation
- claimFire
- authorizeFire
- dispatchTarget
- reconcileAttempt

## API impact

Adds canonical Automation commands, fire evidence and Runtime trigger provider interface.

## Migration impact

Existing Hermes cron jobs are not automatically canonical. Import creates one Automation binding only after owner, scope, target, Policy, Budget, idempotency and event mapping are supplied.

## Tests

- one AGK Automation maps to at most one active Hermes binding
- revoked permission blocks the next fire
- crash after dispatch records unknown instead of blind retry
- idempotent attempt deduplicates
- webhook authentication does not authorize the target action
- unavailable named scheduler provider never falls back to built-in storage in governed mode

## Acceptance criteria

- No dual scheduler truth
- Every fire correlates to Mission or Run and semantic events
- Misfire, retry and compensation remain target or Policy semantics, never a second Automation engine
- Runtime cannot extend schedule, Budget or authority
- AgentRuntime `schedule_trigger` remains unavailable until D-005 is ratified

## Risks

- duplicate external effects
- process-local idempotency and rate state
- treating hook delivery as durable queue

## Dependencies

- `005`
- `008`
- `010`
- `013`
- `032`
- `033`
- `035`
