# Test Evidence

## Architecture tooling

- `python3 agk-upgrade/tools/validate_architecture.py`: PASS, 22 of 22 checks.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest agk-upgrade/tools/test_validate_architecture.py -v`: PASS, 31 adversarial mutation tests.
- Ruff over `agk-upgrade/tools`: PASS.
- `git diff --check`: PASS.

## Retained Hermes seams

The repository-required test wrapper passed five targeted Python files and 44 tests covering Hermes Projects, Project RPC, public subagent lifecycle, native plugin compatibility and cron Session isolation.

Five targeted desktop UI files and 21 tests passed for the contribution registry, slots, runtime loader, composer contributions and contributed keybind actions.

## Boundary

These tests support audit claims about retained Hermes mechanisms. No AGK product implementation exists and no product implementation test was run.
