# Shared Platform Alignment

## Shared services

- identity and Organizations
- memberships and permissions
- object registry and relationship graph
- events and semantic ledger
- search and references
- inbox and notifications
- Artifacts and files
- Knowledge, Memory and Context policy
- packages, provenance and entitlements
- integrations and Connector bindings
- billing identity and usage attribution

## Intelligence core

Agents, OS, Oracles, Teams, Workforces, Skills, Tools, MCP, Flows, Loops, Runtime, evals and Architect are shared capabilities. Product modules consume them through contracts.

## Dependency direction

```text
shared platform <- intelligence core <- product modules
```

A product module may use shared intelligence. Agent, OS or Runtime core never imports Course, CommunityPost, Deal or JournalEntry.

## Cross-surface interaction

Use typed commands and events:

- certification earned updates a CapabilityClaim
- contracted Engagement creates or binds a Project after Contract
- Project completion may propose a governed PortfolioItem
- Self review may propose a priority change

Every crossing names source, target, purpose, policy and provenance.

## Hermes placement

Hermes belongs under AgentRuntime. Learn, Community, Deals, billing and Self metadata do not know Hermes module names or stores.

## Shell

One header preserves Organization and canonical surface switcher. Each surface owns its navigation, workspace layout, inspector capabilities and status chrome. Search, inbox and profile remain shared.
