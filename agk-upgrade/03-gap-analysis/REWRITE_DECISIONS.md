# Rewrite Decisions

No Hermes subsystem is approved for rewrite during the architecture phase.

| Hermes mechanics | Disposition | Reason |
|---|---|---|
| Agent loop | REUSE | Mature core with providers, tools, retries, interruption and persistence |
| Tool registry | REUSE | Strong native registry and gating |
| Skills | REUSE | Mature format, discovery, lifecycle and distribution |
| MCP | ADAPT | Native transport and OAuth need per-server secrets and effect mediation |
| Provider routing | ADAPT | Wire profiles are retained behind the external model broker |
| Session storage | ADAPT | Strong runtime history, but not canonical AGK Session state |
| Memory | ADAPT | Useful provider seam, insufficient scopes and Knowledge boundary |
| Scheduler | DEFER | Reuse remains unratified until dual authority and fallback are eliminated |
| Kanban | DEFER | Useful queue but semantic and state-authority conflict |
| Desktop | ADAPT | Runtime console and behavior reference only; AGK product clients are NEW elsewhere |
| Gateway | ADAPT | Broad transports, insufficient AGK Actor and tenancy semantics |
| Security heuristics | REUSE | Defense in depth only, never containment or sole authorization |

## Rewrite threshold

A replacement becomes eligible only when:

1. the required AGK contract is explicit and validated;
2. the existing Hermes capability has been traced through source and tests;
3. extension, plugin, adapter and wrapper paths have concrete failed proofs;
4. the replacement has behavior parity tests for retained Hermes capability;
5. upstream conflict and rollback cost are documented;
6. an operator approves the change.

Until then, `REPLACE` is not an implementation option.
