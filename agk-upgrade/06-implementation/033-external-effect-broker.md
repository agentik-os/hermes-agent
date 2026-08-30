# 033. External Effect and Authorization Broker

**Priority:** P0

**Repository target:** AGK Runtime and governance boundary

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Physically mediate every consequential guest effect with a fail-closed authorization envelope.

## Why it exists

Hermes plugin hooks and middleware swallow or isolate exceptions and are not containment. Exact model-generated arguments appear after the Run-level decision and require use-time authorization.

## Hermes capabilities reused

- hook and approval signals as observation and defense-in-depth only
- Tool schemas for typed action construction

## Files inspected

- `hermes_cli/plugins.py`
- `hermes_cli/middleware.py`
- `agent/tool_executor.py`
- `SECURITY.md`

## Files to create

- `packages/agk-runtime/src/effect-broker.ts`
- `packages/agk-runtime/src/authorization-envelope.ts`
- `packages/agk-runtime/src/secret-broker.ts`

## Files to modify

- Generic Hermes mediation seams only if an external broker cannot cover an operation; record each future change

## Schemas

- AuthorizationEnvelope
- EffectIntent
- EffectReceipt
- SecretLease
- EgressDecision

## Interfaces

- authorizeEffect
- executeEffect
- resolveSecretLease
- queryEffect
- revokeEnvironmentEpoch

## API impact

All Tool, process, file, network, Connector, secret and model effects traverse the broker.

## Migration impact

Hermes session or permanent approvals are not imported as AGK ApprovalGrant objects.

## Tests

- actor, action, argument hash, object and Run mismatch deny
- policy revision, expiry, nonce, environment epoch and fencing mismatch deny
- broker outage fails closed
- duplicate idempotency key returns prior disposition
- hook exception cannot bypass broker

## Acceptance criteria

- No ordinary plugin callback is sole enforcement
- Guest has no reusable provider or Connector secret
- Every external effect has intent, authorization and receipt
- Critical unknown disposition requires reconciliation

## Risks

- TOCTOU between approval and exact arguments
- duplicated approval authority
- secret or network side channel bypass

## Dependencies

- `004`
- `008`
- `010`
- `031`
- `032`
