# AGK Flow Model

## Definition

A Flow is a reusable authored process. It defines how work can happen. A Mission is a specific outcome being pursued now.

## Contract

A Flow Definition includes typed inputs and outputs, Spans or activity templates, decision points, retries, compensation, timeouts, policies, required capabilities, expected Artifacts, evals and version compatibility.

A Flow Deployment binds an immutable version to environment, Runtime capabilities, Connector bindings, policy and an optional SLA.

## Execution

A Mission may invoke a Flow and produces a current Task Graph. Runtime events update Run and Task projections. The Flow Definition never stores live execution state.

## Reliability

External actions declare idempotency, reversibility or compensation. Retry behavior distinguishes transient failure, moved lease, policy denial, approval wait and irreversible partial effect.

## Hermes mapping

Hermes goals, loops, cron and kanban offer execution mechanics but no canonical AGK Flow Definition. They may implement bounded runtime behaviors behind the orchestration adapter. AGK owns Flow identity, deployment and events.
