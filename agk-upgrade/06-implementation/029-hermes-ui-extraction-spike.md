# 029. Hermes UI Behavior Extraction Spike

**Priority:** P1

**Repository target:** analysis in this fork, implementation in canonical AGK Web and shared packages

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Determine exactly which Hermes Desktop behaviors, transports and neutral UI primitives can be reused by AGK Web and Tauri without importing Electron product identity or internal state authority.

## Why it exists

Hermes Desktop is a strong runtime shell, but AGK canon locks Web as reference UI and Tauri as desktop wrapper. Reuse must be evidence-based extraction rather than product substitution.

## Hermes capabilities reused

- `apps/shared` JSON-RPC and WebSocket client behavior
- session and profile routing semantics
- terminal, file, git, review and preview behavior contracts
- contribution and layout ideas
- existing UI and transport tests

## Files inspected

- `apps/desktop/AGENTS.md`
- `apps/desktop/DESIGN.md`
- `apps/desktop/src/contrib`
- `apps/desktop/src/sdk/index.ts`
- `apps/shared`
- `tui_gateway`

## Files to create

- `agk-upgrade/04-upstream-strategy/HERMES_UI_EXTRACTION_MATRIX.md`
- future neutral transport or adapter packages only after spike approval

## Files to modify

- None during the spike

## Schemas

- ReuseCandidate
- BehaviorContract
- SourceAttribution
- ExtractionDecision

## Interfaces

- classifyCandidate
- proveBehaviorParity
- recordExtraction

## API impact

None during the spike. Approved candidates inform canonical AGK packages.

## Migration impact

Hermes Desktop remains usable as a Runtime console. AGK users move to the canonical shell only after behavior parity and deep-link migration are proven.

## Tests

- transport parity against real gateway
- session identity and profile routing
- terminal, files, git and review behavior
- license and attribution check
- no Electron or Hermes product strings in extracted contract

## Acceptance criteria

- Every candidate is REUSE, ADAPT, REFERENCE_ONLY or REJECT
- No AGK product state depends on Hermes renderer stores
- No second Chat or Runtime implementation is created
- Direct source extraction has explicit attribution and update policy

## Risks

- accidental fork of large renderer modules
- upstream drift
- visual reuse mistaken for semantic compatibility

## Dependencies

- `008`
- `022`
- `027`
