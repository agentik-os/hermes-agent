# 036. Hermes Generic Security Remediation

**Priority:** P0

**Repository target:** Hermes generic core fixes, proposed upstream where applicable

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Fix or capability-disable audited Hermes defects that adapter-only files cannot safely mediate.

## Why it exists

Governed AGK cannot enable a capability while known source behavior expands authority, lacks owner checks, leaks secrets or writes remote state back to the host.

## Hermes capabilities reused

- existing Tool registry, process registry, MCP client and environment backends after remediation

## Files inspected

- `tools/code_execution_tool.py`
- `tools/process_registry.py`
- `tools/mcp_tool.py`
- `tools/environments/file_sync.py`
- A2A outbound URL handling

## Files to create

- focused behavior and negative tests in existing Hermes test suites

## Files to modify

- `tools/code_execution_tool.py`
- `tools/process_registry.py`
- `tools/mcp_tool.py`
- `tools/environments/file_sync.py`
- exact A2A egress-policy source identified by the implementation spike

Every implemented change must be recorded in `04-upstream-strategy/HERMES_FILES_MODIFIED.md` with upstream conflict risk.

## Schemas

- no new AGK domain type
- process owner principal binding
- per-MCP secret grant configuration
- file sync direction policy

## Interfaces

- preserve explicit empty nested Tool intersection
- authorizeProcessControl
- resolveMcpSecretGrant
- syncUploadOnly
- authorizeA2aTarget

## API impact

Generic fail-closed behavior and additive configuration only.

## Migration impact

Unsafe legacy behavior remains available only in explicit trusted mode where upstream compatibility requires it. Governed mode defaults to remediated behavior.

## Tests

- empty nested Tool set remains empty
- process id without owner principal denies
- each MCP receives only its declared secrets
- remote support files cannot overwrite host Skills or prompts
- A2A blocks private, metadata and unapproved egress and never forwards bearer to arbitrary targets

## Acceptance criteria

- Every known defect has a behavior test and fix or the capability is disabled
- No prompt-only mitigation
- Generic change is suitable for upstream review
- HERMES_FILES_MODIFIED register is exact

## Risks

- breaking trusted personal routines
- partial enforcement across sibling paths
- downstream-only patch drift

## Dependencies

- `001`
- `004`
- `010`
- `032`
- `033`
