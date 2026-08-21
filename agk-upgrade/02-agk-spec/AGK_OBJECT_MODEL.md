# AGK Object Model

## Universal object spine

Every first-class AGK object carries a common contract:

| Field | Meaning |
|---|---|
| `id` | Stable identifier, never derived from a name and never reused |
| `type` | Registered canonical type |
| `name`, `slug`, `description` | Human identity |
| `organization_id` | Resolved owning tenant |
| `project_id`, `os_id` | Optional additional scope, never Workspace |
| `owner`, `created_by` | Accountability and actor provenance |
| `created_at`, `updated_at` | Time |
| `version`, `status` | Lifecycle version and state |
| `rev` | Monotonic compare-and-set revision for mutable writes |
| `inputs`, `outputs` | Typed composition contract |
| `permissions` | Object verbs and grants |
| `relationships` | Typed graph edges |
| `memory_scope`, `knowledge_scope` | Information boundaries |
| `evals`, `audits`, `artifacts` | Quality and output references |
| `source`, `provenance`, `history` | Origin and immutable change record |

Every accepted state change emits an event. Every consequential execution produces provenance. Every mutable write uses optimistic concurrency or an explicit lease.

## Registered and non-registered concepts

The canonical AGK-OS type registry at the pinned commit is authoritative. It includes Organization, Project, OS, Installation, Session, Agent, Oracle, Team, Workforce, Mission, Plan, Task, Run, Span, Artifact, Knowledge, Memory, Flow, Loop, Automation, Trigger, Eval, Audit, Verification, Event, Package, Plugin, Runtime, Harness, Adapter and the Learn and Deals domain types.

Several important terms are deliberately not equivalent first-class types:

- Workspace is a UI layout surface.
- Machine is Runtime host metadata.
- Provider and Provider Account are control-plane registry records.
- Graph is execution structure.
- Binding is never one generic object. Use typed Session, OS, Connector and Runtime bindings.

## Identity and scope

Every object resolves to exactly one owning Organization. A query carries that Organization predicate at the data boundary. Cross-Organization reads are denied unless a higher-level authorized exchange contract exists.

Scope and classification are independent:

```text
scope: user | organization | project | os
classification: PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED | SECRET
zone: public_profile | community | learn | professional | build_org | self_private
```

Self-private content defaults to user scope, restrictive classification and no cross-surface access.

## Relationships and projections

Relationships are canonical typed edges. Reverse lineage is indexed asynchronously, but consequential actions revalidate canonical state. Every projection reports its source version, projection time and freshness state.

```text
CHAT IS NOT TRUTH
CANVAS IS NOT TRUTH
THE OBJECT IS TRUTH
```

Chat, Canvas, API, CLI, code and UI operate on the same object through commands and projections.

## Definitions and mutable state

A reusable Definition never owns live project state. Installations or Instances carry bindings and overrides. Production Runs execute immutable deployment snapshots. The object model must make it impossible for a package update to mutate a live deployment without migration, evaluation and approval.

## Events and telemetry

Semantic lifecycle events belong in the durable event ledger. High-frequency intra-Run detail belongs in telemetry as Spans. The Project timeline is a derived view, not a global write sequencer.

## External systems

When an external system owns the authoritative fact, AGK stores a typed reference, projection version and sync state. It does not create an unacknowledged shadow copy.
