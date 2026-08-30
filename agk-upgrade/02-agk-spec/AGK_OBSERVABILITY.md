# AGK Observability

## Purpose

AGK observability explains what happened, why, under which versions and at what cost without making high-volume telemetry the operational source of truth.

## Hierarchy

```text
Mission -> Task -> Run -> Span
Span = ModelCall | ToolCall | AgentCall | RuntimeCommand
```

Every Run references Agent, OS, Harness, Runtime, Context Manifest, policy decisions, Budget and deployment versions. Spans carry timings, status, input and output references, cost and causal links subject to retention and classification.

## Destinations

- semantic lifecycle events go to the durable event ledger
- high-volume Span detail goes to telemetry
- current operational state stays directly queryable
- logs remain diagnostic streams
- Artifacts and Evidence retain their own records

## Hermes mapping

Hermes logging, callbacks, plugin hooks, monitoring and trajectories provide runtime signals. The adapter normalizes them into AGK Run and Span events and reports loss where Hermes cannot provide a field. Raw Hermes traces never become canonical AGK objects by copying them wholesale.

## Views

Build exposes organization health, active work, cost and failures. Inspect permits expansion from Project to Oracle, OS, Agent, Run, model call, Tool call, Context and Artifact. Every abstraction resolves to the same execution evidence.
