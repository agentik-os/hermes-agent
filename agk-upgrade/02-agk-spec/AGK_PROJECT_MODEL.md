# AGK Project Model

## Definition

A Project is an outcome-oriented operational organization. It is not a folder, repository, chat, Hermes Project or tenancy boundary.

```text
Organization
└── Project
    ├── Outcome and objectives
    ├── Constitution and policies
    ├── Executive or Project Oracle
    ├── optional domain Oracles
    ├── OS Installations
    ├── optional Teams and Workforces
    ├── Missions, Plans and Tasks
    ├── Sessions, Harnesses and Runtime bindings
    ├── Knowledge, Memory and Artifacts
    ├── repositories and Resources
    ├── members and permissions
    └── events, evals, risks and decisions
```

## Minimum viable Project

The minimum organization is one Human, one Project and one Executive or Project Oracle. Teams, Workforces and department Oracles are earned by complexity and never scaffolded automatically.

## Identity and continuity

Project identity survives machine, Runtime, Session, Agent, model and provider failure. Repositories use canonical `RepositoryBinding`; Hermes folder-group records remain private adapter data and are not Project identity.

## Stage

```text
IDEA -> DISCOVERY -> BLUEPRINT -> ROADMAP -> BUILD
     -> VERIFY -> RELEASE -> OPERATE -> IMPROVE
```

`IMPROVE` returns to `DISCOVERY` or `ROADMAP`, never to `IDEA`. Stage informs proposals and presentation and does not gate arbitrary action. Operational health and lifecycle status remain separate from stage. Project completion does not erase its Artifacts, Knowledge, decisions, Evidence or history.

## Creation contract

Creating a Project requires:

- owning Organization
- intended outcome
- owner and initial Human membership
- Executive or Project Oracle mandate
- initial constitution or accepted default
- privacy and classification defaults
- resource and repository bindings when applicable
- initial Budget policy

A Project can begin without a Runtime and can later bind local, desktop, VPS, Docker, cloud or remote execution.

## Hermes mapping

`hermes_cli/projects_db.py::Project` is not reused as this object. The adapter calls it `HermesProjectRecord` internally and maps its folder list to canonical `RepositoryBinding` records where explicitly imported. Hermes Sessions link through canonical AGK Session and Runtime bindings. No `Workspace` domain type is introduced.

## Surface

Project Overview answers outcome, progress, active work, organization, artifacts, attention and health. Chat, Tasks, Artifacts, Canvas, Organization and Runtime are views over the same Project objects. The Project Dashboard is not a separate state store.

## Security

Every Project resolves to one Organization. External client access is explicit and object-scoped. A client does not receive internal prompts, private Memory, agent internals or unrelated project data by default.
