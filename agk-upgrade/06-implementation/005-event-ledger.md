# 005. Semantic Event Envelope and Ledger

**Priority:** P0

**Repository target:** packages/agk-events and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Create the versioned semantic event envelope, registry and durable ledger.

## Why it exists

Hermes hooks, RPC events, logs and trajectories are fragmented runtime signals.

## Hermes capabilities reused

- Hermes plugin hooks, callbacks and monitoring as adapter inputs

## Files inspected

- `hermes_cli/plugins.py`
- `gateway/hooks.py`
- `agent/monitoring`
- AGK-OS event contracts

## Files to create

- `packages/agk-events/src/envelope.ts`
- `packages/agk-events/src/registry.ts`
- `packages/agk-events/src/ledger.ts`
- `packages/agk-events/src/outbox.ts`

## Files to modify

- None.

## Schemas

- EventEnvelope
- ActorRef
- Causality
- EventSchemaVersion
- TransactionalOutboxRecord
- ConsumerCursor

## Interfaces

- registerSchema
- emitEvent
- subscribe
- readCursor
- appendMutationAndEvent
- publishOutbox
- acknowledgeCursor

## API impact

Versioned event ingest and subscription.

## Migration impact

Runtime adapters emit normalized new events; raw historical logs remain external evidence.

## Tests

- registered schema required
- classification maximum
- causal ids preserved
- domain mutation and event atomic
- outbox append is in the same transaction as mutation and event
- consumer restart replays and deduplicates by event id

## Acceptance criteria

- Every consequential mutation emits one registered event
- High-volume Span data is routed separately
- Unknown event names are refused
- Every semantic command atomically writes current state, event and outbox

## Risks

- Treating event ledger as event-sourced state
- acknowledging a Runtime event before durable ingest

## Dependencies

- `002`
- `003`
- `004`
