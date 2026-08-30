# 021. Package, Snapshot and Compatibility Foundation

**Priority:** P0

**Repository target:** AGK package core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement manifests, immutable installed snapshots, compatibility, provenance and grants.

## Why it exists

Marketplace readiness requires more than Hermes plugin or Skill packaging.

## Hermes capabilities reused

- Hermes native plugins, Agent Plugins subset, plugin packs and Skills Hub

## Files inspected

- `hermes_cli/plugins.py`
- `hermes_cli/agent_plugins.py`
- `hermes_cli/plugin_packs.py`
- `tools/skills_hub.py`

## Files to create

- `packages/agk-domain/src/package.ts`
- `packages/agk-domain/src/package-snapshot.ts`
- `packages/agk-domain/src/license-grant.ts`

## Files to modify

- None.

## Schemas

- PackageManifest
- PackageSnapshot
- LicenseGrant
- CapabilityRequirement
- PackageSignature
- TrustRoot
- PublisherIdentity

## Interfaces

- inspectPackage
- installSnapshot
- resolveCompatibility
- revokeGrant

## API impact

Package registry and installation commands.

## Migration impact

Import Hermes package formats through typed adapters with explicit unsupported fields.

## Tests

- snapshot immutable
- grant separate from possession
- capability disclosure
- dependency conflict
- unsigned or untrusted Runtime package refused before load
- user or project plugin cannot shadow an approved package identity

## Acceptance criteria

- A Workforce or OS package excludes live state
- Install screen lists requested access
- signed immutable PackageSnapshot and trust root precede governed plugin load

## Risks

- Flat plugin trust and dependency auto-install

## Dependencies

- `002`
- `004`
- `006`
