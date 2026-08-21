# AGK Control Plane

## Responsibilities

The AGK control plane owns:

- identity semantics and provider-neutral authentication bindings
- Organizations, memberships and capability-based permissions
- Projects and the canonical object graph
- Definition, Installation, Instance and Deployment records
- policy, risk, approval and autonomy leases
- event registry and durable semantic ledger
- canonical Session records and Runtime bindings
- package metadata, snapshots, grants and provenance
- deployment intent and reconciliation state
- search, inbox, notifications and deep links
- product modules for Learn, Build, Deals and Self

It coordinates execution and never pretends to own physical process state or external truth.

## Non-responsibilities

The control plane does not carry:

- terminal or browser byte streams
- secret values
- source repository contents
- large Artifact bytes
- high-volume Span payloads
- provider-internal cognition
- external service truth

It stores references and bounded projections for these.

## Commands and queries

Every mutation is a typed semantic command with:

- actor and authority
- Organization and object scope
- expected `rev`
- policy and risk context
- idempotency key
- declared external effects
- resulting events

Queries are Organization-scoped at the backend. Summary views consume bounded projections. Detail views resolve canonical objects.

## Deployment orchestration

The control plane compiles deployment intent into:

- immutable Definition version pins
- Runtime capability requirements
- Harness configuration
- connector and secret references
- tool and skill bindings
- Context policy
- Budget reservations
- evaluation and Verification gates

The Runtime reports actual state. Reconciliation compares desired and actual state and produces recovered, needs-inspection, lost or conflicted outcomes.

## Surface modules

One shell loads bounded modules:

- Learn owns learning and community domain views.
- Build owns Projects, organization design, execution and inspection.
- Deals owns opportunities, engagements, referrals and delivery bridges.
- Self owns private personal intelligence views.

Shared contracts handle identity, objects, events, artifacts, packages, search, notifications and entitlements. Product modules do not read one another's private tables directly.

## Hermes relationship

Hermes sits below the runtime contract. The control plane may request execution through `HermesRuntimeAdapter`; it never imports `AIAgent`, Hermes SessionDB, kanban rows or cron job records into its domain layer. Any synchronization is explicit, versioned and attributable.

## Availability model

A Project survives loss of a Runtime. A Mission survives loss of a Session. A Task survives loss of an Agent process. An OS survives loss of a model or provider. This continuity is a control-plane responsibility backed by Runtime checkpoints and durable object state.
