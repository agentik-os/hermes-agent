# Hermes communications audit

## Outcome

- Audited Hermes Agent at commit `8794e5a21c980a0f26532cb4883284b786cb3f25`, branch `agk/upgrade-architecture`.
- Verified **33 adapter implementations**: 23 bundled plugin registrations plus 10 built-in `BasePlatformAdapter` subclasses, including relay.
- Hermes provides a strong, reusable **edge communications runtime**: adapters, profile/session routing, reconnects, streaming replies, media delivery, webhook/API ingress, and several agent-to-agent mechanisms.
- It does **not** provide AGK’s canonical Message Bus, durable Event Engine, actor authority model, communication rights, classified message ledger, or transactionally coupled domain events. Those belong in a normalized AGK layer above Hermes.

## 1. Runtime architecture

The messaging path is:

```text
Provider/HTTP/relay
  → adapter normalizes MessageEvent
  → optional pre_gateway_dispatch plugin hook
  → profile routing
  → allowlist/pairing/slash authorization
  → SessionSource → session key/session id
  → busy-mode and per-session turn lease
  → AIAgent
  → stream dispatcher
  → adapter delivery
  → delivery ledger/dead-target tracking
```

Key boundaries:

- Normalized ingress: `gateway/platforms/base.py:2403-2452`.
- Adapter contract and optional capabilities: `gateway/platforms/base.py:2938-3245`.
- Central orchestration: `gateway/run.py`.
- Session identity: `gateway/session.py:93-144,263-318`.
- Profile selection: `gateway/profile_routing.py:55-101`.
- Delivery: `gateway/delivery.py:272-391`.
- Streaming events: `gateway/stream_events.py`, `gateway/stream_dispatch.py`.
- Lifecycle hooks: `gateway/hooks.py:46-273`.
- Plugin lifecycle/events: `hermes_cli/plugins.py:161-387,3216-3287`.

### Lifecycle and recovery

- Startup connects platforms independently under bounded deadlines, so one failed platform does not block the others: `gateway/run.py:7606-7646,12301-13083`.
- Failed/retryable adapters enter a persistent in-process reconnect queue. Backoff is `30s, 60s, 120s...`, capped at five minutes: `gateway/run.py:4179-4181,8215-8445`.
- Fatal non-retryable loss exits cleanly; retryable total outages keep the process alive for reconnect and cron.
- Shutdown enters draining, notifies active chats, persists `resume_pending`, waits for gateway, cron, and API runs, then cooperatively interrupts and performs bounded adapter teardown: `gateway/run.py:14422-14779`.
- Runtime/readiness/lifecycle state is exposed through `gateway/status.py`, `gateway/readiness.py`, and `gateway/lifecycle_ledger.py`.

## 2. Complete adapter inventory

### Built-in adapters

| Adapter | Transport/pattern | Code |
|---|---|---|
| `api_server` | aiohttp OpenAI-compatible and Hermes REST API | `gateway/platforms/api_server.py:1360` |
| `webhook` | Generic HMAC HTTP ingress, transform/filter/deliver-only | `gateway/platforms/webhook.py:177` |
| `msgraph_webhook` | Microsoft Graph change-notification ingress | `gateway/platforms/msgraph_webhook.py:52` |
| `whatsapp_cloud` | Meta webhook plus Graph REST API | `gateway/platforms/whatsapp_cloud.py:203` |
| `signal` | `signal-cli` SSE inbound, JSON-RPC/HTTP outbound | `gateway/platforms/signal.py:253` |
| `bluebubbles` | Local BlueBubbles REST and authenticated webhook | `gateway/platforms/bluebubbles.py:163` |
| `weixin` | Tencent iLink long polling, encrypted CDN media | `gateway/platforms/weixin.py:1172` |
| `qqbot` | Official QQ WebSocket Gateway plus REST | `gateway/platforms/qqbot/adapter.py:180` |
| `yuanbao` | Persistent authenticated WebSocket | `gateway/platforms/yuanbao.py:4864` |
| `relay` | Negotiated multi-platform connector over WebSocket | `gateway/relay/adapter.py:65` |

`msgraph_webhook.send()` is intentionally log-only, not a Graph reply transport: `gateway/platforms/msgraph_webhook.py:193-201`.

### Bundled platform plugins

| Adapter | Transport/highlight | Registration |
|---|---|---|
| `a2a` | Linux Foundation A2A v1 JSON-RPC, inbound and outbound | `plugins/platforms/a2a/__init__.py:110` |
| `buzz` | Nostr/Buzz relay through the Buzz CLI | `plugins/platforms/buzz/adapter.py:1489` |
| `dingtalk` | DingTalk Stream SDK | `plugins/platforms/dingtalk/adapter.py:1912` |
| `discord` | `discord.py`, DMs/guilds/threads/reactions/voice | `plugins/platforms/discord/adapter.py:10523` |
| `email` | IMAP polling and SMTP thread replies | `plugins/platforms/email/adapter.py:1494` |
| `feishu` | Lark SDK over WebSocket or webhook | `plugins/platforms/feishu/adapter.py:5877` |
| `google_chat` | Authenticated callback or Pub/Sub plus Chat REST | `plugins/platforms/google_chat/adapter.py:3691` |
| `homeassistant` | HA WebSocket events plus REST notifications | `plugins/platforms/homeassistant/adapter.py:584` |
| `irc` | Stdlib asyncio IRC, optional TLS/NickServ | `plugins/platforms/irc/adapter.py:955` |
| `line` | HMAC webhook plus Messaging API | `plugins/platforms/line/adapter.py:1728` |
| `matrix` | mautrix, optional E2EE, rooms/threads/media | `plugins/platforms/matrix/adapter.py:5444` |
| `mattermost` | REST plus WebSocket events | `plugins/platforms/mattermost/adapter.py:1302` |
| `ntfy` | HTTP streaming subscription and POST publish | `plugins/platforms/ntfy/adapter.py:581` |
| `photon` | Spectrum gRPC through a supervised Node sidecar | `plugins/platforms/photon/adapter.py:2909` |
| `raft` | Content-free loopback wake hints; bodies through Raft CLI | `plugins/platforms/raft/adapter.py:829` |
| `simplex` | Local SimpleX daemon over WebSocket | `plugins/platforms/simplex/adapter.py:1349` |
| `slack` | Slack Bolt Socket Mode | `plugins/platforms/slack/adapter.py:9577` |
| `sms` | Twilio REST and webhook | `plugins/platforms/sms/adapter.py:520` |
| `teams` | Microsoft Bot Framework webhook/SDK | `plugins/platforms/teams/adapter.py:1495` |
| `telegram` | Bot API polling/webhook, topics, edits, media | `plugins/platforms/telegram/adapter.py:10881` |
| `wecom` | WeCom Smart Robot WebSocket | `plugins/platforms/wecom/adapter.py:1895` |
| `wecom_callback` | Encrypted AES callback for self-built apps | `plugins/platforms/wecom/adapter.py:1918` |
| `whatsapp` | Local Baileys/WhatsApp Web Node bridge | `plugins/platforms/whatsapp/adapter.py:1911` |

### Supported adapter patterns

The contract supports:

- Text, photo, voice, audio, video, document, command, and callback modalities.
- Thread/topic/reply context through `SessionSource.thread_id`, `message_id`, `parent_chat_id`, `scope_id`, and metadata.
- Edit-based and draft-based streaming, typing indicators, processing status, reactions, buttons, approval prompts, and media.
- Adapter-specific length measurement, including chars, bytes, and UTF-16 units.
- Live adapter sends and out-of-process standalone senders for cron/CLI.
- Provider-native mention gating, free-response channels, DM/group policies, pairing, and allowlists.

Capabilities must be probed rather than inferred. `PlatformCapabilities` only standardizes media/reaction booleans and message length; threads, edit streaming, buttons, and draft support remain method-level/ad hoc capabilities: `gateway/platforms/base.py:2945-2960,3223-3245`.

## 3. Normalized messages and event dialects

### Canonical adapter envelope

`MessageEvent` is Hermes’ normalized inbound communication type:

- `text`, `message_type`, `source`
- `raw_message`
- platform `message_id`
- media URL/path/type lists
- `metadata`, `channel_context`, `channel_prompt`
- `internal`
- `allow_gateway_control`

See `gateway/platforms/base.py:2403-2452`.

`SessionSource` carries the routing identity:

- platform, chat/user/thread/guild identity
- alternate identifiers
- scope and parent-channel identifiers
- profile and relay markers
- chat type and service tier

See `gateway/session.py:263-318`.

`SendResult` standardizes success, message IDs, continuation IDs, error, retryability, retry delay, and an untyped `raw_response`: `gateway/platforms/base.py:2464-2494`.

### Important limitation

There is **no single canonical Hermes `NormalizedEvent`**. There are multiple unrelated event dialects:

1. `MessageEvent` for conversation ingress.
2. Plain-dict platform events after authorization, currently Telegram reactions/edits and Discord edits/deletes/thread changes: `gateway/platforms/base.py:3645-3656`, `gateway/run.py:15568-15613`.
3. Slack reaction dictionaries routed through `HookRegistry`: `gateway/platforms/base.py:3696-3710`, `gateway/run.py:8199-8213`.
4. Agent/tool streaming dataclasses in `gateway/stream_events.py`.
5. Gateway lifecycle names such as `session:start`, `agent:start`, and `agent:end` in `gateway/hooks.py:2751-2782`.
6. Plugin lifecycle names such as `pre_tool_call`, `on_session_end`, `subagent_start`, and Kanban events in `hermes_cli/plugins.py:161-387`.
7. Namespaced, in-memory inter-plugin events through `ctx.emit/subscribe`; queue cap 64, recursion cap 8, no schema or persistence: `hermes_cli/plugins.py:531-542,3216-3287,5295-5337`.
8. TUI/Desktop JSON-RPC `event` frames and API-specific SSE events.

These cannot serve directly as AGK’s durable Event Engine without normalization and semantic ownership.

## 4. Authorization and trust boundaries

### Messaging authorization

Central policy is default-deny:

- Per-platform `*_ALLOWED_USERS`.
- Optional global `GATEWAY_ALLOWED_USERS`.
- Explicit `*_ALLOW_ALL_USERS` or `GATEWAY_ALLOW_ALL_USERS`.
- Pairing codes for supported DM policies.
- Discord role-based authorization.
- Separate group/chat allowlists where adapters support them.

Core logic: `gateway/authz_mixin.py:144-355`; pairing: `gateway/pairing.py:50-180`.

Adapters such as WeCom, Weixin, QQBot, Yuanbao, and WhatsApp may enforce local `dm_policy/group_policy` first, but open mode still requires an explicit allow-all flag: `gateway/platforms/base.py:3163-3189`. Relay is the sole upstream-authorization exception: `gateway/platforms/base.py:3191-3221`.

`internal=True` bypasses normal user authorization, so it is a trusted-code capability. Internal/plugin-generated events normally set `allow_gateway_control=False` to prevent slash-command interpretation.

### Slash-command authorization

`gateway/slash_access.py:54-202` supports user/admin command roles, but it is opt-in for compatibility:

- Without role lists, any otherwise authorized user can invoke any slash command.
- It controls slash commands, not arbitrary agent tool use.
- Regular allowed users receive whatever toolset the profile/platform exposes.

This is substantially coarser than AGK’s `Capability ∩ Permission ∩ Risk ∩ Policy ∩ Environment ∩ Approval`.

### Webhook/API security

- Generic webhook requires an HMAC secret per route. V2 binds a timestamp; legacy body-only V1 remains accepted and has no replay protection. Default rate is 30/minute, body cap 1 MiB, in-memory dedupe TTL one hour: `gateway/platforms/webhook.py:20-30,220-232,248-299,426-460`.
- `INSECURE_NO_AUTH` is refused on non-loopback generic-webhook binds: `gateway/platforms/webhook.py:252-271`.
- WhatsApp Cloud rejects POSTs when no app secret is configured and verifies `X-Hub-Signature-256`: `gateway/platforms/whatsapp_cloud.py:1485-1505`.
- Microsoft Graph requires `clientState`; public binds also require source CIDRs: `gateway/platforms/msgraph_webhook.py:148-167,235-301`.
- LINE verifies raw-body HMAC-SHA256: `plugins/platforms/line/adapter.py:305-329,945-952`.
- Email defaults to validating receiving-server `Authentication-Results` for aligned SPF/DKIM/DMARC before trusting `From`: `plugins/platforms/email/adapter.py:389-466,567-593`.
- `ntfy` has no sender identity. The topic is the identity/trust boundary: `plugins/platforms/ntfy/adapter.py:40-44`.
- IRC authorization is nickname-based and therefore weaker than a cryptographically bound account unless deployment-level IRC authentication is enforced: `plugins/platforms/irc/adapter.py:110-151`.
- Twilio signature verification exists, but `SMS_INSECURE_NO_SIGNATURE=true` only warns and can be combined with a public bind; unlike generic webhooks, it is not startup-refused: `plugins/platforms/sms/adapter.py:124-144,249-286`.

### API server

Routes are registered at `gateway/platforms/api_server.py:3076-3189` and include:

- Chat Completions, Responses, Runs, models, and capabilities.
- Hermes session list/create/get/messages/delete/fork/chat/stream.
- Jobs and Chronos cron-fire integration.
- `/p/{profile}/...` multiplexed variants.

Controls:

- Loopback by default.
- Network-accessible bind without a key is refused.
- Bearer comparison is constant-time.
- Per-profile keys are supported.
- CORS is opt-in; host/origin checks and security headers are present.
- 10 MB request cap and configurable concurrent-run cap.
- Non-streaming chat/responses support a five-minute in-memory idempotency cache.
- Responses state persists in SQLite, capped at 100 records.

See `gateway/platforms/api_server.py:1116-1264,1360-1468,3227-3310`.

**Trust consequence:** the API bearer is broad authority. The default API toolset includes terminal, process, file writes, patching, browser automation, skills, delegation, and cron: `toolsets.py:461-496`. There is no API-principal RBAC or AGK-style object grant. It intentionally omits interactive `clarify` and autonomous `send_message`.

### Confirmed high-risk A2A finding

Outbound A2A URL handling lacks equivalent SSRF/origin protection:

- Direct arbitrary `http(s)` peer URLs are accepted: `plugins/platforms/a2a/tools.py:53-68`.
- Agent Card `supportedInterfaces[].url` or top-level `url` is trusted: `tools.py:114-130`.
- The configured peer bearer header is reused for the selected card URL: `tools.py:149-186`.

I verified in-process that a card selecting `http://169.254.169.254/...` caused `_send_task` to invoke the POST path with that URL **and an Authorization Bearer header**. No external request was made in the verification. Push-callback URLs have SSRF protection, but outbound discovery/task URLs do not. AGK should not enable A2A tools without a same-origin/allowlist/egress broker.

### Desktop/TUI gateway

Desktop and TUI share one privileged JSON-RPC dispatcher over stdio or WebSocket: `tui_gateway/transport.py:1-20`, `tui_gateway/ws.py:1-22`.

The official `/api/ws` mount correctly adds:

- Ephemeral session token in loopback/insecure mode.
- Single-use, 30-second tickets or process credentials in gated mode.
- Host, Origin, and peer-IP checks.

See `hermes_cli/web_server.py:15855-16050,17134-17150`.

`handle_ws()` itself performs no authentication: `tui_gateway/ws.py:286-420`. Any alternative mount must reproduce the outer checks. Once authenticated, the JSON-RPC surface is broad and not per-method RBAC.

## 5. Session and profile routing

Profile routes match `platform`, `guild_id`, `chat_id`, and `thread_id`; highest specificity wins. They only activate when `gateway.multiplex_profiles` is enabled: `gateway/profile_routing.py:55-101`, `gateway/run.py:15913-16087`.

Session-key shapes are generated in `gateway/session.py:93-144`:

| Source | Default keying |
|---|---|
| DM | platform plus user |
| Group | platform, group, and user when `group_sessions_per_user=true`; otherwise shared |
| Thread/topic | platform, parent chat and thread; optional user partition |
| Multiplexed profile | prefixed `agent:<profile>:` |
| Single-profile | legacy `agent:main:` |

Controls:

- Persistent key-to-session mapping, reset/switch/end/suspend and origin metadata: `gateway/session.py:955-1141`.
- Busy input modes: `interrupt`, `queue`, or `steer`; default is `interrupt`: `gateway/run.py:9483-9518`.
- Busy queue is capped at 32 pending turns: `gateway/run.py:9959-10021`.
- A resolved-session turn lease serializes transcript load/run/flush across alias routing keys: `gateway/turn_lease.py:1-39,191-264`.
- Lease timeout fails closed rather than allowing concurrent transcript mutation.

Limitations:

- Turn leases are process-local. A CLI process sharing the same session remains outside the lock: `gateway/turn_lease.py:41-48`.
- Hermes session identity contains no AGK Organization, Project, Mission, Task, Actor, authority, or classification.
- Profile routes select configuration/persona/tool scope, not AGK tenancy or authorization.

## 6. Delivery and cross-platform communication

### Outbound paths

1. Direct reply to an inbound `MessageEvent`.
2. `hermes send` / `send_message_tool`.
3. Cron delivery through `DeliveryRouter`.
4. Generic webhook `deliver_only`.
5. Kanban/background completion notices.
6. Relay/A2A/Bot Mode peer paths.

`DeliveryRouter` resolves origin, home-channel, direct, and local targets: `gateway/delivery.py:62-143,272-391`.

The channel directory persists recently observed platform/channel/thread identities for human-friendly target resolution: `gateway/channel_directory.py:1-20,78-190`.

Plugin extension hooks include custom target parsing, validation, whole-request handlers, and standalone sender functions: `gateway/platform_registry.py:183-229`.

### Reliability semantics

- `_send_with_retry` performs the initial send plus two retries for known-safe connection failures, honoring platform `retry_after`: `gateway/platforms/base.py:5533-5622`.
- Ambiguous read/write timeouts are not automatically retried because the provider may already have accepted the message.
- Non-network failures receive a plain-text fallback.
- `DeadTargetRegistry` persists confirmed whole-chat `forbidden/not_found` destinations and clears them after a later successful send: `gateway/dead_targets.py:1-22,38-143`.
- The delivery ledger records final text reply obligations in `state.db`, with at most 3 recovery attempts, 24-hour stale cutoff, 7-day retention, and 500 rows: `gateway/delivery_ledger.py:58-63,200-314`.
- Startup redelivery labels ambiguous recovered replies rather than silently risking duplicates: `gateway/run.py:11918-12023`.
- Relay explicitly marks outbound timeout outcomes `ambiguous=True`: `gateway/relay/ws_transport.py:779-849`.

Limitations:

- No universal durable outbound queue or exactly-once guarantee.
- Delivery ledger coverage is primarily the final text reply path, not every attachment, webhook, standalone send, Bot Mode message, or plugin event.
- `send_message` target resolution is not an authorization decision. It validates syntax/availability, not AGK communication rights.
- Model-callable `send_message` is intentionally excluded from default agent toolsets, but most profiles have terminal access and Bot Mode explicitly uses `hermes ... chat` subprocesses: `toolsets.py:430-438`.
- Standalone sender media/thread parity varies by adapter.

### Outbound lifecycle webhooks

`agent/outbound_webhooks.py` mirrors plugin lifecycle hooks to HTTP:

- Optional HMAC-SHA256.
- Queue cap 256.
- Two attempts, retrying connection errors/5xx only.
- Redirects are refused.
- Response bodies are ignored.

See `agent/outbound_webhooks.py:14-30,89-106,380-466,488-569`.

This is best-effort notification, not a durable event bus. A missing secret produces unsigned deliveries.

## 7. Bot Mode and agent-to-agent communication

### Bot identity and canonical chat

A Bot Mode bot is a Hermes profile with independent skills, memory, config, credentials, and a single pinned `Bot Chat`: `apps/desktop/src/plugins/hermes-bots/plugin.js:1-16`.

The Bot Chat system prompt receives a teammate protocol only in that canonical session: `agent/system_prompt.py:625-659`, `apps/desktop/src/plugins/hermes-bots/plugin.js:5097-5160`.

### Mention paths

- Local `@bot` mentions are transformed into an instruction telling the current agent to launch `hermes -p <profile> chat ...` in the background: `plugin.js:11001-11098`.
- Remote Connection mentions use profile-scoped gateway RPC and canonical Bot Chat session handling: `plugin.js:3239-3280`.
- Bot-to-bot sender attribution is a textual prefix such as `Message from 🤖 name (@handle):`, not a cryptographically stamped actor.

This conflicts with AGK’s requirement that the kernel stamp sender identity from authenticated session state and classify peer text as `AGENT_GENERATED_CONTENT`.

### Group chats and routines

- Group rooms use hidden per-member sessions and deterministic rounds.
- They enforce participant/round/message/log caps, support `@user` clarification and approval routing, and persist room logs in plugin storage.
- They are a Desktop plugin orchestration surface, not a server-side governed message ledger.
- Routines are profile-scoped cron jobs, with `[bot:<name>]` compatibility namespacing: `plugin.js:7546-7694`.

### Cross-machine peers

`hermes peer dm` calls the remote API server and synchronously waits for the response: `hermes_cli/subcommands/peer.py:181-297`.

Consequences:

- The peer API key grants broad endpoint authority, not only DM rights.
- No live mid-turn interrupt crosses this path.
- Each call is an API invocation, not a persistent AGK actor-to-actor channel.

### Relay

Relay is the strongest managed-edge transport:

- Rebuilds normalized `MessageEvent` at the gateway boundary.
- Locally stamps `delivered_via_upstream_relay=True`, rather than trusting the wire to assert it.
- Supports multi-platform negotiated capabilities, reconnect, buffering/replay, inbound ACK, media, interrupt, and outbound request/result frames.
- Uses a per-gateway signed bearer on the WebSocket upgrade.

See `gateway/relay/ws_transport.py:9-27,212-319,500-557,623-827`.

Its frame schema is explicitly **experimental** and may change without deprecation: `gateway/relay/ws_transport.py:26-27`. It is not AGK’s runtime protocol: it lacks the AGK common Protobuf envelope, grants, fencing tokens, durable idempotency records, typed error taxonomy, and high-water event ledger.

## 8. AGK communication and event mapping

AGK canon keeps three distinct systems:

1. **Message Bus**: typed actor-to-actor traffic with ten kinds: `message`, `request`, `response`, `handoff`, `delegation`, `review_request`, `approval_request`, `escalation`, `broadcast`, `event`.
2. **Event Engine**: durable state-change facts with registered/versioned payloads.
3. **Runtime Protocol**: client/gateway/runtime control and stream envelopes.

References:

- Message Bus and cross-session trust: `doc/04-agents/02-teams-workforces-communication.md:179-265,319-355,405-425`.
- Event envelope: `doc/12-runtime/02-convex-backend-and-events.md:194-270`.
- Core event contracts: `doc/12-runtime/10-event-payload-contracts.md:93-230`.
- Runtime envelope: `doc/12-runtime/11-runtime-protocol-envelopes.md:15-137,222-282`.

### Recommended disposition

| Hermes construct | AGK role | Disposition |
|---|---|---|
| `BasePlatformAdapter` and registry | Connector/Adapter implementations | **Reuse** |
| `MessageEvent` | Edge-normalized inbound transport message | **Reuse, then wrap** |
| `SessionSource` | Channel/thread address and external identity evidence | **Reuse, never treat as ActorRef directly** |
| Hermes profile | Candidate persistent Agent runtime configuration | **Map through an explicit Agent/Oracle binding** |
| Session key/session id | Runtime Session binding | **Reuse operationally; never equate with Mission/Task** |
| `SendResult` | Provider delivery attempt | **Extend into typed AGK delivery receipt** |
| Delivery ledger | Local crash compensation | **Keep; do not substitute for Message Ledger** |
| Gateway/plugin lifecycle hooks | Runtime observation inputs | **Bridge into spans/domain mutations** |
| Bot Mode | Human-facing profile roster and lightweight collaboration UI | **Reuse UX, not internal Message Bus authority** |
| A2A | External-agent interoperability connector | **Reuse behind egress and governance broker** |
| Relay | Managed provider edge | **Reuse experimentally, isolate from AGK runtime protocol** |
| API server | Compatibility/control ingress | **Reuse as runtime service, not AGK authorization plane** |

### `MessageEvent` to AGK `MessageEnvelope`

The bridge should:

1. Resolve external platform identity to an AGK `ActorRef` through a `ConnectorBinding`; never accept a body-supplied sender.
2. Map platform/chat/thread/message identifiers to a channel/room address.
3. Default the communication kind to `message`. Only an explicit domain operation may create `handoff`, `delegation`, `approval_request`, etc.; do not infer ownership transfer from prose.
4. Map text/media to body and body references.
5. Attach Organization/Project scope, classification, retention, importance, and trust.
6. Mark agent-originated traffic `AGENT_GENERATED_CONTENT`: trusted provenance, untrusted instructional semantics.
7. Record `tokens_estimated` and per-recipient `tokens_loaded`.
8. Correlate request/response and idempotency independently of provider message IDs.
9. Deliver through an AGK communication-rights decision before invoking Hermes.
10. Persist a typed `MessageRecord`; retrieval, not delivery, decides what enters model context.

### Operator seed event mapping

The initial upgrade prompt’s event list is a seed, not current AGK canon. Current canonical contracts should govern:

| Requested seed | Hermes evidence | Canonical AGK mapping |
|---|---|---|
| `agent.created` | Profile/Bot creation, no normalized hook | New registered Agent mutation event |
| `agent.started/completed/failed` | `agent:start/end`, session hooks | Usually `run.started/completed/failed`; a persistent Agent does not “complete” with each turn |
| `task.created/assigned/completed` | Kanban claimed/completed/blocked and update hooks | Core `task.transitioned`; assignment also produces a typed `delegation` message where applicable |
| `tool.started/completed/failed` | Tool callbacks, stream events, pre/post tool hooks | ToolCall **Span telemetry**, not automatically a durable domain event |
| `oracle.decision` | No authoritative Hermes equivalent | Emit only from a committed AGK Decision mutation, never infer from chat text |
| `oracle.delegated` | No authoritative Hermes equivalent | Typed `delegation` message plus Task mutation |
| `artifact.created` | Hermes media/files are not AGK Artifacts | Exact canonical `artifact.created` only when Artifact storage and metadata commit |
| `memory.updated` | No dedicated normalized Hermes event | New Memory-engine mutation event |
| `knowledge.updated` | No dedicated normalized Hermes event | New Knowledge-engine mutation event |
| `workforce.deployed` | Bot roster is not a Workforce | New Workforce deployment mutation event |
| `evaluation.completed` | No gateway equivalent | Canonical noun is `Eval`; register an `eval.*` schema rather than `evaluation.*` |

The AGK core event set already defines `mission.created/completed`, `task.transitioned`, `run.started/completed/failed`, approval events, `oracle.escalated`, `artifact.created`, session/runtime events, budget threshold, and policy denial: `doc/12-runtime/10-event-payload-contracts.md:104-230`.

## 9. Extension points

- New platform: subclass `BasePlatformAdapter`, create `plugin.yaml`, and register through `PluginContext.register_platform`: `gateway/platforms/ADDING_A_PLATFORM.md`, `hermes_cli/plugins.py:2776-2856`.
- Registry extension fields include auth env names, setup/config bridges, limits, target parsers, target validators, cron home channel, custom delivery handler, and standalone sender: `gateway/platform_registry.py:62-229`.
- Platform-native events: `set_platform_event_handler`.
- Reactions: `set_reaction_handler`.
- Gateway lifecycle: `gateway/hooks.py` entry points/config modules.
- Agent lifecycle and policy middleware: `register_hook`, `register_middleware`.
- Inter-plugin events: `ctx.emit/subscribe`, suitable only for trusted, ephemeral local coordination.
- External notification: outbound webhooks.
- External-agent interoperability: A2A.
- Managed multi-platform edge: relay.
- Desktop/client control: TUI transport abstraction and authenticated dashboard WS mount.

## Verification and repository state

- Targeted Python audit suite: **344 passed**, with Trio-parametrized asyncio tests excluded.
- A2A plugin suites: **151 passed** in isolation.
- Selected Bot Mode Node suites: **96 passed**.
- The mixed Python run exposed four Trio/asyncio backend incompatibilities in MS Graph tests and one order-dependent A2A Agent Card skill test; the A2A test passed alone and the A2A suites passed together.
- No live external provider accounts or production webhooks were exercised; provider behavior conclusions are static code/test-backed.
- **Files created or modified by this audit: none.**
- Hermes `git status` currently reports `?? agk-upgrade/`, the supplied untracked audit-input tree; I did not create or modify it. The AGK source checkout at `a0a3284edfb21eeeec77d9e185b98ef05dbada0a` is clean.

[steer did not land — the subagent finished before it could be delivered: Stop further exploration now and return a grounded gateway/communication audit with exact refs, authz limits and AGK mapping.]