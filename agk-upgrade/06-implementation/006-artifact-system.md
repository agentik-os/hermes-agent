# 006. Artifact and Provenance Foundation

**Priority:** P0

**Repository target:** packages/agk-artifacts and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement first-class Artifact metadata, content references, versioning and provenance.

## Why it exists

Hermes files and attachments do not provide Project-scoped lifecycle or evidence.

## Hermes capabilities reused

- Hermes file tools and attachment transport behind adapters

## Files inspected

- `tools/file_tools.py`
- `tui_gateway/methods_prompt.py`
- `apps/desktop/src/store/artifacts.ts`

## Files to create

- `packages/agk-artifacts/src/artifact.ts`
- `packages/agk-artifacts/src/content-store.ts`
- `packages/agk-artifacts/src/provenance.ts`

## Files to modify

- None.

## Schemas

- Artifact
- ArtifactVersion
- ContentReference
- ProvenanceManifest

## Interfaces

- createArtifact
- newArtifactVersion
- attachEvidence
- resolveContent

## API impact

Artifact command, query and signed export contracts.

## Migration impact

Existing files are linked or imported only through explicit user intent.

## Tests

- checksum verification
- permissioned content resolution
- version immutability
- provenance chain

## Acceptance criteria

- Every generated Artifact links to Run and Actor
- Large bytes stay outside operational state
- Export preserves origin identity

## Risks

- Scanning arbitrary workspace files into canonical state

## Dependencies

- `002`
- `005`
