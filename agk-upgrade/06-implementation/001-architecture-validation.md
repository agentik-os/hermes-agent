# 001. Architecture Validation Harness

**Priority:** P0

**Repository target:** this fork, agk-upgrade tooling

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Validate required architecture artifacts, source references, registries, canonical vocabulary, dependency acyclicity and the no-implementation gate.

## Why it exists

The architecture set is too large to review reliably through presence checks alone.

## Hermes capabilities reused

- Hermes repository Python toolchain
- AGK-OS validation doctrine

## Files inspected

- AGENTS.md
- `agk-upgrade/ARCHITECTURE_MANIFEST.yaml`
- `AGK-OS .agk/autodev validation outputs`

## Files to create

- `agk-upgrade/tools/validate_architecture.py`
- `agk-upgrade/validation/VALIDATION_RESULTS.json`
- `agk-upgrade/validation/VALIDATION_RESULTS.md`

## Files to modify

- `agk-upgrade/ARCHITECTURE_MANIFEST.yaml`

## Schemas

- validation check result
- source reference record
- dependency edge

## Interfaces

- CLI exit 0 on PASS, non-zero on material failure

## API impact

None. Analysis tooling only.

## Migration impact

None.

## Tests

- mutation tests for missing file, bad source ref, dead vocabulary, cycle and production-code change

## Acceptance criteria

- Every named deliverable is present
- Every local source reference resolves
- YAML and JSON parse
- No disallowed product implementation path exists
- Failures are reproducible and fail closed

## Risks

- A shape-only validator can create false confidence

## Dependencies

- None
