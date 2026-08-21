# 018. Team Membership and Routing

**Priority:** P1

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement bounded Team membership, route resolution, capacity, communication and optional Budget allocation.

## Why it exists

Subagent groups do not provide human plus AI Team semantics.

## Hermes capabilities reused

- Hermes bounded AgentCalls and gateway delivery

## Files inspected

- `agent/subagent_lifecycle.py`
- `tools/delegate_tool.py`
- AGK Team canon

## Files to create

- `packages/agk-domain/src/team.ts`
- `packages/agk-domain/src/team-routing.ts`

## Files to modify

- None.

## Schemas

- TeamDefinition
- TeamInstance
- TeamMembership
- TeamRoute

## Interfaces

- createTeam
- addMember
- resolveTeamRoute
- dissolveTeam

## API impact

Team commands and routing query.

## Migration impact

No conversion from delegation batches.

## Tests

- broadcast not default
- human and Agent distinct
- route required
- nested Budget

## Acceptance criteria

- Addressing Team resolves route first
- Dissolution preserves Project assets

## Risks

- Broadcast storms and identity collapse

## Dependencies

- `003`
- `004`
- `014`
- `015`
- `017`
