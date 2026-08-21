# Merge Strategy

## Branch model

- upstream baseline: `origin/main`
- AGK integration branch: `agk/upgrade-architecture` during architecture work
- later feature branches: one dependency-bounded change each
- release integration: explicit branch based on the pinned upstream commit

## Conflict classes

| Class | Default owner | Action |
|---|---|---|
| `agk-upgrade/**` | AGK | Preserve AGK, then validate references against new upstream |
| standalone AGK domain and Hermes adapter packages | AGK | Version outside Hermes and validate against the new upstream contract |
| Hermes core source | upstream | Start from upstream and reapply the smallest recorded patch |
| shared plugin or adapter seam | joint | Resolve against behavior contract and compatibility tests |
| lockfiles | generated | Regenerate using repository commands, never hand-merge |
| desktop translations and design tokens | upstream structure | Reapply AGK additions through registered product configuration |

## Procedure

1. Confirm a clean worktree and record current pins.
2. Fetch `origin` and `fork`.
3. Create a temporary integration branch.
4. Merge the target upstream commit without publishing.
5. Classify every conflict by the table above.
6. Read the intent and tests around each upstream change.
7. Reapply only current AGK requirements.
8. Run Hermes and AGK compatibility suites.
9. Review the full diff for accidental upstream reversion.
10. Update `HERMES_FILES_MODIFIED.md` and the runtime pin.
11. Publish to `fork` only after review.

## Failure

If the update breaks a published AGK adapter contract, hold the old pin, document the incompatibility and implement a versioned compatibility path. Do not silently degrade governance or security to accept upstream.
