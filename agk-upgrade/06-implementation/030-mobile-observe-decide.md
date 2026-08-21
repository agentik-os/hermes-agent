# 030. Mobile Observe and Decide Surface

**Priority:** P2

**Repository target:** canonical AGK Expo mobile client

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Define the bounded mobile projection of the shared AGK shell, Stax history, Canvas, approvals and conversations without duplicating desktop authoring.

## Why it exists

AGK canon locks Expo mobile and deliberately gives it different complexity. Mobile must support action and inspection while heavy Canvas and terminal construction stay desktop-first.

## Hermes capabilities reused

- gateway transport semantics
- entity-scoped conversation backend
- notification and approval delivery patterns
- Runtime event stream through AGK adapter

## Files inspected

- AGK client-scope canon
- Hermes gateway and shared transport
- mobile requirements in the refined operator prompt

## Files to create

- `apps/agk-mobile/src/shell`
- `apps/agk-mobile/src/stax`
- `apps/agk-mobile/src/canvas-projection`
- `apps/agk-mobile/src/approvals`

## Files to modify

- shared client contracts only through additive changes

## Schemas

- MobileSurfaceCapability
- MobileStaxHistory
- MobileCanvasProjection

## Interfaces

- openObject
- followLive
- pauseRun
- approve
- reject
- retry
- converse

## API impact

Consumes the same typed object, command and event contracts as Web and Tauri with a narrower capability profile.

## Migration impact

None until the reference Web shell and shared contracts are stable.

## Tests

- mobile capability negotiation
- inspect and follow-live Canvas
- pause, approve, reject and retry
- no structural graph authoring
- offline and reconnect state
- deep links preserve object and surface context

## Acceptance criteria

- Mobile can observe, decide and converse
- Mobile cannot author Flow or organization structure
- Stax semantics become one primary panel plus back history
- Permissions and scope epoch match Web and Tauri

## Risks

- forcing desktop layout onto small screens
- hidden capability drift
- offline approval replay

## Dependencies

- `005`
- `022`
- `023`
- `024`
- `026`
