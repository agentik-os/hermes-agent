# AGK Security

## Threat model

Agent execution is adversarial by default. Content trust is assigned by source, not by how authoritative text sounds.

## Boundary

Hermes states that the operating system is the only containment boundary against an adversarial model. AGK therefore separates:

- governance decisions in the control plane
- process containment in the Runtime sandbox
- model, Tool, filesystem, network, process and secret effects in a sandbox-external broker
- hooks and approval patterns as useful in-process observation and defense in depth, never sole enforcement

## Required boundaries

- tenant and Organization isolation
- Project and object authorization
- whole-process sandbox levels
- filesystem and repository scope
- network and egress policy
- secret broker and short-lived workload identity
- Tool, MCP, Plugin and Script capability manifests
- untrusted content and Context Firewall
- package provenance and signature
- audit trail and incident response

## Runtime posture

One Hermes profile per Agent instance isolates configuration and local state but does not provide multi-tenant security. Every governed workload runs in a whole-process boundary with declared mounts, egress and immutable guest configuration, with no local fallback when the boundary is unavailable. Reusable provider and Connector credentials stay outside the guest. Terminal-backend isolation alone does not contain plugins, MCP or code execution.

## Product zones

Self is private by default. Build Organizations, Learn, community and Deals have independent policies. Cross-surface data transfer is a user-authorized command with purpose, fields and expiry.

## Failure posture

Unknown capability starts constrained. Stale permission projections fail closed. A partial external effect enters reconciliation. Security denials are visible events and never silent no-ops.
