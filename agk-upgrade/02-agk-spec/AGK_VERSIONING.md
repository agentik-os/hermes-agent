# AGK Versioning

## Principles

Lifecycle version and mutable revision are distinct. `version` identifies an immutable published Definition or deployment snapshot. `rev` is the compare-and-set token for mutable state.

## Versioned subjects

Agent, Skill, Tool, Prompt, OS, Workforce, Flow, Loop, Harness, Adapter, Policy, Eval, schema and package Definitions are versioned where their behavior or compatibility matters.

## Deployment

Production runs an immutable Deployment Snapshot that pins every effective Definition, policy, Context Manifest, adapter and compatibility version. Updating a Definition never mutates a running Instance.

## Provenance

Installed packages record source, publisher, version, checksum, installed time, modifications and fork origin. Forks preserve ancestry and support semantic diff and rebase.

## Git use

Git remains authoritative for source code and repository-native declarations. AGK does not invent a second code version system. Domain object versions and Installation state use the control-plane version model because they are not all source files.

## Hermes baseline

`HermesRuntimeAdapter` pins an exact upstream commit or release and declares the supported contract. Upgrade is a reviewed change with compatibility tests, behavior parity, security review and rollback.

## Compatibility

Every package, plugin, adapter and runtime declares compatibility. Unknown combinations fail clearly rather than resolving to latest.
