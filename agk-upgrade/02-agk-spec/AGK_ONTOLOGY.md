# AGK Ontology

## Canonical hierarchy

```text
Organization
└── Project
    ├── Oracle
    ├── OS Installation
    ├── Workforce Instance
    │   └── Team
    │       ├── Human membership
    │       └── Agent instance
    ├── Mission
    │   └── Plan
    │       └── Task
    │           └── Run
    │               └── Span
    ├── Knowledge
    ├── Memory
    └── Artifact
```

Nothing sits between Organization and Project. Workspace is a UI layout surface only.

## Core definitions

| Primitive | Canonical meaning |
|---|---|
| Organization | Tenancy, ownership, membership, billing and commercial boundary |
| Project | Outcome-oriented operational organization containing an AI organization |
| Model | Cognition resource selected through provider and policy |
| Prompt | Versioned instruction component |
| Tool | Callable capability |
| Connector | Authenticated service binding |
| MCP | Capability transport protocol, never an object substitute for Tool or Connector |
| Skill | Reusable procedure with rubric and version |
| Agent | Persistent or ephemeral canonical machine actor; Worker is a role |
| Oracle | Persistent owner of one domain, with mandate, state, decisions, inbox, KPIs and authority |
| Team | Bounded group collaborating on one functional domain |
| Workforce | Deployed organizational system containing Teams, Agents and Oracles |
| OS | Reusable intelligence Definition that declares how a domain operates |
| OS Installation | Scoped instance of an OS version carrying configuration, resources, permissions, Knowledge, Memory and Runtime behavior; distinct binding objects control usage |
| Flow | Reusable authored process |
| Loop | Reusable bounded iterative controller |
| Task Graph | Current dependency DAG generated for execution |
| Graph | Engine data structure, not a user-facing object kind |
| Harness | Logical execution configuration |
| Runtime | Physical execution environment |
| Session | Persistent interactive execution context distinct from Mission and Run |
| Memory | Experience retained by the system |
| Knowledge | Reusable truth with scope, type, maturity and provenance |
| Context | Information compiled for cognition now |
| Resource | Input or external/domain asset available to work |
| Artifact | Managed work product with provenance |
| Evidence | Proof that may refer to an Artifact but need not be one |
| Eval | Measurement |
| Audit | Systematic investigation |
| Verification | Acceptance decision against requirements |
| Lab | Bounded research, practice and improvement environment |

## Definition, Installation or Instance, and Run

Reusable executable systems do not own live deployment state.

```text
Definition -> Installation or Instance -> Deployment Snapshot -> Run
```

- A Definition version is immutable after publication.
- An Installation or Instance binds the Definition to a real scope.
- A Deployment Snapshot pins every executable version and effective policy.
- A Run records one execution against that pin.

An OS Definition has exactly sixteen parts: Purpose, Principles, Commands, Flows, Agents, Skills, Tools, Knowledge, Memory, Policies, Inputs, Outputs, Evals, Quality Gates, Dependencies and Versions. MCP, scripts, Loop, Automation and Runtime details map inside those parts. The Installation instantiates them and controlled usage is expressed through `ProjectOSBinding` or `OSBinding`. The Oracle owns live domain responsibility.

## Operating chain

```text
Project -> Mission -> Plan -> Task -> Actor -> Session -> Harness -> Runtime
        -> Run -> Span -> Artifact -> Evidence -> Verification
```

A Mission spans Sessions. A Session hosts Runs. A model, provider, account, runtime, Session and Mission have distinct identities.

## Relationships

Relationships are typed semantic edges, including:

- `owns`
- `reports_to`
- `delegates_to`
- `uses`
- `has_access_to`
- `reads`
- `writes`
- `triggers`
- `produces`
- `reviews`
- `depends_on`
- `runs_on`
- `communicates_with`
- `installed_from`
- `verified_by`

Canvas lines are projections of these edges. A visual line with no declared semantic type is invalid.

## Human and machine actors

Human, Agent and Oracle may participate in one Team but remain distinct entities. `Actor` is a typed reference over human, agent, oracle, system, integration, runtime and plugin. It does not collapse their lifecycles or authority.

## Protected distinctions

- OS Definition is not Oracle.
- Agent is not Oracle.
- Team is not Workforce.
- Project is not a folder or Hermes Project record; Workspace remains UI layout only.
- Mission is not Session.
- Session is not Run.
- Flow is not Automation.
- Memory is not Knowledge.
- Artifact is not Evidence.
- Capability is not authorization.
- Package is not Plugin.
