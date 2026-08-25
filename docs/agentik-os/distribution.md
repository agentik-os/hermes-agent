# AGK distribution contract

`agentik-os/hermes-agent` is the complete AGK product repository. Hermes remains
the agent runtime inside that product; RMUX is its persistent interactive
execution substrate, and `agk` is the human control surface.

This repository does not import OmegaOS code or its internal architecture. The
AGK interface independently uses interaction principles validated by the
OmegaOS audit: session-first navigation, explicit control and terminal modes,
responsive master/detail layouts, stable selection, fast keyboard chords,
natural scrollback, and detach-without-kill semantics.

## Installation topologies

### Personal installation

One Linux identity can operate any one logical environment:

```bash
./scripts/agk-install --user --environment agentik
~/.local/bin/agk doctor
~/.local/bin/agk
```

Valid environments are `operator`, `agentik`, `mission`, and `private`. This
mode needs no sudo. Its state lives under the current user's home:

```text
~/.hermes                 Hermes brain/session state
~/.agentik/runtime.db     canonical AGK runtime metadata
~/.local/share/agk        user AGK assets and empty OS registry
RMUX user namespace       persistent processes and scrollback
```

### Fleet installation

A dedicated server may use four Linux users as hard trust boundaries:

```bash
sudo ./scripts/agk-install --fleet
```

This only installs the control surface. Provisioning Linux users, SSH policy,
firewall, gateways and credentials remains an explicit operator workflow. The
installer refuses to invent missing accounts or accept secrets on the command
line. Every user receives independent Hermes, Agentik and RMUX state.

## Product layers

```text
AGK Control Shell / future Desktop and Web surfaces
  -> canonical context and runtime registry
  -> Hermes sessions and orchestration
  -> RMUX sessions/panes for durable interactive work
  -> Claude Code, Codex, shells and workers
```

A Hermes session is conversation state. An RMUX session is process state. AGK
links them with metadata but never treats them as the same object.

## TUI interaction contract

The default view resumes work, not infrastructure metrics. Navigation groups
daily work (`Session`, `Projects`, `Agents`), capabilities (`OS`, `MCP`,
`Skills`), then support (`System`, `Settings`, `Help`).

- `Tab` changes focus; a rapid `Tab Tab` expands or restores a pane.
- `Enter` attaches to a runtime; `Ctrl-b d` detaches without killing it.
- `q` exits Control Mode without touching persistent work.
- `n`, then `h/c/x/t`, creates Hermes, Claude, Codex or shell work.
- `/` filters; `Ctrl-p` opens the quick switcher/command palette.
- `PageUp`, `PageDown`, `g`, `G` and the mouse control RMUX scrollback preview.
- `R` restarts a frontend while preserving its native session identity.
- Destructive actions use uppercase keys and explicit confirmation.

Compact terminals render one pane. Wide terminals render a master/detail view
with live runtime output. Restoring AGK returns to Control Mode first and never
traps the user in an arbitrary attached terminal.

## Secrets and Discord

The distribution contains schemas and setup flows, never credentials. Discord
bot tokens, provider keys and client secrets must be supplied after install to
the appropriate isolated environment. A bot maps to an environment/trust
boundary, not to every sub-agent or project.

## Operative Systems

The installer creates only an empty registry. It does not invent or install an
Operative System. Signed/versioned packages later pass through inspection,
validation, registration, assignment and explicit activation.
