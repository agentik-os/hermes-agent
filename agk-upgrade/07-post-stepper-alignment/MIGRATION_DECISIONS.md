# Migration Decisions

## M-001. No implicit import of Hermes domain-like records

Hermes Projects, profiles, kanban tasks, goals, loops and sessions are not renamed into AGK objects. Migration creates explicit adapter bindings or imports through reviewed commands.

## M-002. Runtime history remains evidence

Hermes SessionDB history can be linked or imported as runtime evidence with source commit, profile, session id, timestamps and fidelity limits. It does not become canonical Project history by copying rows.

## M-003. Memory requires explicit scope

Local MEMORY.md, USER.md and provider data are imported only after the user selects target scope and classification. No automatic Organization or Self promotion exists.

## M-004. Skills and plugins use adapters

Hermes Skills can map to Skill Definitions. Native and portable plugins map to AGK package components only after capability, trust, provenance and compatibility inspection. Unsupported fields remain visible.

## M-005. Desktop state is presentation

Existing panes and layout remain presentation compatibility data. Hermes Projects remain private adapter records whose folders may map to canonical RepositoryBindings. They never determine Organization or Project identity.

## M-006. Scheduler authority

Existing Hermes cron jobs are not silently adopted as AGK Automations. Import requires one Automation deployment binding with Trigger, target, Policy, owner, Budget, scope and event contract. Until then they remain external Runtime jobs or are disabled in governed mode.

## M-007. Stepper preservation

Existing Step ids remain stable where semantics hold. New alignment work is inserted through the Stepper generator and source registry, followed by full regeneration and independent audit. No hand edit of generated Step files.

## M-008. Upstream upgrade

Hermes baseline changes use the two-remote merge playbook and behavior tests. A new upstream commit does not enter production through a floating branch.
