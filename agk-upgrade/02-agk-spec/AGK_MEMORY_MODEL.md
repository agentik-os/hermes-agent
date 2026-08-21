# AGK Memory Model

## Definition

Memory is experience retained by the system. It is not Knowledge, current Context, an Artifact, a file or a transcript.

## Classes

- Working Memory: transient state for one execution, never continuity truth
- Session Memory: bounded continuity within a Session lineage
- Agent Memory: experience scoped to an Agent instance or role
- OS Installation Memory: domain experience scoped to one installation
- Project Memory: organizational experience and history
- User or Self Memory: private personal experience

Every Memory item carries owner, scope, source, classification, retention, provenance, maturity and contradiction state.

## Write path

A model may propose a Memory write. Policy decides whether the item is durable, its scope and retention. A write cannot silently widen from Session or Agent scope to Project, Organization or Self.

## Contradictions

Conflicting memories coexist with provenance until a governed resolution creates a preferred interpretation. Last writer never silently wins.

## Hermes mapping

Hermes provides `agent/memory_provider.py::MemoryProvider`, `agent/memory_manager.py::MemoryManager`, local `MEMORY.md` and `USER.md`, provider plugins and memory tools. AGK adapts the provider seam and replaces flat personal files as canonical organization storage. A governed Hermes process refuses to start if the required AGK Memory adapter is unavailable.

## Privacy

Self Memory is private by default. Cross-surface retrieval requires a named policy decision, purpose, fields and expiry. Build, Deals, Learn and community contexts cannot infer consent from shared identity.

## Lifecycle

```text
proposed -> accepted -> active -> superseded | forgotten | retained_on_hold
```

Forgetting is a governed action and leaves an event without retaining the forgotten body where policy requires deletion.
