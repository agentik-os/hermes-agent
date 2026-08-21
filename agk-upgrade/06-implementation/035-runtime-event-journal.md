# 035. Runtime Event Journal, ACK and Replay

**Priority:** P0

**Repository target:** AGK Runtime host and semantic event ingest

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Provide durable Runtime event sequencing, host ingest, ACK, replay, deduplication and explicit gap reporting.

## Why it exists

Hermes monitoring and stream observers are lossy. `stream_events(cursor)` cannot promise replay after process failure without a journal and acknowledgment protocol.

## Hermes capabilities reused

- lifecycle hooks, tool callbacks and monitoring as signal inputs
- SessionDB and subsystem ledgers as reconciliation evidence

## Files inspected

- `agent/monitoring/emitter.py`
- `agent/plugin_stream_hooks.py`
- `cron/executions.py`
- `gateway/delivery_ledger.py`

## Files to create

- standalone `agk_hermes_runtime/event_journal.py`
- `packages/agk-runtime/src/event-ingest.ts`
- `packages/agk-events/src/runtime-normalizer.ts`

## Files to modify

- None until event-producer behavior tests prove a missing source seam

## Schemas

- GuestRuntimeEvent
- EventSequence
- EventAck
- EventGap
- TraceLossReport

## Interfaces

- appendGuestEvent
- streamFromSequence
- ingestAndPersist
- acknowledgeSequence
- reconcileGap

## API impact

Implements replayable Runtime events beneath the canonical semantic event ledger.

## Migration impact

Historical Hermes logs and trajectories remain Evidence with explicit fidelity, never a complete reconstructed ledger.

## Tests

- crash before ACK replays
- duplicate event id deduplicates
- host ACK only after durable ingest
- sequence gap emits EventGap
- retention exhaustion is visible
- host stamps canonical correlation and classification

## Acceptance criteria

- Runtime stream never claims completeness across an unreported gap
- Control-plane event and outbox persist transactionally
- high-volume Spans stay separate from semantic events
- replay cursor survives guest restart

## Risks

- ACK before persistence
- unbounded guest spool
- equating raw hooks with domain events

## Dependencies

- `005`
- `008`
- `010`
- `031`
- `032`
