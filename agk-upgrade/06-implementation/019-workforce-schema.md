# 019. Workforce Definition, Instance and Deployment

**Priority:** P1

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement deployable organizational systems and immutable snapshots.

## Why it exists

Hermes profiles and kanban workers are mechanisms, not sellable or governed Workforces.

## Hermes capabilities reused

- Hermes profiles and Runtime adapter for Agent execution
- kanban only if mapped as noncanonical queue

## Files inspected

- `hermes_cli/profiles.py`
- `hermes_cli/kanban_db.py`
- AGK Workforce canon

## Files to create

- `packages/agk-domain/src/workforce.ts`
- `packages/agk-domain/src/deployment-snapshot.ts`

## Files to modify

- None.

## Schemas

- WorkforceDefinition
- WorkforceInstance
- DeploymentSnapshot

## Interfaces

- publishWorkforce
- instantiateWorkforce
- simulate
- deploy
- upgrade

## API impact

Workforce and deployment commands.

## Migration impact

No automatic packaging of live profiles, credentials or Memory.

## Tests

- definition immutable
- instance private state excluded from package
- snapshot pins all versions
- upgrade diff

## Acceptance criteria

- Reference company organization is representable
- Published update never mutates production

## Risks

- Treating Workforce as Agent group

## Dependencies

- `016`
- `017`
- `018`
