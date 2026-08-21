# AGK Agent Model

## Definition

An Agent is the canonical persistent or ephemeral machine actor that performs work. `Worker` is a role an Agent may hold, never a primitive or synonym. An Agent does not acquire Oracle ownership merely because it delegates.

## Definition and instance

```text
Agent Definition -> Agent Instance -> Session -> Run -> Span
```

The Definition includes:

- identity template and role
- versioned instructions
- model and routing policy
- Tool and Skill requirements
- Knowledge and Memory policy
- communication and delegation rules
- permissions and risk ceiling
- Harness and Runtime requirements
- expected inputs, outputs and Artifacts
- evaluation and review policy

The Instance adds Project scope, OS and Team bindings, live permissions, current tasks, Runtime profile, Budget allocation and operational state.

## Modes

```text
persistent | ephemeral
```

`Worker` is a role, not another primitive. A subagent is an Agent whose parent Run spawned its AgentCall.

## Hermes mapping

`run_agent.py::AIAgent` provides a strong execution implementation but not the complete AGK Agent object. `HermesRuntimeAdapter` translates one AGK Agent Instance into a dedicated Hermes profile, resolved model policy, Tool set, Skill set, Context Manifest and Session binding.

The mapping must preserve:

- one AGK Agent id across Hermes process restarts
- one dedicated runtime profile per active Agent instance
- AGK authorization before tool actions
- token and cost attribution, including AgentCalls
- normalized events and Artifact provenance
- no fallback to ungoverned local Memory

## Communication

Agents receive typed messages as data. Sender identity is stamped by the platform and cannot be claimed inside a body. Communication rights, context cost, scope and retention are enforced. Delegation retains accountability; handoff transfers responsibility through a new context and capability lease.

## Lifecycle

```text
draft -> versioned -> published -> instantiated -> idle | working | waiting
                                   -> blocked | failed -> retired
```

Retirement preserves validated learning and bounded history, not unlimited private scratch state.

## Autonomy

An Agent cannot raise its own permissions, Budget, autonomy or risk ceiling. Standing authority is time-bounded through an `AutonomyLease` and re-evaluated against current policy.

## Quality

An Agent result is a claim until verified. Producer-side tests are not independent Verification. Critical output cannot rely on its producer as the only validation mechanism.
