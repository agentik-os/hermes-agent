# Hermes Skills Map

## Native model

Hermes loads procedural Skills from SKILL.md directories. Main source paths are `tools/skills_tool.py`, `agent/skill_commands.py`, `hermes_cli/skills_hub.py` and `hermes_cli/skills_config.py`.

A Skill can carry platform gates, environment setup metadata, Tool requirements, references, scripts and templates. Bundled and optional Skills have separate activation posture. Skills Hub supports installation. The curator in `agent/curator.py` and usage state in `tools/skill_usage.py` maintain agent-created Skills without deleting them automatically.

## Prompt behavior

The Skills index belongs to the stable prompt tier. A Skill command injects Skill content as a user message to preserve prompt caching. Mid-session activation follows cache-aware rules.

## Distribution

Skills can ship bundled, optional, through taps or inside native and portable plugin packages. Hermes validates frontmatter and platform compatibility.

## Limitations for AGK

- no universal AGK object id
- no OS Skill Binding carrying doctrine and constraints
- usage does not prove quality
- no direct package snapshot or LicenseGrant semantics
- personal profile storage is not Organization scope

## Decision

REUSE the format, loader, discovery and runtime execution. Add AGK Definition identity, package provenance, eval references and scoped bindings outside or through additive metadata. A Skill candidate may be proposed by a Lab and cannot promote itself.
