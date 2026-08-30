# 024. Recursive Organization Canvas

**Priority:** P1

**Repository target:** canonical AGK Web and Tauri Build UI, with bounded Expo mobile projection

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement semantic recursive Canvas with Design, Live and Inspect overlays.

## Why it exists

Visual organization operation is a core differentiator and must not become decorative state.

## Hermes capabilities reused

- Hermes Desktop panes and UI kit as behavior references only
- existing gateway, terminal and object-inspection behavior through adapters
- AGK ReactFlow and Stax client contracts from the locked stack

## Files inspected

- `apps/desktop contribution system`
- AGK Canvas canon

## Files to create

- `apps/agk-web/src/canvas`
- `apps/agk-mobile/src/canvas-projection`
- `packages/agk-domain/src/canvas-commands.ts`

## Files to modify

- None.

## Schemas

- CanvasNodeProjection
- CanvasEdgeProjection
- GraphDiff
- LayoutState

## Interfaces

- loadCanvas
- proposeEdge
- applySemanticCommand
- selectOverlay

## API impact

AGK object query and semantic command endpoints.

## Migration impact

No import of visual lines without semantic types.

## Tests

- stale structural write refused
- layout revision independent
- recursive Project to OS drill
- permission overlay
- mobile inspect, zoom, follow-live, open output, pause, approve, reject and retry
- mobile structural authoring is refused
- Design maps to Build authoring; Inspect exposes Debug, Replay, Analytics, Cost and Quality
- Replay observation never mutates or resumes original execution
- Live subscribes to state transitions rather than unbounded Span volume

## Acceptance criteria

- Reference company, Builder OS and Journal OS render
- Every edge resolves a canonical relationship
- Design changes are reviewable diffs
- Tauri renders the shared Web implementation rather than a second Canvas

## Risks

- Canvas as second source of truth
- performance on large graphs
- desktop and Web behavior drift

## Dependencies

- `002`
- `014`
- `016`
- `017`
- `018`
- `019`
- `022`
- `023`
