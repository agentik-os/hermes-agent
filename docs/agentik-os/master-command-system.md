# Agentik OS Master Command System

Hermes is the agent runtime. Agentik OS provides canonical business context,
filesystem resolution and commands above it.

## Environments

| Environment | Responsibility | Business root |
| --- | --- | --- |
| Operator | Machine, security, gateways, releases, backups | none |
| Agentik | Own organization, products and projects | `~/workspace/projects` |
| Mission | Clients and external delivery | `~/workspace/clients/<client>` |
| Private | Personal projects and knowledge | `~/workspace/projects` |

Linux identity is an authority boundary. Context selection cannot grant access
outside the current identity.

## Canonical hierarchy

```text
Environment -> Client? -> Project -> Mission -> Task -> Run
```

The active context is bound to the actor and surface conversation, not stored
as one mutable global. Discord channels, threads and users therefore cannot
silently change one another's active client or project.

Core Agentik commands are `/home`, `/active`, `/os`, `/client`, `/project`,
`/mission`, `/task`, and `/run`. Hermes keeps its native `/help`, `/status`,
`/context`, `/sessions`, `/history`, `/approvals`, `/skills`, and `/mcp`
capabilities. The plugin extends rather than replaces them.

Environment commands:

- Operator: `/machine`, `/system`, `/service`, `/gateway`, `/docker`,
  `/security`, `/tailscale`, `/backup`, `/hermes`.
- Agentik: `/org`, `/portfolio`, `/product`, `/build`, `/release`, `/content`,
  `/growth`, `/community`, `/research`.
- Mission: `/client`, `/deliverable`, `/deploy`, `/report`, plus the canonical
  project/mission/task/run hierarchy.
- Private: `/journal`, `/decision`, `/routine`, `/idea`, `/review`, plus the
  canonical project/mission/task/run hierarchy.

All mutations create an audit event in `~/.agentik/control.db`. Operator
infrastructure mutations are approval-gated and allowlisted; there is no
arbitrary-sudo command bridge.

## Path resolution

No component may invent a work path. The shared resolver answers from owner,
scope and object type. Hermes internal state remains in `~/.hermes`; real work
remains in `~/workspace`; runtime state remains outside repositories; secrets
are never written into project manifests.

## Operative Systems

The canonical registry is `/opt/agentik/os-registry`. Installation and
assignment are separate. Packages are versioned and immutable; assignments are
per environment/client/project/session. An OS is not reduced to one Hermes
skill. Until a real, validated package is supplied, the installed count remains
zero and `/os` reports an empty stack.

Incoming archives are inspected without executing scripts. Validation rejects
path traversal, symlinks, duplicate/absent manifests, unsafe compression and
invalid scope/dependency metadata. An OS never gains sudo, secrets or broader
filesystem access from its manifest.
