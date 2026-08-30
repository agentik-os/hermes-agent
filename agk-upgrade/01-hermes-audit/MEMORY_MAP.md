# Hermes Memory Map

## Built-in and provider model

Hermes wires two separate systems. `tools/memory_tool.py::MemoryStore` owns bounded built-in MEMORY.md and USER.md entries and is created directly by Agent initialization. `agent/memory_provider.py::MemoryProvider` defines the external-provider contract, and `agent/memory_manager.py::MemoryManager` is created only when one external provider is configured. It bridges that provider's prompt block, prefetch, turn sync and Tool calls. It does not register or orchestrate the built-in MemoryStore. Provider implementations live under `plugins/memory` and external entry points.

Local state includes MEMORY.md and USER.md snapshots. Session search uses SQLite FTS5 rather than Memory files. Context Engines are separate from Memory providers.

## Lifecycle

Memory snapshots enter the volatile prompt tier at Session construction or rebuild. Writes update storage and do not mutate an already frozen prompt. Providers may prefetch, synchronize turns and shut down.

## Strengths

- clean provider ABC
- profile-aware paths
- personal and user-profile distinction
- external provider lifecycle
- Tool integration
- prompt-cache-aware snapshots

## Gaps

- no Organization or Project object scope
- no governed Memory object lifecycle
- no first-class Knowledge model
- no Context Firewall or immutable Context Manifest
- one external provider at a time
- in-process providers have full process privilege

## AGK decision

ADAPT the provider seam. Governed Hermes instances must use the AGK Memory provider and fail closed rather than silently writing a private parallel store. Imports from local memory require explicit scope and classification.

## Provider namespace warning

Hermes does not impose generic tenant namespaces on Memory providers. Several providers use a shared remote container or bank unless profile or identity templates are configured. The AGK Memory adapter must declare and test Organization, Project, Agent and Self namespace behavior per provider. Built-in USER.md and MEMORY.md are profile-wide and all gateway users on one profile share them.
