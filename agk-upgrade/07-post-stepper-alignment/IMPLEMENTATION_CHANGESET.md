# Implementation Changeset

## New planning artifacts

- complete Hermes capability audit and machine registry
- canonical AGK specifications under `02-agk-spec`
- Hermes to AGK mapping and gap analysis
- runtime adapter and upstream strategy
- reordered dependency-aware roadmap
- 36 implementation task files with no implementation authorization
- post-Stepper reconciliation documents

## Stepper patch proposal

A future AGK-OS Stepper regeneration should:

1. attach the pinned Hermes audit and `agk-hermes-map.yaml` as source evidence for D211 and F22;
2. add explicit semantic-collision requirements for Hermes Project, Goal, Loop, Task, profile and Session;
3. retain the bounded adapter goal while behavior-testing mediation, disabling unmediated modes and routing physical effects through the external broker;
4. add Runtime event sequence, ACK, replay, gap reporting, transactional outbox and capability negotiation;
5. add whole-process sandbox, signed guest, external supervisor, effect broker and no-secret-in-guest acceptance checks;
6. classify scheduler reuse as a decision pending single-authority proof;
7. preserve the exact sixteen OS parts and map programmatic, MCP, Automation and Runtime details inside those parts and the distinct installation and binding objects;
8. add the canonical AGK Web and Tauri surface switcher, Stax, Inspector hierarchy, scope epoch and bounded Expo requirements;
9. add recursive Canvas, graph diff and the Design-to-Build, Live and Inspect-to-debugging mode mapping;
10. add shared-platform and cross-surface permission dependencies;
11. preserve existing ids where semantics remain;
12. place Mission, Plan, Task, Run, package trust and every Runtime security boundary before executable Hermes integration;
13. regenerate all machine artifacts and rerun independent audit.

## Not changed

No Hermes production code was modified. No AGK product repository was bootstrapped. No Stepper source or generated Step was changed from this checkout. No Build Gate was opened.

## Gate

The architecture phase may produce and validate documents and tooling. Implementation remains blocked by the explicit operator decision recorded in the pinned AGK-OS `BUILD_GATE.json`. A future implementation run requires a newly validated exact snapshot and affirmative operator authorization.
