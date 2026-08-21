# Hermes Limitations for AGK

1. Hermes is designed as a single-tenant personal Agent. Profiles are isolated instances, not Organization tenancy.
2. Hermes Project is a multi-folder runtime record and conflicts semantically with AGK Project.
3. No Organization, Oracle, Team, Workforce or OS Definition and Installation domain exists.
4. SessionDB is strong conversation storage but not the canonical AGK object graph or semantic event ledger.
5. Memory providers do not provide governed Knowledge with claim maturity, citations and cross-surface policy.
6. Files and attachments are not first-class AGK Artifacts with complete provenance.
7. Hooks, callbacks, RPC events, logs and trajectories are fragmented and do not guarantee one event envelope.
8. Native plugins run in-process with full privilege. Capability consent is not sandboxing.
9. Terminal backend isolation does not contain plugins, MCP or host code execution.
10. Subagent lifecycle is process-local and reconnect is unavailable after restart.
11. Cron and kanban own separate stores, creating dual-authority risk if adopted directly.
12. Goals and Loops are Session controllers, not reusable AGK domain Definitions.
13. Gateway authorization does not implement per-Actor multi-Organization policy.
14. Desktop is Hermes-branded and chat-first. Its plugin SDK does not automatically provide full AGK product identity.
15. Several central modules are very large and direct patches carry high upstream conflict risk.
16. Alternative runtime support is an architectural boundary, not an implemented capability.
17. `execute_code` has a fail-open empty nested-Tool intersection in the audited snapshot.
18. Background process control needs stronger owner-principal checks.
19. Outbound A2A URL and bearer handling is unsafe for governed deployment without egress policy.
20. Stock update follows `origin`, which is Nous upstream in this fork checkout.
21. Remote sync-back and broad MCP secret passthrough are incompatible with default AGK sandbox policy.
22. Desktop contributions cannot currently apply a layout preset through the public SDK.

These limitations are placement facts, not criticisms. Hermes intentionally solves a lower layer than AGK.
