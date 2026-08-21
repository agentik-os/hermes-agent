# 007. Knowledge, Memory and Context Firewall

**Priority:** P0

**Repository target:** AGK intelligence core

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement separate Knowledge and Memory domains plus Context Manifest compilation and firewall.

## Why it exists

Hermes memory, files and prompt context cannot be conflated into organization Knowledge.

## Hermes capabilities reused

- MemoryProvider ABC
- ContextEngine ABC
- prompt assembly and session search

## Files inspected

- `agent/memory_provider.py`
- `agent/memory_manager.py`
- `agent/context_engine.py`
- `agent/system_prompt.py`

## Files to create

- `packages/agk-domain/src/knowledge.ts`
- `packages/agk-domain/src/memory.ts`
- `packages/agk-domain/src/context-manifest.ts`

## Files to modify

- None.

## Schemas

- Knowledge
- Memory
- ContextManifest
- ContextItemDecision

## Interfaces

- writeMemory
- publishKnowledge
- compileContext
- authorizeContextRead

## API impact

Scoped Knowledge and Memory commands plus immutable Context Manifest query.

## Migration impact

Hermes MEMORY.md and USER.md require explicit scoped import; no automatic organization promotion.

## Tests

- Memory not returned as Knowledge
- Self private denied to Build
- provenance retained
- hard revocation terminates active turn

## Acceptance criteria

- Every model input resolves through a Manifest
- Every item records inclusion reason
- Conflicts preserve both claims

## Risks

- Vector retrieval bypassing authority

## Dependencies

- `002`
- `003`
- `004`
- `005`
