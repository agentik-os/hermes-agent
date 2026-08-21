# 023. Context Inspector and Stax Surface Model

**Priority:** P1

**Repository target:** canonical AGK Web and Tauri clients

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the universal Context Inspector and canonical Stax open-right chain over AGK object projections.

## Why it exists

AGK requires deep inspection while preserving Hermes files, git, terminal and session panes.

## Hermes capabilities reused

- Pane registry
- layout tree
- files, git, terminal and preview panes

## Files inspected

- `apps/desktop/src/contrib`
- `apps/desktop/src/store/layout.ts`
- desktop plugin SDK

## Files to create

- `apps/agk-web/src/stax`
- `apps/agk-web/src/inspector`
- `packages/agk-stax`

## Files to modify

- None.

## Schemas

- InspectorSection
- SurfaceContext
- StaxPanel
- LayoutProjection
- LayoutDefinitionRef
- InspectorResolution
- ContextStackProjection

## Interfaces

- inspectObject
- applyLayoutProjection
- openObjectSurface
- openRight
- bumpScopeEpoch
- resolveInspectorSection
- projectContextStack

## API impact

Renderer projections over AGK queries.

## Migration impact

Existing Hermes layout remains renderer-local `HermesWindowLayoutProjection` cache and is not domain state. It is never imported as canonical, versioned, permissioned, forkable or publishable `LayoutDefinition` without explicit semantic conversion.

## Tests

- entity-specific sections
- hidden pane remains mounted
- layout does not mutate object
- Organization switch clears scope
- Organization switch invalidates every open reference and late response through scope epoch
- open-right chain is URL-addressable and has no logical depth cap
- inspector resolves `surface state -> object-type default -> global default`
- the same object may open on a different Inspector section from Canvas or Mission context
- Context Stack remains always-visible intelligence configuration and is distinct from Stax and Inspector

## Acceptance criteria

- Agent, Project, Oracle, OS and file inspectors resolve correctly
- Files, Git, Runs and Memory are typed Stax panels, never hidden workspace tabs
- LayoutDefinition and Stax are distinct: the first saves arrangement, the second is navigation semantics
- SurfaceContext contains Organization, Project, surface id, object reference, selection, Inspector state and scope epoch

## Risks

- Renderer cache becoming authority

## Dependencies

- `022`
