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
Machine -> Environment -> Client? -> Project -> Mission -> Task -> Run -> Session
```

The active context is bound to the actor and surface conversation, not stored
as one mutable global. Discord channels, threads and users therefore cannot
silently change one another's active client or project.

Opening a child restores its complete root-to-child lineage. A project ID can
therefore switch to its owning client atomically, while duplicate project slugs
remain scoped to their parent. `Run` is persisted in context. `/active` reports
machine, surface, Hermes session identity, business lineage and active OS stack.

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

Mission exposes truthful client provisioning without pretending external
resources exist:

```text
/client new <name>
/client open <id-or-slug>
/client provision
/client health
/client runtime set local|vps|cloud|hybrid|external
/client github status|connect
/client vercel status|connect
/client convex status|connect
/client project new <name>
/client mission new <name>
/client task new <name>
```

`provision` evaluates the actual workspace and stored connector references. It
returns `PARTIAL` until every required component is genuinely configured.
Connector commands never accept secrets through chat or Discord; `connect`
routes the user toward the secure connector flow instead.

All mutations create an audit event in `~/.agentik/control.db`. Operator
infrastructure mutations are approval-gated and allowlisted; there is no
arbitrary-sudo command bridge.

## Path resolution

No component may invent a work path. The shared resolver answers from owner,
scope and object type. Hermes internal state remains in `~/.hermes`; real work
remains in `~/workspace`; runtime state remains outside repositories; secrets
are never written into project manifests.

The same resolver covers Hermes state, workspace, knowledge, artifacts,
secrets, runtime, logs, backups, Operator administration and the OS Registry.
Resolution never creates a path and cannot expand the Linux identity's authority.

## Operative Systems

The canonical registry is `/opt/agentik/os-registry`. Installation and
assignment are separate. Packages are versioned and immutable; assignments are
per environment/client/project/session. An OS is not reduced to one Hermes
skill. Until a real, validated package is supplied, the installed count remains
zero and `/os` reports an empty stack.

Once a validated package exists, `/os assign <id@version> [scope]` and `/os
apply <id@version>` create references only. They reject uninstalled packages,
missing context and disallowed manifest scopes. `/os unassign` and `/os unload`
remove matching references. Package installation/update/removal remains a
separate privileged operation.

Incoming archives are inspected without executing scripts. Validation rejects
path traversal, symlinks, duplicate/absent manifests, unsafe compression and
invalid scope/dependency metadata. An OS never gains sudo, secrets or broader
filesystem access from its manifest.
