# 020. Eval, Audit and Verification Foundation

**Priority:** P1

**Repository target:** AGK quality core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement first-class Eval subjects, datasets, baselines, calibrated judges and independent Verification.

## Why it exists

Hermes mechanisms are useful but do not form AGK quality authority.

## Hermes capabilities reused

- Hermes evals, goal judge, verify and batch runner

## Files inspected

- evals
- `agent/goal_judge.py`
- `hermes_cli/verify.py`
- batch_runner.py

## Files to create

- `packages/agk-domain/src/eval.ts`
- `packages/agk-domain/src/verification.ts`

## Files to modify

- None.

## Schemas

- EvalDefinition
- EvalRun
- VerificationDecision
- Baseline

## Interfaces

- runEval
- compareBaseline
- verify
- recordDissent

## API impact

Quality commands and Evidence queries.

## Migration impact

Existing test output becomes Evidence only when imported with provenance.

## Tests

- producer not sole verifier
- judge calibration gate
- baseline immutable
- dissent retained

## Acceptance criteria

- Agent, OS, Workforce and Artifact targets work
- Verification is distinct from test execution

## Risks

- Model judge false precision

## Dependencies

- `005`
- `006`
- `031`
