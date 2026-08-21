# Patch Policy

## Footprint ladder

For every AGK requirement, choose the first sufficient rung:

1. reuse existing behavior
2. configure existing behavior
3. use Skill or MCP
4. use native plugin, provider or memory seam
5. use desktop or web contribution seam
6. add a generic extension point with a concrete AGK consumer
7. wrap an unchanged subsystem behind an adapter
8. patch Hermes core
9. replace only after a proven architectural block

## Direct-patch requirements

A core patch requires:

- AGK requirement id
- traced source path and behavior
- attempted adapter or extension alternatives
- reason each alternative is insufficient
- changed files and symbols
- prompt-cache, profile, security and role-alternation impact
- upstream conflict estimate
- behavior and regression tests
- rollback method
- owner and review decision

## Prohibitions

- no AGK conditionals scattered through `run_agent.py`, `gateway/run.py`, `cli.py` or `hermes_state.py`
- no new model-facing core tool when an existing Tool, Skill, plugin or MCP path works
- no AGK secrets in `.env` declarations or checked-in files
- no product domain tables inside Hermes SessionDB
- no UI state becoming canonical domain state
- no source-reading tests

## Generic seams

A new extension point is acceptable only with a real AGK consumer, a narrow behavior contract and end-to-end tests. It should be proposed upstream when broadly useful and free of AGK product semantics.
