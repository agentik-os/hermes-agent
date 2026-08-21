# 016. OS Definition and Installation

**Priority:** P0

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement composable domain intelligence Definitions and scoped Installations.

## Why it exists

OS is the central AGK differentiation and must not collapse into prompts or mutable live state.

## Hermes capabilities reused

- Hermes Agents, Skills, Tools, MCP, Memory seam, scheduler mechanisms and environments

## Files inspected

- AGK OS canon
- run_agent.py
- `tools/skills_tool.py`
- `tools/mcp_tool.py`
- `cron/scheduler.py`

## Files to create

- `packages/agk-domain/src/os-definition.ts`
- `packages/agk-domain/src/os-installation.ts`
- `packages/agk-domain/src/os-binding.ts`

## Files to modify

- None.

## Schemas

- OSDefinition
- OSInstallation
- OrganizationOSInstallation
- ProjectOSBinding
- OSBinding
- OSDependency
- ConstraintConflict

## Interfaces

- publishOS
- installOS
- bindOS
- resolveDependencies
- compileEffectiveOS

## API impact

OS definition, installation, binding and semantic diff commands.

## Migration impact

Prompt bundles require explicit import and remain drafts until schema and eval gates pass.

## Tests

- definition owns no project state
- incompatible dependency composition refused or escalated under canonical rules
- authority floor
- override event
- version pin

## Acceptance criteria

- Builder OS reference case is representable
- OSDefinition has exactly the canonical sixteen parts
- Organization, Project and OS installation scopes remain distinct
- ProjectOSBinding may tighten and never loosen Organization authority_floor
- Installation can operate at A4 or A5 without mutating Definition
- Oracle remains live owner

## Risks

- God object and physical ownership of every referenced component

## Dependencies

- `002`
- `004`
- `005`
- `007`
- `014`
- `015`
