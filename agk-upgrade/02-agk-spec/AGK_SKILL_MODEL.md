# AGK Skill Model

## Definition

A Skill is a reusable, versioned procedure with a trigger, method, expected inputs and outputs, rubric, failure modes and verification steps. It is not a Tool, Prompt or OS.

## Definition and binding

A global Skill Definition remains reusable. An OS Skill Binding carries the doctrine, constraints, allowed Tools, Knowledge, model policy and quality requirements that make the procedure effective inside one OS Installation.

## Hermes mapping

Hermes Skills are a strong native foundation through SKILL.md, `tools/skills_tool.py`, `agent/skill_commands.py`, the Skills Hub and curator. Reuse the format and loader where compatible. Add AGK object identity, binding metadata, package provenance, maturity, eval references and permissions outside the upstream Skill body when needed.

## Lifecycle

```text
draft -> tested -> published -> installed -> deprecated
candidate -> evaluated -> approved -> new version
```

A Skill proposed by an Agent or Lab cannot install or promote itself. Usage count alone is not quality evidence.

## Packaging

Skills can ship independently or inside OS and Workforce Packages. Dependencies, required capabilities and permissions are explicit. A package never embeds secret values.
