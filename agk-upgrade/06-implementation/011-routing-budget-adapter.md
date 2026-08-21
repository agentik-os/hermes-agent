# 011. Model Routing and Budget Adapter

**Priority:** P0

**Repository target:** Hermes adapter plus AGK routing service

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Execute AGK ModelRoute and ProviderAccount policy through an external budgeted model broker while reusing Hermes provider wire behavior where safe.

## Why it exists

Hermes routing is strong, but AGK owns account identity, policy and Budget.

## Hermes capabilities reused

- runtime_provider.py
- provider plugins
- provider and reasoning adapters as compatibility evidence
- credential-pool and fallback behavior only outside governed guest authority

## Files inspected

- `hermes_cli/runtime_provider.py`
- `hermes_cli/auth.py`
- `agent/auxiliary_client.py`

## Files to create

- standalone `agk_hermes_runtime/routing.py`
- standalone `agk_hermes_runtime/usage.py`
- `packages/agk-runtime/src/model-broker.ts`

## Files to modify

- None.

## Schemas

- ModelRouteDecision
- ProviderAccountBinding
- UsageRecord

## Interfaces

- resolveRoute
- bookUsage
- activateAllowedFallback

## API impact

Internal adapter to AGK route and Budget services.

## Migration impact

Provider credentials remain vault references resolved by the external broker. The Hermes guest receives no reusable vendor credential and cannot choose an unapproved fallback.

## Tests

- wrong-host credential isolation
- fallback obeys policy
- subagent cost attribution
- Budget ceiling
- provider profile, auth registry, runtime overlay and models.dev drift is reconciled
- fallback candidate capabilities and privacy are revalidated
- primary reasoning policy is restored exactly after fallback
- live account rotation follows the ratified Session rule rather than Hermes default behavior
- main, auxiliary, plugin, subagent, model-ensemble, title and compression calls traverse the same broker
- blocked or unaccounted egress fails closed

## Acceptance criteria

- Every model call references a route decision
- Fallback never violates policy
- All tokens are attributed
- Admission reserves Budget before the provider call and books final usage after it
- Catalog presence is never represented as first-class runtime support without a working route

## Risks

- Hermes subagents do not inherit fallback by default
- Hermes has no semantic task capability router; AGK must not mislabel explicit routing as automatic routing
- the audited primary runtime snapshot can omit reasoning configuration before a fallback

## Dependencies

- `004`
- `005`
- `008`
- `010`
- `032`
- `033`
