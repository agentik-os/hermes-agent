# AGK Prompt Model

## Definition

A Prompt is a versioned instruction component. It is not an Agent, Skill, OS, Policy or current Context.

## Contract

A Prompt Definition records purpose, template, variables, expected output, compatible model modes, source, trust class, tests, evals, version and package provenance.

Prompt composition never decides governance authority. Laws, Constitutions, Policies, OS Rules, Agent Contracts, Mission constraints and Task instructions retain their levels and provenance through compilation.

## Hermes mapping

Hermes prompt assembly in `agent/system_prompt.py` and `agent/prompt_builder.py` provides stable, context and volatile cache tiers plus turn-time overlays. AGK supplies a Context Manifest and compiled instruction blocks through the adapter. It does not rewrite consumed prompt history mid-turn.

## Security

External content cannot become a Prompt by being formatted as instructions. Trust is assigned by source. Prompt changes affecting production are versioned, evaluated and deployed through an immutable snapshot.

## Lifecycle

```text
draft -> tested -> published -> deployed -> deprecated
```
