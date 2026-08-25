# Agentik package pipelines

## Operative Systems

Incoming: `/home/operator/deposit/os/incoming/`

Lifecycle: received → inspected → validated → ready → installed → registered →
available → assigned → active. Installation and assignment are independent.
The immutable installed source is `/opt/agentik/os-registry/<id>/<version>/`.
No setup script is automatically executed and no existing version is overwritten.

## Reference handoffs

Incoming: `/home/operator/deposit/grokbot/incoming/`

Lifecycle: received → hash/CRC/path inspection → temporary read-only analysis →
report in `analyzed/` → archive. Reference material is never installed in the OS
registry and never becomes runtime code by virtue of being a ZIP.

Effective OS permission is always the intersection of the package request,
Linux identity, environment, client/project scope and tool policy.
