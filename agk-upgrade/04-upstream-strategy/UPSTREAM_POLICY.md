# Upstream Policy

## Remotes

- `origin`: `https://github.com/NousResearch/hermes-agent.git`, authoritative upstream fetch source
- `fork`: `https://github.com/agentik-os/hermes-agent.git`, AGK publication destination

## Principles

1. Pin the Hermes baseline used by every AGK release.
2. Keep AGK domain code outside Hermes core modules.
3. Use documented extension surfaces before direct patches.
4. Keep prompt caching, role alternation, profile safety and toolset footprint invariants.
5. Rebase or merge upstream only through a reviewed compatibility run.
6. Never resolve conflicts by accepting all AGK or all upstream changes blindly.
7. Preserve upstream contributor authorship.

## Update flow

```text
fetch origin
-> review upstream release and security notes
-> create integration branch
-> merge or rebase baseline
-> resolve with file ownership policy
-> run Hermes behavior suite
-> run AGK adapter contract suite
-> run architecture and security checks
-> produce semantic compatibility report
-> approve and update pin
```

## Ownership

AGK owns `agk-upgrade` in this audit branch and owns domain modules, the standalone Hermes adapter and signed Runtime bundle manifests in AGK repositories or packages. Hermes owns its agent loop, providers, tools, Skills, MCP, gateways, session runtime, UI core and extension contracts unless a direct generic-patch record explicitly says otherwise.

## Release posture

An upstream update is not a normal dependency refresh. It is a runtime adapter version change with migration, rollback and behavior evidence.

Governed Hermes guests contain no stock self-update authority. The audited updater treats `origin` as authoritative, while this audit checkout uses `origin` for Nous and `fork` for Agentik OS. AGK Runtime replaces an immutable guest only after verifying the signed bundle, upstream baseline, adapter and any generic remediation revision without trusting a remote name.
