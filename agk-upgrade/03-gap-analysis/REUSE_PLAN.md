# Reuse Plan

## Reuse mechanics directly

- provider wire profiles and runtime resolution behind the external model broker
- credential-pool and fallback behavior as compatibility evidence, not guest authority
- Tool registry and toolsets
- Skill format, loader and hub behavior
- MCP client, catalog and OAuth after per-server secret and effect mediation
- agent loop and transport adapters
- bounded leaf subagent execution
- execution environment backends after whole-process attestation and unsafe sync paths are disabled or remediated
- gateway transport adapters
- SessionDB as Hermes runtime persistence
- Hermes Desktop contribution behavior as extraction evidence, plus the shared gateway client where compatible
- TUI, web and ACP runtime surfaces where product requirements need them

## Reuse behind adapters

- Session and lineage
- Memory providers
- cron and session loop mechanisms
- gateway messaging
- runtime events, hooks and trajectories
- Hermes Project records as private adapter data, with explicit folder import into canonical RepositoryBinding
- portable plugin packages
- desktop layout state

## Disable or hide in governed AGK mode unless mapped

- ungoverned local Memory fallback
- direct gateway entry points outside AGK identity and authorization
- recursive orchestrator delegation not accounted by AGK
- independent Hermes cron jobs
- kanban as canonical Project or Task state
- raw product labels and Hermes Project terminology in AGK UX

## Verification

Each reused capability receives a behavior contract and an integration test against the pinned Hermes baseline. The test proves the real discovery, config, Session and transport path rather than source text shape.

Reuse of mechanics never means that the complete AGK capability is classified REUSE, and never means adopting Hermes storage as canonical AGK state.
