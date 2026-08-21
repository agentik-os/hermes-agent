# Hermes Subagents Map

## Delegate Tool

`tools/delegate_tool.py` supports single and parallel child execution, leaf and orchestrator roles, isolated context, narrowed Tool exposure, background completion and cost rollup. It uses separate Sessions and restores parent Tool resolution state after completion.

## Public lifecycle API

`agent/subagent_lifecycle.py` exposes `SubagentLifecycleService`, `SubagentLaunchRequest`, `SubagentHandle` and stable states. It supports launch, status, wait, cancel, result and reconnect validation. Handles are opaque capabilities and forged handles fail closed.

## Durability

Running children are Python threads or process-local workers. Metadata and terminal results are retained in-process for one hour. Process restart cannot reconnect to an active child and never starts a replacement. Durable long-horizon coordination belongs to cron or kanban.

## Isolation

Children can narrow Toolsets and inherit unsafe-tool blocks. The public lifecycle API rejects parent-broadening Toolsets, arbitrary workdir overrides and per-launch behavior that would weaken isolation.

## AGK mapping

REUSE bounded leaf execution to spawn an ephemeral child Agent. The invocation is recorded as an AgentCall Span; the Span never replaces the child Agent identity. Do not equate a subagent batch with a Team or Workforce. Parent and child costs, permissions, Context and outputs must be correlated to canonical AGK Runs. Durable organizational work needs AGK Task state, not process-local handles.

## Durability detail

Background delegation persists dispatch and terminal completion records, but the child remains process-local. A dead owner becomes `unknown`; execution is never resumed. Public lifecycle handles and their signing secret are also process-local.

Kanban is Hermes's strongest durable coordination primitive, with SQLite tasks, dependencies, claims, review and process workers. It still lacks AGK tenancy and object permissions. On the audited macOS host its derived global worker cap can be absent unless configured. Adoption therefore remains deferred and explicitly bounded.
