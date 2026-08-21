# 013. Session Binding, Checkpoint and Recovery

**Priority:** P0

**Repository target:** AGK Session service and Hermes adapter

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Bind Hermes runtime sessions to canonical AGK Sessions and recover without identity loss.

## Why it exists

A process or Hermes session lineage cannot become the Project continuity model.

## Hermes capabilities reused

- SessionDB lineage
- interrupt
- gateway and TUI session methods

## Files inspected

- hermes_state_common.py
- hermes_state.py
- `tui_gateway/methods_session.py`
- `run_agent.py::interrupt`

## Files to create

- `packages/agk-domain/src/session.ts`
- standalone `agk_hermes_runtime/session.py`
- standalone `agk_hermes_runtime/checkpoint.py`

## Files to modify

- None.

## Schemas

- Session
- SessionBinding
- SessionCheckpoint
- RecoveryAttempt
- CheckpointCut
- RuntimeLeaseRef

## Interfaces

- createSession
- bindRuntimeSession
- checkpoint
- detach
- resume
- recover
- takeover
- reconcileUnknownEffect

## API impact

Session commands and event stream.

## Migration impact

Hermes history can be linked as runtime evidence; canonical AGK ids are newly assigned through explicit import.

## Tests

- process death preserves Session
- lineage maps correctly
- checkpointable distinct from portable
- hard revocation interrupt
- atomic checkpoint cut and forced termination acknowledgment
- stale lease and fencing epoch refuse takeover
- compensate, adopt and abandon unknown effect paths

## Acceptance criteria

- Mission and Session ids never collapse
- Cross-provider resume states fidelity honestly
- Recovery creates attributable attempts
- every execution retry binds a new Run id, records parent correlation and fidelity loss

## Risks

- Pretending model cognition can be restored

## Dependencies

- `005`
- `008`
- `010`
- `031`
- `032`
- `035`
