# 010. Hermes Profile and Whole-Process Sandbox Lifecycle

**Priority:** P0

**Repository target:** AGK Runtime plus Hermes adapter

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Create one profile per Agent instance and enforce whole-process filesystem, network and secret policy.

## Why it exists

HERMES_HOME isolation is useful but is not a tenant security boundary.

## Hermes capabilities reused

- get_hermes_home profile isolation
- terminal environment backends
- Hermes Docker and secret sources

## Files inspected

- SECURITY.md
- hermes_constants.py
- `tools/environments`
- `hermes_cli/profiles.py`

## Files to create

- standalone `agk_hermes_runtime/profile.py`
- `packages/agk-runtime/src/process-supervisor.ts`

## Files to modify

- None.

## Schemas

- RuntimeSandboxPolicy
- HermesProfileBinding
- WorkloadGrant
- ImmutableGuestSpec
- SandboxAttestation

## Interfaces

- provisionProfile
- spawnSandboxed
- terminate
- destroyProfile
- attestSandbox

## API impact

Runtime-internal.

## Migration impact

Existing user profiles are never silently rebound to AGK Agent instances.

## Tests

- cross-profile file denial
- secret absent from profile
- network policy
- process-tree kill
- cleanup after crash
- remote support-file sync is upload-only by default
- each MCP server receives only its explicit secret grant
- isolated Agent profiles cannot read global-root auth fallback
- required sandbox unavailable fails closed with no local fallback
- immutable policy and code are separated from writable Runtime state
- Docker or Podman hardened profile is behavior-tested as the first local backend
- SSH and Local environments are classified as connectors or trusted-operator execution, never containment

## Acceptance criteria

- One active Agent instance never shares HERMES_HOME
- Every governed workload is whole-process isolated
- Secret values do not land on disk
- Remote sandboxes cannot persist Skill or prompt changes directly onto the host
- A2A outbound targets pass URL safety and egress policy
- Backends whose effective network, mount or resource limits cannot be attested are refused

## Risks

- Assuming terminal backend contains plugins or MCP
- Treating profile isolation as tenancy
- Broad external-secret passthrough to MCP subprocesses
- standard named-profile global credential fallback

## Dependencies

- `003`
- `004`
- `008`
