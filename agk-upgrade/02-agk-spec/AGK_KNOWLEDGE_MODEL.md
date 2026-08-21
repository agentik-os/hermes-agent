# AGK Knowledge Model

## Definition

Knowledge is reusable truth or doctrine with explicit scope, type, maturity and provenance. It is not raw Memory, a file dump or current Context.

## Required fields

- stable object identity
- owning Organization and optional Project or OS scope
- `knowledge_type`: FACT, GUIDANCE, RULE, PROCEDURE or REFERENCE
- source namespace and citations
- maturity and review status
- effective and expiry times where relevant
- classification and access policy
- contradiction and supersession links
- version and provenance

## Resolution

A local Project fact can override a general OS preference about the world. A fact cannot repeal an enforceable rule. Law level, scope, type, specificity and maturity participate in resolution.

## Context use

Knowledge enters model Context only through the Context Firewall and a recorded Context Manifest. The Manifest records source, scope, authority, freshness and inclusion reason. Search retrieval is evidence, not automatic authority.

## Hermes mapping

Hermes has files, context files, skills, memory providers and context engines but no first-class governed Knowledge object graph. AGK creates the Knowledge domain and uses Hermes retrieval and prompt seams through adapters.

## Lifecycle

```text
draft -> reviewed -> validated -> production -> contested | superseded | retired
```

Critical Knowledge tracks claim-level evidence and cannot be promoted from a model suggestion without independent review.
