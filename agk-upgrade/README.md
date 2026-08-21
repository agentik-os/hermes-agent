# AGK Upgrade

This directory is the repository SSOT for the architecture and implementation delta that turns Hermes into the execution foundation beneath AGK.

## Source precedence

1. Ratified AGK canon and decisions in `agentik-os/AGK-OS` at the commit recorded in `00-input/SOURCE_MANIFEST.json`.
2. Actual Hermes source behavior at the recorded upstream commit.
3. Ratified decisions in `DECISIONS.md`.
4. Derived audits, mappings, specifications, roadmaps and implementation tasks in this directory.
5. The verbatim operator prompt in `00-input/OPERATOR_PROMPT.md` as vision input.

The prompt is a capture. It is not silently rewritten. Where it uses superseded vocabulary or contradicts the AGK canon, reconciliation documents preserve the idea and apply the canonical term.

## Working rule

Reuse before extend. Extend before wrap. Wrap before rewrite. Rewrite only when Hermes fundamentally prevents the required AGK architecture.

No production implementation begins until the Hermes audit, AGK specification, gap analysis, master blueprint, post-Stepper alignment and architecture validation are complete.

## Current status

- Hermes is bounded to AgentRuntime. AGK product code and canonical Web, Tauri and Expo clients remain outside Hermes.
- The canonical AGK Stepper has not been patched by this checkout.
- The pinned AGK Build Gate is CLOSED and admits no Step.
- All files under `06-implementation` are planning contracts with `implementation_allowed: false`.
- `validation/VALIDATION_RESULTS.json` is technical architecture validation, not operator ratification or product implementation evidence.

## Directory index

- `00-input`: immutable prompt and pinned canonical evidence
- `01-hermes-audit`: source-backed Hermes capability audit
- `02-agk-spec`: canonical AGK contracts
- `03-gap-analysis`: deterministic Hermes to AGK decisions
- `04-upstream-strategy`: narrow-waist and upstream policy
- `05-roadmap`: dependency and priority plans
- `06-implementation`: non-executable task contracts
- `07-post-stepper-alignment`: proposed Stepper impact and product alignment
- `tools` and `validation`: fail-closed architecture checks and evidence

## Completion accounting

- `PROMPT_COMPLETION_MATRIX.md` gives the human-readable status of all operator requirements.
- `PROMPT_COMPLETION_MATRIX.json` accounts for all 206 numbered instruction groups and separates planning from implementation.
- The canonical AGK-OS repository records the cross-repository execution truth in `doc/12-runtime/12-hermes-integration-execution-status.md`.
- The separately authorized non-canonical visual experiment is outside this planning SSOT on branch `agk/desktop-visual-prototype` at `spikes/001-agk-surface-shell/`.
