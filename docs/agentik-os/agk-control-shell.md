# AGK Control Shell

`agk` is the human control surface for persistent Agentik OS work. RMUX is the
per-user execution substrate; it is deliberately not the business database and
not a Hermes conversation.

## Layers

```text
Agentik object       Project / Mission / Task / Run
Hermes session       AI conversation and memory lineage
AGK runtime record   Links context, actor and runtime
RMUX session         Persistent terminal, PTY, process and scrollback
```

The four Linux identities have independent RMUX sockets and runtime databases:

```text
operator  -> /home/operator/.agentik/runtime.db
agentik   -> /home/agentik/.agentik/runtime.db
mission   -> /home/mission/.agentik/runtime.db
private   -> /home/private/.agentik/runtime.db
```

Never point one identity at another identity's socket or runtime database.

## Daily workflow

```bash
ssh mission@agk-core
agk
```

`agk` always opens Control Mode first. Select a runtime and press Enter to
attach. In Terminal Mode, `Ctrl-b d` detaches without stopping work. Closing SSH
does not stop the RMUX daemon, its pane or the running agent.

Control Mode shortcuts:

| Key | Action |
| --- | --- |
| `1`..`6` | Sessions, Projects, Agents, OS, MCP, Skills |
| `s` | System |
| `j`/`k`, arrows | Move |
| `Enter` | Attach/open |
| `h`, `c`, `x`, `t` | New Hermes, Claude, Codex, shell |
| `n` | New-session selector |
| `/` | Filter (`type:`, `env:`, `client:`, `project:`, `status:`) |
| `Ctrl-p` | Quick switcher/command palette |
| `R` | Restart frontend, preserving native session metadata |
| `f` | Fork runtime and preserve `parent_session_id` |
| `A` | Archive metadata/history |
| `K` | Stop runtime after explicit confirmation |
| `q` | Exit Control Mode only |

## Non-interactive commands

```bash
agk status
agk doctor
agk sessions
agk projects
agk agents
agk os
agk reconcile

agk new hermes mission-moonbase-growth \
  --cwd /home/mission/workspace/clients/moonbase/projects/growth \
  --client moonbase --project growth
agk resume mission-moonbase-growth
agk info mission-moonbase-growth
agk rename OLD NEW
agk restart NAME
agk fork NAME NEW-NAME
agk archive NAME
agk kill NAME
```

Use `--native-session` when a known Hermes, Claude or Codex session ID must be
resumed. AGK maps to the documented native commands and never invents an ID.

## Status and reconciliation

Canonical runtime states are `running`, `working`, `idle`, `waiting`,
`attention`, `failed`, `complete`, `interrupted`, and `archived`. Reconciliation
combines registered metadata with RMUX pane existence, pane death and last
activity. A registered runtime missing from RMUX becomes `interrupted`; an
unregistered RMUX session is reported as `UNMANAGED` and is never silently
adopted or killed.

## Recovery

```bash
rmux -V
rmux diagnose --human
agk doctor
agk reconcile
rmux list-sessions
```

If `agk` is broken, raw RMUX remains available. Do not disable SSH recovery or
force interactive shells to exit merely because they are outside RMUX.

Gateway, API, Docker and Convex daemons remain under systemd/Docker. They do not
belong inside RMUX. Web Share is not enabled by Agentik OS.
