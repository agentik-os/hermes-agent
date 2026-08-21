# 025. AGK Architect Proposal and Apply Foundation

**Priority:** P1

**Repository target:** AGK intelligence core and Build UI

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Create an architecture proposer that emits validated semantic diffs and never deploys without authority.

## Why it exists

Natural-language organization construction is valuable only after schemas, commands and review exist.

## Hermes capabilities reused

- Hermes Agent runtime for reasoning and tools

## Files inspected

- run_agent.py
- AGK schemas and Canvas commands

## Files to create

- `packages/agk-domain/src/architect.ts`
- `apps/agk-web/src/architect`

## Files to modify

- None.

## Schemas

- ArchitectureIntent
- ArchitectureProposal
- GraphDiff
- ValidationReport

## Interfaces

- proposeArchitecture
- resolveDependencies
- validateProposal
- applyApprovedDiff

## API impact

Draft and approval commands.

## Migration impact

None. Existing free-text designs can be attached as inputs, not parsed into production automatically.

## Tests

- proposal cannot self-approve
- missing dependency blocks
- permission review
- semantic diff deterministic

## Acceptance criteria

- Content Workforce example is proposed and reviewable
- Apply uses existing object commands
- No direct database or Runtime mutation

## Risks

- Natural language to unchecked JSON
- hidden architectural decisions

## Dependencies

- `016`
- `019`
- `020`
- `021`
- `024`
