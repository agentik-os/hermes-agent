# GrokBot handoff analysis — 2026-08-25

## Package classification

Both received archives are reference handoffs. They are not Operative System
packages, are not executable runtime inputs, and must never be installed in the
OS registry.

| Package | SHA-256 | Integrity | Classification |
|---|---|---|---|
| GrokBot Reverse Engineering / Hermes Handoff | `650421fef0fc4733799d8302d4d477755d4c51ed4915a0a25361de89087872dc` | ZIP CRC pass | Reference |
| AGK / Grok / Discord / OmegaOS Handoff | `b5ba3cba5b005af42a0a0d3317cffeb89710d9e2089bd3681ddf901547acf812` | ZIP CRC pass | Reference |

The aggregate contains historical OS-looking material. Its root has no package
manifest and therefore none of those files are registered or installed.

## Capability map

| Feature | Historical implementation | Why useful | Agentik OS equivalent | Decision | Target | Priority |
|---|---|---|---|---|---|---|
| Agent roster and groups | Remote rows for agents and groups | Fast mental model and delegation | Canonical Agent/Team registry backed by Hermes identities | ADAPT | Control state + AGK UI | High |
| Session continuity | Remote store plus bounded desktop replica | Resume without losing work | Canonical Hermes session plus RMUX runtime metadata | KEEP | Runtime Registry | High |
| Durable send journal | Nonce, optimistic entry, acknowledgement and draft recovery | Prevents lost or duplicate Discord writes | Typed outbox with idempotency key and read-back reconciliation | ADAPT | Discord adapter / control state | High |
| Route specificity | Guild, channel and thread routing | Deterministic trust boundary | Existing Hermes route resolver with registry drift checks | KEEP | Gateway | High |
| Missed-message recovery | Bounded recovery ledger | Survives downtime | Existing Hermes recovery plus durable receipts | KEEP | Gateway | High |
| Observe without attach | Roster/status/capture separate from terminal | Safe supervision | AGK Control Mode, RMUX snapshot and Runtime API | ADAPT | AGK TUI / Gateway API | High |
| One mission owner | One live oracle; follow-ups return to it | Avoids conflicting writers | One mission owner and explicit worker scopes | ADAPT | Mission planner | High |
| Worker finish report | Done/failed/blocked with evidence | Makes completion falsifiable | Run terminal state, evidence and separate review gate | ADAPT | Run/Eval state | High |
| Approval boundary | Per-operation policy | Limits untrusted ingress | Linux + environment + context + tool policy intersection | KEEP | Policy engine | High |
| Buttons/modals | Deterministic Discord component handlers | Low-friction commands | Canonical backend actions surfaced by Discord components | ADAPT | Discord UX | Medium |
| Local cache | Bounded replicas reconciled at startup | Responsive control surface | Non-authoritative UI cache fed by Gateway/Convex events | ADAPT | Desktop/Web | Medium |
| Proprietary backend | Anysphere gateway and remote boxes | Not portable or available | Hermes + RMUX + Agentik state | REJECT | — | — |
| Reconstructed persona as truth | Missing original Discord prompt reconstructed | Unverifiable | Explicit new role definitions with provenance | REJECT | Agent registry | — |
| One bot per agent | Many identities implied by roster | Token and operations sprawl | Bot equals environment/trust boundary | REJECT | Discord architecture | — |
| Legacy Omega state/paths | Historical local conventions | Conflicts with new hierarchy | Path Resolver and canonical data model | REJECT | Filesystem/control state | — |

## Architecture impact

1. Current Gateway → typed durable outbox → outbox/receipt records in control
   state → mutation API and status UI → prevents duplicate writes and hides
   tokens from model context.
2. Current Runtime Registry → Agent/Team roster and mission-owner linkage → new
   agent/team/run relations → Runtime API and AGK Agents view → authority remains
   bounded by the owning Linux user.
3. Current profile router → route registry and drift reconciler → route identity,
   policy and health metadata → read-only diagnostics plus controlled updates →
   fail closed when a route is stale or ambiguous.
4. Current AGK Control Shell → observe/follow/reply lifecycle → no business state
   stored only in RMUX → session details, grouped active/recent views and command
   palette → attaching remains explicit and killing remains confirmed.

## Recommended order

1. Finish AGK Control Mode and Runtime Registry reconciliation.
2. Add typed Discord outbox, receipts and idempotent mutation worker.
3. Add route registry health/drift checks without replacing Hermes routing.
4. Add Agent/Team registry and one-owner mission semantics.
5. Add evidence-bearing Run completion and independent review/approval.
6. Expose the same actions to Desktop, Web and Discord.

## OS candidates

Historical methodologies in the aggregate may later be candidates for Operative
Systems, but remain `CANDIDATE ONLY`. They require separate OS Builder review and
must arrive through the OS package pipeline before installation.

