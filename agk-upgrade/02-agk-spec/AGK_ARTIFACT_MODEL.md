# AGK Artifact Model

## Definition

An Artifact is a managed work product produced or imported through AGK. Examples include documents, reports, code changes, designs, datasets, research packs, proposals, decisions and evaluations.

## Metadata

Every Artifact records:

- stable id and type
- owning Organization and Project
- creator Actor
- source Session, Mission, Task and Run
- OS, Agent and tool versions involved
- inputs and dependency edges
- content reference and checksum
- version, status and classification
- review and Verification state
- timestamps and provenance

Large bytes live in object storage or the authoritative external system. The object holds a content reference, metadata and synchronization state.

## Lifecycle

```text
draft -> produced -> under_review -> accepted | rejected
      -> published | archived | superseded
```

An Artifact can later become a Resource without losing provenance. Evidence may reference an Artifact but remains a distinct proof object.

## Hermes mapping

Hermes file tools, attachments and desktop Artifact projections are useful mechanics. They do not provide the complete AGK Artifact lifecycle. The adapter converts declared Hermes outputs into AGK Artifact commands and never scans arbitrary files into the graph without intent.

## Cross-surface use

The same infrastructure supports Learn assignments, Build specifications, Deals proposals and Self reviews. Type, scope and permission keep the meanings distinct.
