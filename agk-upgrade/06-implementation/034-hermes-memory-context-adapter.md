# 034. Hermes Memory and Context Firewall Adapter

**Priority:** P0

**Repository target:** AGK intelligence core and Hermes guest adapter

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Bind Hermes MemoryProvider and ContextEngine behavior to a mandatory, signed AGK Context Manifest without fail-open fallback.

## Why it exists

Hermes Memory and Context failures normally log and continue, and recalled Memory can be labeled authoritative. Governed AGK calls must distinguish Memory from Knowledge and refuse a model call when mandatory retrieval or authorization fails.

## Hermes capabilities reused

- MemoryProvider and ContextEngine interfaces
- prompt assembly and cache-preserving turn boundary
- session search as historical evidence only

## Files inspected

- `agent/memory_provider.py`
- `agent/memory_manager.py`
- `agent/context_engine.py`
- `agent/conversation_loop.py`

## Files to create

- standalone `agk_hermes_runtime/memory_provider.py`
- standalone `agk_hermes_runtime/context_engine.py`
- standalone `agk_hermes_runtime/context_manifest_verifier.py`

## Files to modify

- A strict generic failure-mode seam only if the outer broker cannot prevent a call after adapter failure

## Schemas

- ContextManifestBinding
- ContextManifestSignature
- MemoryWriteReceipt
- ContextFailureDisposition

## Interfaces

- prefetchAuthorizedMemory
- compileSignedManifest
- verifyManifest
- acknowledgeMemoryWrite
- revokeContext

## API impact

No governed model call occurs without a verified Manifest.

## Migration impact

Built-in MEMORY.md and USER.md are disabled for governed workers unless explicitly imported as scoped Memory.

## Tests

- provider missing, timeout or invalid result blocks mandatory call
- built-in/local fallback disabled
- Memory is never labeled Knowledge or approved truth
- synchronous canonical write acknowledgment
- hard revocation terminates current turn
- prompt cache prefix remains stable until turn boundary

## Acceptance criteria

- Every model input pins one verified Context Manifest
- Mandatory retrieval and authorization fail closed
- Memory, Knowledge, Context and Artifact remain distinct
- No background write is represented as durable before acknowledgment

## Risks

- hidden auxiliary call bypass
- broad automatic transcript ingestion
- ContextEngine fail-open behavior

## Dependencies

- `007`
- `008`
- `010`
- `032`
- `033`
