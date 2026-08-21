# Upgrade Playbook

## Before

1. Record Hermes and AGK pins.
2. Confirm no production implementation gate is closed for the intended change.
3. Read upstream release notes, security notes and changed extension contracts.
4. Export the current compatibility and parity results.
5. Create a rollback branch or tag on the fork.

## Integrate

1. Fetch the target upstream commit.
2. Merge on an isolated integration branch.
3. Resolve files by `MERGE_STRATEGY.md`.
4. Regenerate lockfiles only with repository-native commands.
5. Update adapter feature detection rather than version-sniffing when possible.

## Verify

- Hermes targeted and full tests according to `AGENTS.md`
- desktop typecheck, lint, UI and Electron tests for desktop changes
- AGK runtime contract tests
- profile and Organization isolation tests
- prompt caching and message alternation tests
- provider and credential isolation tests
- Tool authorization and event correlation tests
- Context Manifest and hard-revocation tests
- checkpoint, crash and recovery tests
- package and migration compatibility tests

## Release

1. Produce semantic diff and known limitations.
2. Update pins and capability registry.
3. Review direct Hermes modifications.
4. Approve migration and rollback.
5. Publish to `fork`, never accidentally to `origin`.
6. Monitor runtime health and keep the previous pin available.
7. Verify the installed updater resolves the AGK signed channel and cannot fall back to Nous `origin`.

## Rollback

Stop new deployments, return the adapter pin and package set to the previous compatible snapshot, reconcile active Sessions and Runs, and record fidelity loss. Never rewrite prior Run history.
