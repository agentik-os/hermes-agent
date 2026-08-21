# Extension Plan

## Runtime adapter

Create a versioned `HermesRuntimeAdapter` that translates AGK Agent, Session, Harness, Tool, Skill, Context and Run contracts into Hermes profile and session behavior. It reports capability negotiation, health, normalized events and loss.

## Governance adapters

- pre-action authorization middleware
- model-route and Budget decision adapter
- Context Manifest and Memory provider adapter
- event and Span normalizer
- secret and egress binding

All main and auxiliary model usage must be accounted at an AGK-controlled route or gateway. A plugin hook is not assumed to intercept every provider-native runtime. Governed mode disables Runtime modes whose Tool operations cannot traverse the authorization boundary.

Hooks are used where they provide complete mediation. Missing mediation must be proven before a core patch is proposed.

## Domain layer

Create AGK-owned schemas and services for Organization, Project, Oracle, OS, OS Installation, Team, Workforce, Knowledge, Artifact, permissions, events, packages and evals. Domain code does not import Hermes internals.

## Product clients

Implement the reference shell in AGK Web and reuse it through Tauri. Use Hermes Desktop as a runtime console, behavior reference and optional transition prototype. Add:

- canonical surface switcher
- surface module registry and layout selection
- entity-scoped conversations
- universal Context Inspector
- recursive Canvas
- Design, Live and Inspect overlays
- AGK object routes and deep links

Extract only neutral, tested transport or interaction behavior from Hermes. Do not add AGK product branches to Hermes Electron merely because its plugin SDK cannot express the canonical shell.

## Shared platform

Identity, Organization, permissions, events, notifications, search, artifacts and packages serve all surfaces. Learn, Build, Deals and Self depend on shared contracts and never on one another's internal storage.

## Deferred extensions

Alternative runtimes, full marketplace, advanced Labs, regulated payments and full community realtime media remain deferred until a concrete phase requires them.
