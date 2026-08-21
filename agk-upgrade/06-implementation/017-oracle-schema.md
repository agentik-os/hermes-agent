# 017. Oracle Persistent Domain Owner

**Priority:** P0

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement Oracle mandate, domain state, inbox, decisions, KPIs, subscriptions and authority.

## Why it exists

Hermes has workers and managers but no persistent domain owner.

## Hermes capabilities reused

- Hermes AIAgent as one execution path
- gateway and event delivery transports

## Files inspected

- AGK Oracle canon
- `gateway/run.py`
- run_agent.py

## Files to create

- `packages/agk-domain/src/oracle.ts`
- `packages/agk-domain/src/oracle-state.ts`

## Files to modify

- None.

## Schemas

- OracleDefinition
- OracleInstance
- OracleMandate
- OracleStateProjection

## Interfaces

- createOracle
- bindOS
- subscribeOracle
- recordDecision
- escalate

## API impact

Oracle commands, inbox and projection queries.

## Migration impact

Long-running agents do not become Oracles without required state and mandate.

## Tests

- one Project owner
- decision history
- subscription cursor
- authority boundary
- default sizing

## Acceptance criteria

- Project can operate with one Executive Oracle
- Manager Agent is not misclassified
- Process outage does not erase ownership

## Risks

- Creating an Oracle per department by default

## Dependencies

- `005`
- `014`
- `015`
- `016`
