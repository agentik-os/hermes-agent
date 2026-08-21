# 027. Hermes Runtime Baseline Pin and Update Guard

**Priority:** P0

**Repository target:** AGK Runtime packaging and deployment control, outside Hermes product identity

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Pin, verify and deploy one signed Hermes Runtime bundle so a governed guest can never self-update or drift from the reviewed baseline.

## Why it exists

AGK canon bounds Hermes to AgentRuntime and does not make the Hermes Electron product or stock updater the AGK distribution. The audited updater trusts Git remotes and can reset a checkout. Governed execution instead needs an immutable, signed baseline plus explicit adapter and plugin versions.

## Hermes capabilities reused

- upstream Hermes release artifacts and install metadata as inputs
- profile migrations executed only during a reviewed bundle transition
- no stock in-guest update authority

## Files inspected

- `hermes_cli/update_cmd.py`
- `scripts/install.sh`
- `scripts/install.ps1`
- `scripts/release.py`
- AGK bounded Hermes decision and locked client stack

## Files to create

- `packages/agk-runtime/hermes.lock.json`
- signed Hermes guest image or immutable virtual-environment manifest
- runtime-bundle provenance and rollback tests

## Files to modify

- No AGK product code is added to Hermes
- A generic upstream-safe fix may be proposed separately if Hermes update trust is defective for Hermes users

## Schemas

- HermesRuntimeBaseline
- RuntimeBundleManifest
- SignedReleaseManifest
- AdapterCompatibilityRange
- RuntimeRollbackRecord

## Interfaces

- verifyRuntimeBundle
- stageRuntimeBundle
- activateRuntimeBundle
- rollbackRuntimeBundle
- attestRuntimeBaseline

## API impact

Runtime capability negotiation reports the exact Hermes commit, adapter version, plugin hashes and guest bundle digest.

## Migration impact

A bundle transition runs an explicit, backed-up profile migration outside active execution. Existing personal Hermes installs are not converted into governed guests.

## Tests

- unsigned or wrong-digest bundle refused
- guest cannot invoke stock update
- exact Hermes commit, plugin and adapter hashes attested
- rollback restores prior immutable bundle and profile snapshot
- upstream baseline and AGK adapter versions remain distinct

## Acceptance criteria

- Hermes stays a bounded upstream Runtime, not the AGK product distribution
- Every governed guest launches from a signed immutable bundle
- No floating Git remote or dependency range decides production bytes
- Runtime update is a control-plane deployment with rollback

## Risks

- supply-chain compromise
- profile migration incompatibility
- downstream patch drift if generic remediations are not upstreamed

## Dependencies

- `001`
- `008`
- `010`
