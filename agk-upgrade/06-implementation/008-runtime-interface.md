# 008. AgentRuntime Interface

**Priority:** P0

**Repository target:** packages/agk-runtime-protocol

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Publish a provider-neutral, versioned AgentRuntime contract and capability descriptor.

## Why it exists

AGK domain code must not depend directly on Hermes internals.

## Hermes capabilities reused

- Hermes gateway JSON-RPC and execution concepts as evidence

## Files inspected

- run_agent.py
- `tui_gateway/server.py`
- `website/docs/developer-guide/architecture.md`

## Files to create

- `packages/agk-runtime-protocol/src/agent-runtime.proto`
- `packages/agk-runtime-protocol/src/capabilities.proto`
- `packages/agk-runtime-protocol/src/errors.proto`
- `packages/agk-runtime-protocol/src/supervisor.proto`

## Files to modify

- None.

## Schemas

- RuntimeDescriptor
- RunRequest
- RuntimeEvent
- CheckpointDescriptor
- RecoveryDisposition
- AuthorizationEnvelope transport message
- LeaseDescriptor
- EffectDisposition
- EventCursor

## Interfaces

- capabilities
- createAgent
- startSession
- runAgent
- interruptRun
- stopAgent
- spawnAgentCall
- executeTool
- installSkill
- scheduleTrigger
- checkpoint
- resume
- streamEvents
- acknowledgeEvents
- queryEffect
- reconcileRun

## API impact

Length-delimited Protobuf contract under AGK AD-301. The host/guest protocol defines a sandbox-external supervisor, sandbox-internal runtime host, authenticated handshake, framing, deadlines, cancellation, reconnect, sequence and capability negotiation. Hermes TUI newline JSON-RPC is evidence only and is not this protocol.

## Migration impact

None. This is the first published adapter contract.

## Tests

- canonical binary vectors
- unknown field tolerance
- capability refusal
- version mismatch
- all declared AgentRuntime operations have binary vectors and refusal cases
- authenticated host/guest handshake, deadline, cancellation and reconnect
- exact AuthorizationEnvelope argument hash, Approval or ApprovalGrant reference and fencing token
- event ACK, replay, gap and deduplication

## Acceptance criteria

- No AGK domain service imports Hermes modules
- Capability is negotiated
- Errors name recovery preconditions
- No effect operation executes without a current exact AuthorizationEnvelope and any required canonical Approval or ApprovalGrant
- Host and guest transport is specified independently from Hermes renderer RPC

## Risks

- Speculative alternative-runtime methods without a Hermes consumer

## Dependencies

- `004`
- `005`
- `007`
- `021`
- `031`
