# 026. Bounded Learn with Community, Deals and Self Foundations

**Priority:** P2

**Repository target:** AGK product modules

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement only the smallest Learn, including Community, Deals and Self object and command bridges after shared platform foundations.

## Why it exists

The ecosystem must compound without becoming four coupled applications.

## Hermes capabilities reused

- HermesRuntimeAdapter for Tutor, Lab and bounded product-support Agent execution
- gateway transports where a product Connector needs them

AGK identity, objects, events, Artifacts, evals, Packages and permissions are dependencies, not Hermes capabilities.

## Files inspected

- AGK AD-001
- operator refined vision
- tasks 002 through 025

## Files to create

- `apps/agk-web product modules or equivalent validated target`
- `packages/agk-domain/src/product-bridges.ts`

## Files to modify

- None.

## Schemas

- Course and learning graph subset
- Community Space subset
- Opportunity, Deal, Engagement, Contract and Project references
- Proposal Artifact and PortfolioItem bridge
- Self private object subset
- CrossSurfaceGrant

## Interfaces

- openInBuild
- createProjectFromContractedEngagement
- publishPortfolioItem
- authorizeCrossSurfaceUse

## API impact

Explicit commands and events, no direct cross-module table reads.

## Migration impact

No legacy product data assumed.

## Tests

- Self denied by default
- Learn asset opens same object in Build
- Opportunity to Deal to Engagement to Contract to Project preserves every canonical object
- Proposal is an Artifact
- community requires consent to create Opportunity

## Acceptance criteria

- Full ecosystem reference path is representable with minimal objects
- Each bridge preserves provenance and permissions

## Risks

- Prematurely implementing broad product surfaces
- privacy leakage

## Dependencies

- `003`
- `004`
- `005`
- `006`
- `007`
- `014`
- `020`
- `021`
- `025`
