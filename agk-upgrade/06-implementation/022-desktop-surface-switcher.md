# 022. AGK Reference Shell and Surface Switcher

**Priority:** P1

**Repository target:** canonical AGK product repository, `apps/agk-web` and Tauri `apps/agk-desktop`

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the canonical AGK Web shell and its Tauri desktop wrapper with Collective, Learn, Build, Deals and Evolve top-level switching, plus Operate, Design, Code and Inspect modes inside Build.

## Why it exists

The operator requires one top-bar switch that changes the whole contextual layout.

## Hermes capabilities reused

- Electron shell behavior as a reference
- titlebar, routes, panes and layout behavior as extraction candidates
- nanostores patterns where framework-neutral behavior is proven
- `apps/shared` gateway transport and profile-routing behavior
- Hermes Desktop as behavioral reference and optional transition prototype

## Files inspected

- `apps/desktop/AGENTS.md`
- `apps/desktop/DESIGN.md`
- `apps/desktop/src/app/routes.ts`
- `apps/desktop/src/sdk/index.ts`
- `spikes/001-agk-surface-shell/` on branch `agk/desktop-visual-prototype`

## Files to create

- `apps/agk-web/src/shell/surfaces.ts`
- `apps/agk-web/src/shell/surface-context.ts`
- `apps/agk-desktop` Tauri shell configuration

## Files to modify

- No Hermes production file is required by this task
- A separate extraction spike records any neutral source reused from Hermes

## Schemas

- SurfaceDefinition
- SurfaceLayoutBinding
- SurfaceContext
- ScopeEpoch

## Interfaces

- selectSurface
- resolveSurfaceModule
- applySurfaceLayout
- selectBuildMode
- openRight

## API impact

Shared Web and Tauri presentation state only, backed by canonical ids and object references.

## Migration impact

Hermes Runtime consoles remain reachable through adapter views or external deep links. They are not reclassified as AGK product routes.

## Tests

- switch preserves Organization and entity context
- surface status bar capability
- all locales
- no background focus steal
- surface selection does not change profile, connection, Toolsets or prompt bytes
- existing public SDK limitation for applying layout presets is proven in a focused test
- Web and Tauri render the same shell and object routes
- Build exposes Operate, Design, Code and Inspect without making Code a peer universe
- Organization switch increments a scope epoch and drops late prior-scope responses

## Acceptance criteria

- One shell remains mounted
- Canonical ids are collective, learn, build, deals, evolve
- Build mode ids are operate, design, code, inspect
- Surface switch changes nav, layout and inspector
- If automatic layout activation is required, one generic SDK action exposes the existing internal preset resolver
- SurfaceContext is URL-addressable and re-resolves object permissions

## Risks

- Hardcoded AGK branches scattered through shell
- Retired labels entering contracts
- Importing desktop internals from a runtime plugin instead of widening one generic seam
- Replacing the locked Tauri client with Hermes Electron

## Dependencies

- `014`
- `016`
- `017`
- `019`
- `021`
