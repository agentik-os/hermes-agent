# 012. Tool, Skill and MCP Mapping

**Priority:** P0

**Repository target:** Hermes adapter plus AGK registries

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Map native Hermes capabilities to AGK Tool and Skill Definitions and scoped bindings.

## Why it exists

Reuse requires identity, risk and permission metadata without duplicating implementations.

## Hermes capabilities reused

- ToolRegistry
- toolsets
- Skill loader
- MCP discovery and OAuth

## Files inspected

- `tools/registry.py`
- toolsets.py
- `tools/skills_tool.py`
- `tools/mcp_tool.py`

## Files to create

- standalone `agk_hermes_runtime/tools.py`
- standalone `agk_hermes_runtime/skills.py`
- standalone `agk_hermes_runtime/mcp.py`

## Files to modify

- None.

## Schemas

- RuntimeToolBinding
- RuntimeSkillBinding
- MCPConnectorBinding

## Interfaces

- inventoryCapabilities
- bindTools
- bindSkills
- bindMcp

## API impact

Adapter inventory and binding endpoints.

## Migration impact

Stable mapping keys preserve identity across upstream tool discovery changes.

## Tests

- unbound tool absent
- availability separate from authorization
- MCP redirect credential isolation
- Skill version provenance
- explicit empty nested-Tool set leaves `execute_code` with no RPC Tools
- background process controls reject a foreign owner principal
- Tool availability cache never overrides an AGK revocation

## Acceptance criteria

- No Tool call bypasses authorization
- Every capability maps to a canonical id or explicit unsupported record
- A2A Tools remain disabled until target allowlisting and bearer origin policy pass
- code execution, process control, MCP secrets and remote sync capabilities remain disabled until task 036 passes

## Risks

- Dynamic tools and plugins change after session start, breaking cache
- `execute_code` is arbitrary same-user Python and not a sandbox
- process ids alone are not authorization capabilities

## Dependencies

- `004`
- `005`
- `008`
- `010`
- `032`
- `033`
- `036`
