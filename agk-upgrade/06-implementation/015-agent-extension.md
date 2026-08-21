# 015. Agent Definition and Instance

**Priority:** P0

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement the AGK Agent object above Hermes AIAgent execution.

## Why it exists

Role, authority, version, scope and evaluation must survive process replacement.

## Hermes capabilities reused

- AIAgent execution
- provider and Tool configuration
- Skills and Session mechanics

## Files inspected

- `run_agent.py::AIAgent`
- `agent/system_prompt.py`
- `agent/tool_guardrails.py`

## Files to create

- `packages/agk-domain/src/agent.ts`
- `packages/agk-domain/src/agent-instance.ts`

## Files to modify

- None.

## Schemas

- AgentDefinition
- AgentInstance
- AgentContract

## Interfaces

- publishAgent
- instantiateAgent
- assignTask
- retireAgent

## API impact

Agent definition and instance commands.

## Migration impact

Existing Hermes profiles may be linked as runtime profiles after review, never auto-converted to Agent Definitions.

## Tests

- definition immutable
- instance scope
- permission ceiling
- process restart identity

## Acceptance criteria

- One Agent id can run through a new Hermes process
- Worker is a role only
- Critical result remains unverified until independent gate

## Risks

- Copying mutable Hermes config into immutable definition

## Dependencies

- `002`
- `004`
- `007`
- `014`
