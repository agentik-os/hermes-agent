# 032. Runtime Host, Supervisor and Authenticated Transport

**Priority:** P0

**Repository target:** AGK Runtime supervisor and sandbox guest host

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the sandbox-external supervisor, sandbox-internal Hermes host and authenticated length-delimited Protobuf transport.

## Why it exists

Hermes TUI JSON-RPC is a client protocol and not the governed host/guest security boundary. Whole-process isolation needs an external authority that can terminate, fence and attest the guest.

## Hermes capabilities reused

- `AIAgent` and gateway service inside the guest
- environment lifecycle mechanics where attested
- interrupt and Session operations as adapter inputs

## Files inspected

- `tui_gateway/entry.py`
- `run_agent.py`
- `tools/environments`
- AGK Runtime protocol canon

## Files to create

- `packages/agk-runtime/src/supervisor.ts`
- standalone `agk_hermes_runtime/guest_host.py`
- `packages/agk-runtime-protocol/src/supervisor.proto`

## Files to modify

- None until the protocol spike proves a missing generic Hermes seam

## Schemas

- RuntimeHostHandshake
- SandboxAttestation
- RuntimeLease
- EventSequence
- TerminationReceipt

## Interfaces

- launchGuest
- authenticateGuest
- negotiateCapabilities
- sendCommand
- cancelCommand
- reconnect
- terminateGuest
- attestGuest

## API impact

Creates the physical Runtime boundary used by AgentRuntime.

## Migration impact

Existing local Hermes processes are trusted-operator sessions and are not silently promoted to governed guests.

## Tests

- mutual handshake and replay rejection
- length framing and unknown fields
- deadline and cancellation
- reconnect with lease and fencing check
- forced process-tree termination receipt
- no local fallback when sandbox is unavailable

## Acceptance criteria

- Guest cannot reach control-plane effects except through brokers
- Supervisor can revoke and terminate independently of guest hooks
- Immutable guest configuration is attested
- Every command and event carries runtime, Session and Run correlation

## Risks

- treating IPC authentication as tenant authorization
- guest holding reusable credentials
- unacknowledged event loss

## Dependencies

- `008`
- `010`
- `027`
- `031`
