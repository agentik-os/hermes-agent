# Canvas Alignment

## Recursive scopes

```text
Project Canvas
-> Workforce Canvas
-> Team Canvas
-> OS Installation Canvas
-> selected Agent, Flow or Run detail
```

## Modes

- Design edits Definition drafts and bindings through semantic commands.
- Live overlays idle, working, waiting, blocked and failed state plus event flow.
- Inspect overlays Runs, Spans, model calls, Tool calls, Context, Memory reads, Knowledge retrieval, files, cost, latency and evals.

These are Organization Canvas overlays. `Design` maps to Build authoring, `Live` uses the canonical state-transition lens, and `Inspect` is the entry to Debug, Replay, Analytics, Cost and Quality. They do not replace the seven canonical Flow Canvas modes or Replay's observational versus execution separation.

## Node contract

A node references a canonical object id and type. Presentation coordinates have a separate layout revision. Supported visual types derive from the object registry and include Oracle, Team, Agent, OS Installation, Skill, Tool, Connector, Knowledge, Memory, Prompt, Flow, Trigger, Artifact, Human and Runtime.

## Edge contract

Every edge has a semantic type such as owns, reports_to, delegates_to, uses, has_access_to, reads, writes, triggers, produces, reviews, depends_on, runs_on or communicates_with.

## Hermes reuse

Reuse Hermes gateway, terminal, files, git and preview behavior through adapters. Treat the Electron pane tree, contribution registry and route system as extraction references. Implement canonical Canvas and Stax in AGK Web, shared by the Tauri wrapper. Do not store organizational truth in client state.

## Review

Architect changes render as before and after graph diffs. Structural changes use object revisions and reject stale edits. Layout collaboration is separate from semantic collaboration.
