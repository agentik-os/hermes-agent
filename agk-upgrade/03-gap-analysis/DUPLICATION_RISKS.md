# Duplication Risks

| Risk | Duplicate shapes | Prevention |
|---|---|---|
| Project collision | AGK Project and `hermes_cli/projects_db.py::Project` | Adapter names Hermes record `HermesProjectRecord`; imported folders use canonical `RepositoryBinding` |
| Task collision | AGK Task and kanban Task | AGK remains canonical; runtime rows carry correlation only if used |
| Scheduler split | AGK Automation and Hermes cron jobs | One AGK Automation id and authoritative state; adapter or disable Hermes persistence |
| Session split | AGK Session and SessionDB session | Canonical AGK Session plus typed Hermes SessionBinding |
| Memory split | AGK Memory, Hermes local files and external provider | Mandatory AGK Memory adapter for governed runs; no silent fallback |
| Knowledge confusion | files, context, Skills and Memory called Knowledge | First-class AGK Knowledge with provenance and Context Manifest admission |
| Event split | plugin hooks, gateway hooks, logs and AGK events | Normalize at adapter; hooks are inputs, AGK envelope is authority |
| Permissions split | toolsets, command approvals, gateway allowlists and AGK policy | Keep capability, local consent and AGK authorization distinct |
| Agent split | AIAgent object and AGK Agent Definition or Instance | AIAgent is implementation; AGK ids and lifecycle remain above it |
| OS ownership split | mutable autonomous OS Definition and Oracle | Definition declares; Installation binds; Oracle owns live responsibility |
| UI truth split | database, Canvas, manifest and runtime each editable | Define authority per concern; Canvas emits commands and Runtime reports actual state |
| Package split | Hermes plugins, portable plugins, Skills and AGK Packages | Map formats into one AGK package contract without flattening security classes |
| Product split | four standalone apps with duplicated identity and objects | One shell and shared platform contracts with bounded modules |
| Chat duplication | new AGK chat implemented beside Hermes transcript | Reuse gateway and established chat components; AGK adds entity context and projections |

## Review rule

Any proposal introducing a second store, scheduler, event vocabulary, identity, tool registry or chat execution loop must prove why an adapter over the existing authority is insufficient.
