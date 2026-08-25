# AGK Control Shell V2 — UX contract

## Reference boundary

OmegaOS was inspected only as a UX reference. AGK does not import its source,
runtime architecture, domain model, prompts, skills, or Operative Systems. The
temporary audit clone is not an installation. AGK keeps its own control plane:
Agentik state, Hermes orchestration, and per-user RMUX runtime.

## Interaction model

AGK opens in Control Mode and restores the last view, filter, and stable
selection. It never auto-attaches to a terminal. Enter explicitly enters
Terminal Mode; `Ctrl-b d` detaches without stopping work; `q` exits only AGK.

- `Tab`: focus list or live detail on wide terminals.
- Rapid `Tab Tab` (420 ms): expand or restore the focused panel.
- `Shift-Tab`: reverse navigation when a split focus is unavailable.
- `1..6`, `s`, `,`, `?`: direct navigation without traversing menus.
- `PageUp/PageDown`, `g/G`: scroll history and return to live follow.
- Mouse wheel/trackpad: move the list or the panel under the pointer; clicking
  establishes focus. Native selection/copy remains owned by RMUX in Terminal Mode.
- `/`: structured filtering; `Ctrl-p`: quick switcher and command palette.

The focus chord is reset by view changes and Escape. Destructive actions remain
uppercase and confirmed. Session attachment never creates a duplicate runtime.

## Responsive contract

| Density | Threshold | Presentation |
|---|---:|---|
| Compact | width < 72 or height < 18 | single list, abbreviated navigation |
| Standard | width < 120 or height < 28 | detailed list, no competing preview |
| Wide | otherwise | stable list plus RMUX live-output panel |

The wide preview reads RMUX scrollback; AGK does not create a second terminal
buffer. At the tail it follows live output. Any upward scroll pauses follow and
shows distance from live; `G` resumes it. Resizing recomputes layout without
changing the selected runtime.

## Information hierarchy

Daily work: Sessions, Projects, Agents. Capabilities: OS, MCP, Skills.
Administration: System, Settings, Help. Every screen retains the environment
breadcrumb, while session screens add client, project, and runtime identity.

There are currently zero installed Operative Systems. The OS screen reports
that fact and never manufactures packages from the OmegaOS reference repository.
