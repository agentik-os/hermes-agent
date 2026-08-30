# Hermes Technical Debt Relevant to AGK

## Large central modules

Static line counts at the pinned baseline include approximately:

- `gateway/run.py`: 30,999 lines
- `cli.py`: 21,445 lines
- `hermes_cli/web_server.py`: 19,222 lines
- `tui_gateway/server.py`: 15,630 lines
- `hermes_state.py`: 13,114 lines
- `run_agent.py`: 9,181 lines
- `tools/mcp_tool.py`: 8,235 lines
- `agent/context_compressor.py`: 8,027 lines
- `hermes_cli/plugins.py`: 6,594 lines

The repository explicitly accepts focused extraction refactors. AGK should not expand these files with product-domain branches.

## Multiple extension systems

General native plugins, provider registries, gateway adapters, desktop plugins, dashboard plugins, TUI widgets, MCP and portable Agent Plugins have different contracts. A unified AGK package must adapt them rather than claim one shared runtime API.

## Multiple stores

SessionDB, projects.db, kanban databases, cron JSON and plugin state are appropriate for Hermes but dangerous as parallel AGK authorities.

## Security debt boundary

In-process plugins, Skills and hook handlers have process privilege. Whole-process isolation is required for adversarial content and multi-tenant AGK workloads.

## Runtime durability

Subagent lifecycle is not reconnectable after process restart. Checkpoint and cross-runtime recovery are not a complete public contract.

## Product and code naming

Hermes Project, Goal, Loop, Task and workspace names conflict with AGK semantics. Compatibility code must stop these names from crossing the adapter boundary.

## Upstream risk

The checkout is shallow at the pinned baseline. Source behavior is fully present, but intent investigation for future direct patches may require fetching relevant history before modifying load-bearing code.

Stock update treats `origin` as authoritative. Governed AGK guest bundles must contain no self-update authority and must be replaced only by an attested, signed Runtime deployment.

Provider declarations are spread across Provider profiles, auth registry, runtime overlays, models.dev and special-case resolution. Runtime ids and catalog entries must not be counted as one support fact.
