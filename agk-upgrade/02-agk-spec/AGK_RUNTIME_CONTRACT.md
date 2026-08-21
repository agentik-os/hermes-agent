# AGK Runtime Contract

## Purpose

`AgentRuntime` isolates AGK domain semantics from one agent-loop implementation. Hermes implements the first adapter. The contract is capability-negotiated and versioned.

## Operations

```python
class AgentRuntime:
    async def capabilities(self, request): ...
    async def create_agent(self, spec, bindings): ...
    async def start_session(self, session, context_manifest): ...
    async def run_agent(self, run_request): ...
    async def interrupt_run(self, run_id, reason): ...
    async def stop_agent(self, agent_instance_id, reason): ...
    async def spawn_agent_call(self, parent_run_id, request): ...
    async def execute_tool(self, run_id, tool_call, authorization_envelope): ...
    async def install_skill(self, runtime_profile_id, skill_binding, authorization_envelope): ...
    async def schedule_trigger(self, automation_binding, authorization_envelope): ...
    async def checkpoint(self, session_id): ...
    async def resume(self, session_id, checkpoint_ref): ...
    async def stream_events(self, cursor): ...
    async def acknowledge_events(self, cursor): ...
    async def query_effect(self, idempotency_key): ...
    async def reconcile_run(self, request): ...
```

This is an architectural interface. Method names may be refined before implementation, but the semantic responsibilities may not be collapsed.

## Runtime descriptor

A runtime declares:

- adapter id and version
- protocol version
- supported operations
- provider and model modes
- execution backends
- tool and skill capabilities
- checkpointable and portable as separate flags
- streaming and event guarantees
- sandbox and network posture
- maximum supported limits
- health and compatibility state
- transport authentication, framing and replay limits

AGK never assumes a capability not declared by the negotiated descriptor.

## Run request

A Run request references canonical objects rather than embedding mutable copies:

- Agent Definition version and Agent Instance
- Mission, Plan and Task identity
- Session and SessionBinding
- Harness Definition version
- Runtime target
- Context Manifest hash and references
- Tool, Skill, OS and knowledge bindings
- policy and permission decision references
- Budget reservation
- idempotency key
- expected artifact contract
- Definition of Done and Verification requirements

Run-level decision references do not authorize later model-generated arguments. Every consequential operation receives a transport `AuthorizationEnvelope` bound to actor, exact action and argument hash, object, Run, policy revision, expiry, environment epoch, nonce and fencing token. It references the canonical Approval or ApprovalGrant when one is required and never creates a parallel grant ontology. The effect broker re-evaluates the full allow decision at use time.

## Event contract

The adapter emits normalized events for lifecycle changes, model calls, tool calls, AgentCalls, runtime commands, artifact creation, checkpoints, denials, approvals, failures and recovery. Every event includes actor, object, run, session, causality, schema version, effective classification, provenance, guest event id and monotonically increasing sequence.

Hermes-native hooks and callbacks are adapter inputs. They are not the canonical AGK event schema.

The sandbox-internal host journals unacknowledged Runtime events. The external supervisor stamps canonical correlation, persists them, acknowledges sequence ranges and requests replay after reconnect. Retention exhaustion emits an explicit gap event and can never be represented as a complete stream.

The contract includes main and auxiliary model calls. Compression, vision, title generation, extraction, model ensembles and provider-native runtimes cannot bypass Budget, route and usage accounting merely because they do not traverse the standard conversation hook.

## Governance

Before a consequential action:

```text
ALLOWED = runtime capability
          intersected with Permission
          intersected with Risk
          intersected with Policy
          intersected with Environment
          intersected with Approval
```

The adapter requests a decision and supplies enforcement evidence. It never mints its own authority. Ordinary Hermes hooks and middleware may observe or narrow execution but are not the sole authorization boundary because their exception behavior is not fail-closed. The sandbox-external effect broker physically mediates model egress, Tool effects, secrets, files, network and process control.

Provider-native application runtimes are capability-disabled when their internal Tool loop cannot pass the same authorization contract as normal Hermes Tools.

## Context and prompt caching

The Context Firewall compiles a Context Manifest before a turn. Changes bind at the next turn boundary to preserve Hermes prompt caching. A hard revocation terminates the turn and starts a new authorized execution. The adapter never rewrites already consumed prompt bytes and then claims reproducibility.

## Host and guest boundary

A Hermes runtime profile is not a tenant boundary. Every governed Agent instance receives a dedicated profile inside a whole-process sandbox. There is no local fallback when the required boundary is unavailable. Immutable code, policy and configuration are separated from writable Runtime state. Reusable provider credentials remain outside the guest and model inference traverses the same budgeted external broker for main, auxiliary, plugin, subagent and fallback calls.

The external supervisor and sandbox-internal host use authenticated length-delimited Protobuf with capability handshake, deadlines, cancellation, reconnect and fencing. Hermes TUI newline JSON-RPC is not this security boundary.

## Recovery

A process crash does not end the Mission or change object identity. Recovery selects a compatible Runtime, restores canonical AGK state and available checkpoint state, creates a new Run where execution must retry, links it to its parent and records any fidelity loss. Cross-provider resume restores AGK state, not model cognition.

Run state remains canonical: queued, running, succeeded, failed, cancelled or timed_out. Lease and EffectReceipt carry their own operational states, including unknown and reconciling, without creating a parallel execution object. The supervisor supports lease acquire, renew and release, fencing epochs, forced-termination acknowledgment, atomic checkpoint cut, effect query by idempotency key and explicit compensate, adopt or abandon commands.

## Error classes

The contract distinguishes:

- incapable runtime
- unauthorized action
- approval required
- incompatible version
- transient provider failure
- non-retryable request failure
- lost or stale lease
- checkpoint unavailable
- portability unsupported
- policy or context revocation
- partial side effect requiring reconciliation

A boolean `retryable` is insufficient. Recovery disposition names who may retry and under what precondition.
