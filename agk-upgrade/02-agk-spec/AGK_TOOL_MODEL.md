# AGK Tool Model

## Definition

A Tool is a versioned callable capability with typed input, typed output, risk classification, permission verbs, side-effect semantics and execution provenance.

Connector is the authenticated service binding. MCP is one transport through which a Tool can be exposed.

## Contract

A Tool Definition declares schema, implementation adapter, capabilities, required secrets by reference, network and filesystem effects, idempotency, reversibility or compensation, timeout, observability and compatibility.

A Tool Binding grants a scoped Agent, OS Installation or Flow access under current policy. Tool availability and action authorization remain separate checks.

## Hermes mapping

Reuse `tools/registry.py::ToolRegistry`, `toolsets.py`, `model_tools.py::handle_function_call` and MCP discovery. Map each exposed Hermes tool into an AGK Tool Definition and binding. `check_fn` proves runtime availability and does not replace authorization.

## Governance

Unknown Tools begin constrained with a capability-derived risk floor. Every consequential call requests AGK authorization and emits a ToolCall Span. A denial is an event with a reason the Agent can act on.

## Packaging

A package declares required Tool capabilities and Connector types, not live credentials. Installation displays requested access before activation.
