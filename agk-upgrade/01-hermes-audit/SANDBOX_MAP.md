# Hermes Sandbox Map

## Security posture

`SECURITY.md` states that OS-level isolation is the only containment boundary against an adversarial model.

## Terminal-backend isolation

`tools/environments/base.py::BaseEnvironment` and its implementations route commands and file Tools to Local, Docker, SSH, Singularity, Modal, Managed Modal, Daytona or Vercel Sandbox. Local and SSH are execution connectors, not containment. Backend command isolation does not contain the host Python process, plugins, MCP subprocesses or code execution.

## Whole-process isolation

Hermes supports its Docker image and documents NVIDIA OpenShell for wrapping the entire process tree. This posture can constrain filesystem, network, process and credential access.

## Profile isolation

`get_hermes_home()` and profile overrides separate config, secrets files, Memory, Sessions, Skills and gateway state. Profiles are not a tenant or adversarial security boundary.

## Credential controls

Hermes filters environment variables passed to lower-trust subprocesses and supports secret source plugins and egress controls. In-process code can still access process credentials.

## AGK requirement

Every governed Agent instance receives a dedicated Hermes profile and an attested whole-process sandbox with no local fallback. A sandbox-external effect broker mediates egress and secrets. Tool authorization hooks remain defense in depth. The Runtime reports effective mounts, network, secret, process and resource policy as evidence.

## Remote persistence and secret hazards

`tools/environments/file_sync.py` can reconcile Skills and support files back from a remote sandbox with remote-wins behavior. Governed hosted sandboxes default to upload-only and return changes as reviewable Artifacts.

The stdio MCP safe environment can pass external-secret-source variables broadly rather than through one per-server grant. AGK compiles explicit MCP secret grants and refuses ambient passthrough.
