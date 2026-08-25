# Agentik OS completion matrix

This matrix records verified state, not intended architecture.

| Requirement | State | Evidence |
|---|---|---|
| Linux identities and isolation | DONE | Four per-user doctors; isolated homes; independent RMUX namespaces |
| Shared Hermes code, isolated state | DONE | Atomic shared release; per-user `~/.hermes` |
| Client → Project → Mission → Task → Run | DONE | Transactional store, lineage restoration and lifecycle tests |
| Actor/surface-bound context | DONE | Invocation binding and Discord actor-isolation tests |
| Canonical Path Resolver | DONE | Bounded work, state, knowledge, artifact, secret and runtime resolution |
| Empty secure OS Registry | DONE | Root-owned registry, zero packages, archive and manifest safety tests |
| OS assignments | DONE | Scoped references with package and manifest enforcement |
| Environment command families | DONE | Operator, Agentik, Mission and Private registries with audit events |
| RMUX/AGK persistent runtime | DONE | Per-user runtime, reconciliation, resume and responsive Control Shell |
| Gateway/API health | DONE | Four gateways and four control APIs healthy |
| Discord channel isolation | DONE | Dedicated allowlists and configured home channels |
| Collective Discord access | DONE | Live API proves guild/channel access; live response observed |
| Discord native command parity | PARTIAL | Desired plugin-priority tree deployed; Discord is rate-limiting overwrite |
| Operator free-text Discord | BLOCKED | Empty payload observed; Message Content Intent requires Developer Portal change |
| Structured Convex projection | PARTIAL | Canonical local event state exists; remote projection is not deployed |
| Desktop/Web control API | DONE | Authenticated runtime list/snapshot and canonical command endpoints |
| Desktop/Web graphical views | PARTIAL | Backend is operational; full graphical object views remain future product UI |
| Actual Operative System content | NOT INSTALLED | Intentionally zero until validated ZIPs are supplied |

`PARTIAL` and `BLOCKED` entries must never be represented as completed by
status screens. Slash commands remain usable when free-text intent is absent.
