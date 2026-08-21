# AGK Upgrade Traceability

This matrix maps the verbatim operator prompt to architecture artifacts. `COVERED` means specified or audited. It never means implemented. `PROMPT_COMPLETION_MATRIX.md` and `PROMPT_COMPLETION_MATRIX.json` provide the explicit planning and implementation state for all 206 numbered instruction groups.

| Prompt sections | Requirement family | Primary artifacts | Status |
|---|---|---|---|
| 1 to 4 | reuse doctrine, AGK vision, ontology and target layers | `README.md`, `DECISIONS.md`, `02-agk-spec/AGK_VISION.md`, `AGK_HERMES_MASTER_BLUEPRINT.md` | COVERED |
| 5 to 6 | complete Hermes audit and capability registry | `01-hermes-audit/*`, `hermes-capabilities.yaml`, `REPOSITORY_INVENTORY.json` | COVERED |
| 7 to 8 | independent AGK requirements and core objects | `02-agk-spec/*` | COVERED |
| 9 | Hermes to AGK comparison | `03-gap-analysis/*`, `agk-hermes-map.yaml` | COVERED |
| 10 to 11 | compatibility layer and AgentRuntime | `02-agk-spec/AGK_RUNTIME_CONTRACT.md`, tasks 008 to 013 and 031 to 036 | COVERED |
| 12 | model provider architecture | `01-hermes-audit/PROVIDERS_MAP.md`, `02-agk-spec/AGK_MODEL_ROUTING.md`, task 011 | COVERED |
| 13 to 14 | Machines, Runtimes, Sessions and terminals | `SANDBOX_MAP.md`, `RUNTIME_MAP.md`, `AGK_HARNESS_MODEL.md`, tasks 010, 013, 027 and 031 to 036 | COVERED |
| 15 to 16 | Artifacts, Memory, Knowledge and Context | corresponding AGK specs, tasks 006 and 007 | COVERED |
| 17 to 18 | communication, events and observability | `GATEWAYS_MAP.md`, `AGK_OBSERVABILITY.md`, tasks 005 and 026 | COVERED |
| 19 to 25 | evals, Architect, Labs, versioning, marketplace readiness and security | AGK specs, tasks 020, 021 and 025 | COVERED |
| 26 | upstream compatibility | `04-upstream-strategy/*` | COVERED |
| 27 to 30 | roadmap, tasks, decision log and mapping registry | `05-roadmap/*`, `06-implementation/*`, `DECISIONS.md`, `agk-hermes-map.yaml` | COVERED |
| 31 to 37 | implementation boundaries, naming, UI restraint, quality and tests | Blueprint, Patch Policy, task contracts and validator | COVERED |
| 38 to 45 | execution sequence, challenge assumptions and master blueprint | Master Blueprint, alignment set and this traceability matrix | COVERED |
| 46 to 48 | Architect, Labs and governed improvement | `AGK_LABS_MODEL.md`, task 025, alignment report | COVERED, DEFERRED IMPLEMENTATION |
| 49 to 64 | one platform, Learn and Community | Learn and Community alignment, product bridges task | COVERED, P2 |
| 65 to 77 | Deals, referrals, marketplace and Portfolio | Deals alignment, package task, shared graph | COVERED, P2 to P4 |
| 78 to 90 | Self, privacy, Home, Inbox, search and creation | Self and shared platform alignment, surface switcher task | COVERED, P2 |
| 91 to 123 | product object models and cross-surface events | Object Model, product alignments and event task | COVERED |
| 124 to 146 | scheduling, clients, topology, packages, trust and creator Organizations | Runtime, package, roadmap and alignment docs | COVERED, MOSTLY DEFERRED |
| 147 to 170 | product differentiator, progressive disclosure, Canvas and reference scenarios | Blueprint, Canvas alignment, tasks 022 to 025, 029 and 030 | COVERED |
| 171 to 173 | full ecosystem and MVP discipline | Roadmap and Priority Matrix | COVERED |
| 174 to 181 | post-Stepper reconciliation and registries | `07-post-stepper-alignment/*`, root reports and map | COVERED |
| 182 to 196 | reuse boundaries, product modularity, privacy, commercial abstraction and coherence | decisions, mappings, security and product alignments | COVERED |
| 197 to 205 | strategic tests, priorities, reports, Stepper update and final architecture | Alignment Report, implementation changeset, validator and task DAG | COVERED, STEPPER PATCH DEFERRED |

## Explicit unresolved execution state

- No product implementation file is changed.
- The pinned AGK Build Gate is closed.
- The existing Stepper is analyzed but not patched in this Hermes checkout.
- A future Stepper patch requires regeneration in AGK-OS and a fresh independent audit.
- Open architecture choices remain listed in section 33 of the alignment report.
