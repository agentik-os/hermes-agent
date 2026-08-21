# Learn Alignment

## Role

Learn develops human capability through Paths, Courses, Modules, Lessons, Exercises, Labs, evaluations, certification and its bounded Community domain. It is not part of Hermes Runtime. A Learn assignment may reference or create a Build-owned Project through an explicit bridge; Learn does not own the Project type.

## Shared primitives

Learn uses User, Organization, Project, Skill, Agent, OS, Artifact, Eval, Evidence, Package, Event and Permission contracts. Intelligence core does not import Course or Lesson.

## Build bridge

A Lesson can reference an actual AGK Skill, Agent, OS or Workforce Package. `Open in Build` passes the same object reference plus a learning context and entitlement. An exercise can create a private Build Project and return Artifact and Evidence references for evaluation.

## Hermes reuse

Hermes can execute Tutors, Lab Agents, Tools and eval mechanisms. Course state, progress, cohorts and certification remain Learn domain objects in the control plane.

## Priority

Architecture support now. Minimal Learn foundation is P2 after shared objects, permissions, artifacts, evals and packages. Full academy and Community experience is not part of Runtime integration.

## Surface

The top-level switch selects Learn's own navigation and calm layout while preserving shell identity, search, inbox and deep links. Runtime detail appears only when a user opens a Lab in Build.
