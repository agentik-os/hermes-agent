# Deals Alignment

## Role

Deals coordinates commercial Opportunity, qualification, matching, Engagement, Proposal, Deal, Contract, delivery, referral attribution, Commission references and reviews. It is not a generic CRM and does not belong inside Hermes Runtime.

## Canonical objects

`Opportunity` is the commercial type. `ProductOpportunity` is Build product discovery. They never collapse.

## Build bridge

```text
Opportunity -> Deal -> Engagement -> Contract -> Project
-> Workforce and OS Installations -> Artifacts and approvals
-> completion -> review -> PortfolioItem
```

Proposal is an Artifact. The bridge passes ids and policy and does not duplicate Organization, counterparty or Project records.

## Hermes reuse

Hermes may execute matching analysis, proposal Agents, delivery Agents and notifications through governed runtime adapters. Deal, referral, contract and financial state remain control-plane objects.

## Financial boundary

Referral attribution is independent from payout. Payment custody, regulated flows and complex commissions are deferred until legal and infrastructure decisions exist.

## Surface

Deals navigation prioritizes relevant Opportunities, actions, Engagement and Deal state, introductions, delivery and economic references. The Build Runtime drawer is not displayed unless the user opens the linked Project.
