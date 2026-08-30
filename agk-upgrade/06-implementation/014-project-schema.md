# 014. Outcome-Oriented Project

**Priority:** P0

**Repository target:** AGK domain and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement Project as an operational organization around an outcome.

## Why it exists

Hermes Project is a multi-folder runtime record and cannot satisfy AGK Project semantics. `Workspace` remains a UI layout term only.

## Hermes capabilities reused

- Hermes Project only as private `HermesProjectRecord` adapter data

## Files inspected

- `hermes_cli/projects_db.py`
- `tui_gateway/project_tree.py`
- AGK Project canon

## Files to create

- `packages/agk-domain/src/project.ts`
- `packages/agk-domain/src/repository-binding.ts`

## Files to modify

- None.

## Schemas

- Project
- ProjectOutcome
- RepositoryBinding
- ProjectStage
- HermesProjectRecord only in the adapter package

## Interfaces

- createProject
- bindRepository
- importHermesProjectFolders
- archiveProject

## API impact

Project commands and projections.

## Migration impact

Do not rename Hermes projects in place. Create explicit bindings to a new AGK Project.

## Tests

- minimum Human plus Oracle
- Organization required
- no Workspace domain type or scope
- canonical IDEA through IMPROVE stage machine
- Runtime loss continuity

## Acceptance criteria

- A Project exists without a folder
- A folder can bind without becoming identity
- Project survives Runtime deletion

## Risks

- UI leaking Hermes Project ids

## Dependencies

- `002`
- `003`
- `004`
- `005`
