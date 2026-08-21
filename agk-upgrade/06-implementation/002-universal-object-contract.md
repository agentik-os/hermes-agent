# 002. Universal Object and Relationship Contract

**Priority:** P0

**Repository target:** AGK product repository, packages/agk-domain

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Define the base object, registered type contract, typed relationships, revisions, scope and provenance.

## Why it exists

Every higher-order AGK primitive depends on one identity and mutation model.

## Hermes capabilities reused

- AGK-OS universal object canon

## Files inspected

- `AGK-OS doc/01-foundations/04-object-model-and-invariants.md`

## Files to create

- `packages/agk-domain/src/object.ts`
- `packages/agk-domain/src/relationships.ts`
- `packages/agk-domain/src/registry.ts`

## Files to modify

- None.

## Schemas

- AGKObject
- Relationship
- ObjectTypeRegistry
- RevisionConflict

## Interfaces

- createObject
- updateObject with expected rev
- addRelationship
- removeRelationship

## API impact

Typed command and query contracts.

## Migration impact

No legacy product data exists. Define import contracts only.

## Tests

- stable id
- mandatory owning Organization
- compare-and-set conflict
- typed edge direction
- history append-only

## Acceptance criteria

- An unregistered type is refused
- A missing Organization owner is refused
- A stale write returns a field diff
- Every accepted mutation emits a semantic event

## Risks

- Over-general metadata could hide domain logic

## Dependencies

- `001`
