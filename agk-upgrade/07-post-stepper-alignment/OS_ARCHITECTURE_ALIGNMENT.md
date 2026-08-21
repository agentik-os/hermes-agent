# OS Architecture Alignment

## Verdict

The existing AGK OS model already supports the refined vision when its declared substructures are made explicit. No ontology replacement is required.

## Definition anatomy update

Keep Purpose, Principles, Commands, Flows, Agents, Skills, Tools, Knowledge, Memory, Policies, Inputs, Outputs, Evals, Quality Gates, Dependencies and Versions. Explicitly model within those parts:

- MCP and Connector requirements under Tools and Dependencies
- scripts, functions, validators and deterministic jobs as Tool implementations or Flow nodes
- Loop and Trigger requirements under Flows and Dependencies
- Runtime and Harness requirements under Dependencies and Versions
- Boss or lead role as an Agent role, never as implicit Oracle
- scheduled behavior as Automation references under Flows or Dependencies

## Installation behavior

OSInstallation binds real Agents, resources, Connector accounts, Knowledge, Memory, Automations, permissions, Budgets, Runtime targets and overrides at organization, project or OS scope. OrganizationOSInstallation carries `authority_floor`; ProjectOSBinding may tighten and never loosen it; Oracle and department usages are separate OSBinding objects. At A4 or A5 an installation can operate without a current human message, within policy and bounded Missions.

## Oracle boundary

Oracle owns mandate, decisions, KPIs, inbox, subscriptions and live domain state. The OS supplies methods and executable composition. A Boss Agent coordinates work but does not acquire Oracle authority automatically.

## Hermes reuse

Reuse AIAgent, Skills, Tool mechanics, bounded AgentCalls and provider wire behavior through the sandbox, brokers and adapters. MCP, Memory, scheduler and execution environments are adapted or deferred according to their audited security and authority limits.

## Reference tests

The architecture must represent Builder OS, Librarian OS and Journal OS without special cases, preserve the exact sixteen-part anatomy, compose dependency constraints under canonical conflict rules, preserve private Self bindings and show all effective capabilities before deployment.
