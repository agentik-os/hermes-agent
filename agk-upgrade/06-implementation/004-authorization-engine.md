# 004. Authorization Decision Engine

**Priority:** P0

**Repository target:** AGK Kernel and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement Capability intersected with Permission, Risk, Policy, Environment and Approval as a versioned decision.

## Why it exists

Hermes approvals and toolsets are local controls, not AGK multi-tenant authorization.

## Hermes capabilities reused

- Hermes approval and hook signals as observation and defense-in-depth inputs only
- no ordinary in-process hook or middleware is accepted as the sole enforcement boundary

## Files inspected

- `tools/approval.py`
- `agent/tool_guardrails.py`
- `gateway/authz_mixin.py`
- AGK-OS permissions canon

## Files to create

- `packages/agk-domain/src/authorization.ts`
- `packages/agk-domain/src/approval.ts`
- `packages/agk-domain/src/autonomy-lease.ts`

## Files to modify

- None.

## Schemas

- PermissionGrant
- RiskAssessment
- PolicyDecision
- Approval
- ApprovalGrant
- AutonomyLease
- AuthorizationEnvelope transport projection

## Interfaces

- authorize
- requestApproval
- reevaluateGrant
- revokeLease
- mintAuthorizationEnvelope
- verifyAuthorizationEnvelope

## API impact

Synchronous allow decision plus durable asynchronous approval commands.

## Migration impact

No automatic conversion of Hermes allowlists into AGK Permission grants.

## Tests

- each term independently denies
- expiry never approves
- stale projection fails closed
- actor cannot raise own authority
- exact action and parameter hash mismatch denies
- middleware or hook exception never executes an effect

## Acceptance criteria

- A decision records all six terms
- Every grant use is re-evaluated
- Denial reason is machine and human readable
- External effect broker physically mediates secrets, model egress, Tool effects, files, network and process control

## Risks

- Collapsing availability and authorization
- treating fail-open Hermes plugin callbacks as the authorization boundary

## Dependencies

- `002`
- `003`
