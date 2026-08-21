## Audit scope

- **Hermes source:** `/Users/hacker/.hermes/hermes-agent` at `8794e5a21c980a0f26532cb4883284b786cb3f25`
- **AGK specification:** `/Users/hacker/Projects/AGK-OS` at `a0a3284edfb21eeeec77d9e185b98ef05dbada0a`
- Read-only source audit. No repository files were created or modified.
- Hermes currently has an unrelated untracked `agk-upgrade/` directory; this audit did not touch it. AGK was clean.

## 1. Hermes provider architecture

### Provider declaration and discovery

The declarative unit is:

- `providers/base.py::ProviderProfile`
- Key fields:
  - `name`, `aliases`, `api_mode`
  - `auth_type`, `env_vars`, `base_url`, `models_url`
  - `supports_health_check`
  - `supports_vision`
  - `supports_vision_tool_messages`
  - `supports_prompt_cache_key`
  - `fallback_models`
  - `default_max_tokens`, `default_aux_model`
- Provider hooks:
  - `resolve_aux_model`
  - `prepare_messages`
  - `build_extra_body`
  - `build_api_kwargs_extras`
  - `default_vision_model`
  - `fetch_models`
  - `transform_api_error_classification`

`ProviderProfile` is explicitly declarative and **does not own client construction, credentials, streaming, or retries** (`providers/base.py:1-9`).

Registry/discovery lives in `providers/__init__.py`:

- `register_provider`
- `get_provider_profile`
- `list_providers`
- `_discover_providers`
- `_discover_entry_point_providers`
- `_import_plugin_dir`

Discovery sources and precedence:

1. Enabled Python entry points in `hermes_agent.plugins`
2. Bundled `plugins/model-providers/<name>/`
3. `$HERMES_HOME/plugins/model-providers/<name>/`
4. Legacy `providers/*.py`

Registration is process-global and last-writer-wins. User filesystem profiles override bundled profiles; bundled profiles override pip entry points.

### Related but separate provider registries

Hermes does not actually have one complete provider object. Provider truth is spread across:

- `providers/__init__.py`: runtime profile registry
- `hermes_cli/providers.py::HERMES_OVERLAYS`: transport/auth/base-URL overlay
- `hermes_cli/auth.py::PROVIDER_REGISTRY`: credential/auth `ProviderConfig`
- `agent/models_dev.py`: models.dev provider/model metadata
- `config.yaml` custom providers
- `hermes_cli/runtime_provider.py`: special-case runtime resolution

This layering works, but it can drift. Examples:

- `openai-api`, `xai-oauth`, `lmstudio`, and `tencent-tokenhub` have auth/overlay runtime wiring but no bundled `ProviderProfile`.
- `custom` and `openrouter` have profiles but are handled specially rather than as ordinary `ProviderConfig` entries.
- `copilot-acp` has conflicting declarative views: profile default `chat_completions`, overlay `codex_responses`, and the operational path is an external app-server/ACP runtime.

The `models.dev` 109+ provider catalog must not be read as a list of first-class supported Hermes providers. Providers present only in metadata can become reachable through generic/custom configuration or user plugins, but are not equivalent to shipped profile/auth/runtime support.

## 2. First-class provider coverage

An isolated discovery run found **41 bundled profiles**. Adding four auth/overlay-only providers and the virtual MoA provider gives **46 source-grounded first-class runtime IDs**:

`actual`, `ai-gateway`, `alibaba`, `alibaba-coding-plan`, `anthropic`, `arcee`, `azure-foundry`, `bedrock`, `commandcode`, `commandcode-anthropic`, `copilot`, `copilot-acp`, `custom`, `deepinfra`, `deepseek`, `fireworks`, `gemini`, `gmi`, `huggingface`, `kilocode`, `kimi-coding`, `kimi-coding-cn`, `lmstudio`, `meta-ai`, `minimax`, `minimax-cn`, `minimax-oauth`, `moa`, `nous`, `novita`, `nvidia`, `ollama-cloud`, `openai-api`, `openai-codex`, `opencode-go`, `opencode-zen`, `openrouter`, `qwen-oauth`, `stepfun`, `tencent-tokenhub`, `upstage`, `vertex`, `xai`, `xai-oauth`, `xiaomi`, `zai`.

User and enabled pip plugins can extend or replace this list.

### Declared/default wire modes

| Mode | Providers |
|---|---|
| `codex_responses` | `actual`, `meta-ai`, `openai-api`, `openai-codex`, `xai`, `xai-oauth` |
| `anthropic_messages` | `anthropic`, `commandcode-anthropic`, `minimax`, `minimax-cn`, `minimax-oauth` |
| `bedrock_converse` | `bedrock`, with Claude additionally using the native Anthropic Bedrock adapter |
| External app-server/ACP | `copilot-acp` |
| Virtual Chat facade | `moa` |
| Default `chat_completions` | The remaining 32 IDs |

These are defaults, not immutable provider-wide facts. `hermes_cli/providers.py::determine_api_mode` and runtime branches can override them:

- Nous routes `anthropic/*` over Anthropic Messages.
- OpenCode Zen/Go are model dependent.
- Azure Foundry may use Chat, Responses, or Anthropic wire modes.
- Kimi Coding may use its Anthropic-compatible coding endpoint.
- Copilot can be model dependent.
- Bedrock Claude bypasses Converse for native Anthropic features.
- Custom providers are config/URL detected.
- MoA’s outer facade is always Chat while its internal aggregator may use another transport.

### Transport implementation

The normalized transport contract is `agent/transports/base.py::ProviderTransport`:

- `convert_messages`
- `convert_tools`
- `build_kwargs`
- `normalize_response`
- optional `validate_response`, `extract_cache_stats`, `map_finish_reason`

Registered implementations:

- `ChatCompletionsTransport` → `chat_completions`
- `AnthropicTransport` → `anthropic_messages`
- `ResponsesApiTransport` → `codex_responses`
- `BedrockTransport` → `bedrock_converse`

Factory: `agent/transports/__init__.py::{register_transport,get_transport}`.

`codex_app_server` is a separate agent runtime, not a normal `ProviderTransport`.

### Capability declarations actually present

The bundled-profile inventory showed:

- `supports_vision=True` only on `meta-ai` and `xiaomi`.
  - This field means provider-level acceptance of image content around tool results, not general per-model vision.
  - Per-model vision must still come from model metadata/probes.
- `supports_vision_tool_messages=False` only on `xiaomi`; all other profiles inherit `True`.
- `supports_health_check=False` only on `xiaomi`.
- No bundled profile sets `supports_prompt_cache_key=True`.
- Explicit default output caps:
  - `custom`, `qwen-oauth`: 65,536
  - `kimi-coding`, `kimi-coding-cn`: 32,000
  - `meta-ai`, `nvidia`: 16,384
  - others: unspecified/provider resolved
- `fallback_models` are emergency **model-picker catalog entries**, not operational failover.
- Provider auxiliary defaults are declared by profiles, but `agent/auxiliary_client.py` can override them through explicit task/provider configuration and runtime-main context.

Hermes profiles do **not** declare AGK-style normalized capabilities such as terminal ownership, resumability, checkpointing, subagents, MCP, hooks, or remote control. Those are properties of the agent runtime or provider-native application, not this inference-profile layer.

## 3. Runtime resolution and model routing

### Runtime resolution

Primary module: `hermes_cli/runtime_provider.py`.

Exact key functions include:

- `resolve_requested_provider`
- `resolve_runtime_provider`
- `_resolve_runtime_custom_provider`
- `_resolve_runtime_openrouter`
- `_resolve_runtime_openai_codex`
- `_resolve_runtime_anthropic`
- `_resolve_runtime_nous`
- `_resolve_runtime_copilot`
- `_resolve_runtime_bedrock`
- `_resolve_runtime_vertex`
- `_resolve_runtime_moa`
- `_resolve_runtime_default`

Requested provider precedence is approximately:

1. Explicit request
2. Configured `model.provider`
3. `HERMES_INFERENCE_PROVIDER`
4. Automatic provider resolution

Named custom providers are resolved before built-ins. Provider-disabled policy is checked before runtime construction. The result contains the resolved provider, requested provider, model, API mode, base URL, API key/token/callable, source, and credential-pool information.

Construction then crosses:

- `run_agent.py::AIAgent`
- `agent/agent_init.py::init_agent`
- `agent/transports.get_transport`
- provider-specific OpenAI, Anthropic, Bedrock, Vertex, MoA, or app-server clients

### Explicit model selection

CLI/gateway model resolution is centered in:

- `hermes_cli/model_switch.py`
  - `resolve_alias`
  - `resolve_model_for_provider`
  - `switch_model`
- `hermes_cli/model_catalog.py`
- `hermes_cli/model_effective.py::resolve_effective_model`
- `agent/agent_runtime_helpers.py::switch_model`

User aliases are checked before built-ins, so user aliases can shadow built-in names. Effective gateway selection supports session/channel/global override layers.

`agent_runtime_helpers.switch_model` performs an atomic live-agent swap:

- provider/model/base URL/API mode
- client rebuild
- credential-pool reload
- context-window recomputation
- compressor update
- prompt-cache policy recomputation
- reasoning-policy recomputation
- `_primary_runtime` replacement
- billing-route persistence

It rolls back the snapshot if client reconstruction fails.

### No semantic smart router

No general task-complexity or capability-based automatic model router was found. Hermes has:

- explicit default/model selection
- aliases and catalog normalization
- session/channel overrides
- provider detection
- fallback chains
- auxiliary-model selection
- MoA aggregation

The sparse `smart_model_routing` references do not implement an AGK-style classifier → requirements → candidate filters → ranked `ModelRoute`.

## 4. Failure recovery, fallback, and credential pools

### Error classification

`agent/error_classifier.py` defines:

- `FailoverReason`
- `ClassifiedError`
- `classify_api_error`

It distinguishes auth, permanent auth, billing, rate limit, upstream rate limit, overload, server error, timeout, TLS verification, context overflow, payload/image size, model missing, policy blocks, format faults, invalid encrypted content, multimodal tool-content incompatibility, thinking signatures, and provider-specific conditions.

Plugin hook `transform_api_error_classification` can override the built-in classification.

`agent/backend_identity.py` separates failure scope across:

- `FailureScope.MODEL`
- `FailureScope.CREDENTIAL`
- `FailureScope.ENDPOINT`

with `BackendIdentity`, `classify_failure_scope`, and candidate skip predicates.

### Operational fallback

Configuration:

- `hermes_cli/fallback_config.py`
  - `normalize_fallback_entry`
  - `normalize_fallback_chain`
  - `get_fallback_chain`
- `hermes_cli/fallback_cmd.py`

`get_fallback_chain` merges modern `fallback_providers` and legacy `fallback_model`.

Runtime:

- `agent/agent_runtime_helpers.py::try_activate_fallback`
- `restore_primary_runtime`
- `switch_model`

Fallback entries are tried in order. Activation rebuilds the destination client and context policy. The preferred primary runtime is restored for the next turn, so fallback is normally turn-scoped rather than permanent.

Important limitation: the chain is configuration-driven and does not itself enforce model capability, quality, privacy, or risk floors. A valid Hermes fallback can therefore be an impermissible AGK downgrade.

### Credential pool

Core modules:

- `agent/credential_pool.py`
  - `PooledCredential`
  - `CredentialPool`
  - `load_pool`
- `agent/credential_sources.py`
- `agent/credential_persistence.py`
- `agent/agent_runtime_helpers.py`
  - `recover_with_credential_pool`
  - `_swap_credential`
  - `sync_credential_pool_entry_id`
- `hermes_cli/auth.py`
  - `read_credential_pool`
  - `write_credential_pool`
  - `suppress_credential_source`

The pool tracks entries from API keys, OAuth stores, subscription tools, environment variables, and external sources. It persists health/status metadata, cooldowns and dead/quarantined states. Writes use file locking and merge concurrent additions and newer on-disk cooldowns.

Credential rotation and provider/model fallback are separate layers:

- Pool recovery swaps credentials within a provider runtime.
- Fallback changes provider/model runtime.

There is no central account concurrency reservation, quota ledger, subscription-headroom allocator, or multi-process admission controller. Each Hermes process works primarily from local persisted state and observed failures.

## 5. OAuth and credential handling

Primary modules:

- `hermes_cli/auth.py`
- `hermes_cli/auth_commands.py`
- `agent/anthropic_adapter.py`
- `hermes_cli/copilot_auth.py`

Grounded flows:

- `nous`: OAuth device flow, refresh handling, inference credential derivation
- `openai-codex`: external/device OAuth plus Codex auth-store import/refresh
- `qwen-oauth`: external Qwen credential store with runtime refresh
- `minimax-oauth`: OAuth flow plus `build_minimax_oauth_token_provider` for per-request refresh
- `xai-oauth`: device OAuth and refresh
- `anthropic`: API key plus Claude Code/setup-token/OAuth handling through `resolve_anthropic_token`, `build_anthropic_client`, `_is_oauth_token`
- `copilot`: GitHub/Copilot token exchange
- `copilot-acp`: externally authenticated process
- `bedrock`: AWS credential chain
- `vertex`: Google ADC/service-account token path
- `azure-foundry`: API key or Entra/`DefaultAzureCredential`

Persistence uses `$HERMES_HOME/auth.json`, version 1:

- atomic temporary-file replacement
- parent directory tightened to `0700`
- file mode `0600`
- cross-process locks
- corrupt-file preservation
- refresh tokens written back to the same source store

Credentials are permission-protected but not encrypted at rest by Hermes.

Profile isolation has an important exception: `auth.py::_load_provider_state_with_source` and `read_credential_pool` fall back read-only to the global Hermes root when a profile has no provider entry. Profile entries then shadow the global provider slice. A tenant runtime must therefore use a custom `HERMES_HOME` outside the standard `~/.hermes/profiles/...` tree, or an isolated OS `HOME`, if global credentials must be unreachable.

## 6. Cost, budget, reasoning, and context policies

### Pricing and cost

`agent/usage_pricing.py` defines:

- `UsageRecord`
- `PricingEntry`
- `CostResult`
- `normalize_usage`
- `get_pricing_entry`
- `estimate_usage_cost`
- `format_cost`

Pricing precedence is:

1. User custom-provider pricing
2. models.dev metadata
3. runtime/provider catalog pricing
4. Hermes official fallback snapshot
5. unknown

Usage normalizes input, output, cache read/write, and reasoning tokens.

Statuses are `actual`, `estimated`, `included`, and `unknown`, but the main agent path calculates estimated/included/unknown cost. `actual_cost_usd` exists in the session schema, but no provider-billing producer was found in the normal model-call path.

Providers marked included are:

`openai-codex`, `copilot`, `copilot-acp`, `qwen-oauth`, `xai-oauth`, `minimax-oauth`.

Native `anthropic` is not in that set, so Anthropic OAuth/subscription use can still receive API-style estimated cost.

There is **no hard session or mission USD spend ceiling** in Hermes. Cost guards in:

- `hermes_cli/model_cost_guard.py`
- `model_data_policy_guard.py`
- `model_selection_guards.py`

run around model selection and warnings; they are not per-call monetary reservations.

### Execution budgets

- `agent/iteration_budget.py::IterationBudget`
- `tools/budget_config.py::BudgetConfig`
- `hermes_cli/config.py::resolve_turn_limit`
- `agent/agent_init.py::_normalize_run_budget_seconds`

Current defaults/semantics:

- `agent.max_turns` is unlimited by default (`sys.maxsize`).
- Iterations/API calls consume `IterationBudget`.
- Delegated subagents receive a **fresh** budget (`tools/delegate_tool.py:1975`), not a shared parent budget.
- `run_budget_seconds` emits an 80% wrap-up instruction and caps some implicit stale-call timeouts. It is not a general hard wall-clock termination.
- Tool-output budgets truncate or spill large results; they are context-protection limits, not money/token-spend ceilings.

### Reasoning

Central policy:

- `hermes_constants.py::resolve_reasoning_config`
- `agent/reasoning_effort.py`
  - `normalize_effort`
  - `provider_effort_override`
  - `map_effort_for_provider`

Precedence:

1. Explicit session override
2. Per-model `model_overrides`
3. Global `reasoning_effort`
4. Transport/provider default

Internal effort ladder:

`none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra`.

Provider adapters map or clamp that ladder. Anthropic handling is in `agent/anthropic_adapter.py::build_anthropic_kwargs`:

- legacy manual budgets: low 4K, medium 8K, high 16K, xhigh 32K
- newer Claude/Kimi paths use adaptive thinking and `output_config.effort`
- unsupported levels are downgraded
- mandatory-thinking models may ignore an attempted disable

Specific fallback bug: the initial `_primary_runtime` snapshot in `agent/agent_init.py:3000` omits `reasoning_config`, while `agent_runtime_helpers.switch_model` adds it. A fallback from a freshly initialized agent can therefore restore the primary model without restoring its original reasoning policy unless an earlier live model switch populated that snapshot.

### Context and compression

Relevant modules:

- `agent/model_metadata.py::get_model_context_length`
- `agent/models_dev.py`
- `agent/context_engine.py::ContextEngine`
- `agent/context_compressor.py::ContextCompressor`
- `agent/agent_init.py`
- `agent/auxiliary_client.py`

Effective context resolution uses explicit config/custom-provider intent first, then runtime/catalog/model metadata and safe fallbacks.

Key built-in values:

- Unknown fallback context: 131,072
- Minimum accepted context: 4,096
- Standard compression threshold default: 50%
- Small contexts at or below 32,768 use an 80% threshold
- System prompt is implicitly protected
- First three non-system messages and last six messages are protected by default

`ContextEngine` supports:

- `select_context`
- `should_compress`
- `compress`
- `update_from_response`
- `on_turn_complete`
- tool-result pruning and lifecycle hooks

`select_context` is the right extension seam for a policy-aware local compiler, but it is explicitly fail-open: exceptions or invalid results send the original request unchanged.

Auxiliary model calls handle compression, vision, titles, extraction, and related tasks through `agent/auxiliary_client.py`; they have their own provider/fallback resolution and do not pass through the main `pre_api_request` lifecycle hooks.

## 7. Key Hermes limitations for AGK

1. **No one normalized provider SSOT.** Profiles, overlays, auth configs, models.dev, custom config, and runtime branches overlap.
2. **Capabilities are incomplete for AGK.** Provider profiles describe inference-wire quirks, not resumability, terminal, checkpointing, subagents, account rotation, or concurrency.
3. **No semantic model routing.** Hermes cannot produce AGK’s immutable classifier/filter/ranking `ModelRoute`.
4. **Fallback is not capability-preserving by itself.** It can silently select a weaker or policy-incompatible configured entry.
5. **Credential pools are reactive and local.** No atomic account admission reservation or central quota/subscription allocator exists.
6. **No hard monetary/token budget.** Cost is primarily post-call accounting.
7. **Lifecycle hooks are generally failure-isolated and fail-open.**
   - `pre_llm_call` only injects ephemeral context into the user message; it cannot route or veto.
   - `pre_api_request` is observer-only.
   - `ContextEngine.select_context` fails open.
8. **Auxiliary calls bypass main LLM hooks.**
9. **Codex app-server/ACP owns its internal tool loop.** Hermes observes projected tool events but does not run those operations through the normal `pre_tool_call` dispatch gate.
10. **Memory provider is not session-storage replacement.** `MemoryProvider` controls cross-session recall/sync, not `hermes_state.py` transcript persistence.
11. **No “resume from AGK Run step” contract.** Hermes resumes its own session/transcript state, not an arbitrary external checkpoint.
12. **Live `/model` mutation differs from AGK semantics.** Hermes changes model/provider in place under the same session; AGK specifies new Session identity for model/provider changes.
13. **Lazy provider discovery is process-global and unlocked.** `_discovered=True` is set before imports complete, allowing a concurrent first read to observe a partially populated registry.

## 8. AGK `AgentRuntime` and model-policy mapping

AGK is currently a **specification repository**, not an implementation:

- No `package.json`, `Cargo.toml`, TypeScript, or Rust runtime code was found.
- No `hermes.lock.json` exists.
- The only executable match is the feature-registry compiler.
- AD-312 in `doc/00-decisions.md` and `doc/00-canon.md` ratifies the **bounded Adapter boundary**, not a working runtime.

Status text is stale internally:

- `feature/F22-hermes-runtime.md` starts as `PROPOSED` but ends `RATIFIED, BOUNDED`.
- `feature/domains/D211-hermes-runtime-and-self-evolution.md` still says `PROPOSED` and that ratification is needed.
- Canon and AD-312 win.

### Concept mapping

| AGK concept | Hermes source | Mapping |
|---|---|---|
| `AgentRuntime(kind=hermes)` | `run_agent.AIAgent`, `tui_gateway.server`, NDJSON JSON-RPC over stdio | Feasible supervised-process adapter |
| `RuntimeAdapter` | Hermes version, JSON-RPC methods, health, configured feature denylist | Must be authored by AGK; not a Hermes `ProviderProfile` |
| `ProviderAdapter` | `ProviderProfile` + overlay + transport + model metadata | Wrap/normalize into AGK adapter; do not expose raw fields as complete AGK capabilities |
| `Model` registry | `models_dev`, `model_metadata`, provider catalogs, pricing | Import as declared data with source; AGK probes and measured performance remain separate |
| `ModelRoute` | No Hermes equivalent | AGK owns classifier, requirement gates, ranking, alternatives, and immutable reason vector |
| `ProviderAccount` router | `CredentialPool` is only a partial analogue | AGK must own account identity, quota, health, concurrency reservation, and five-outcome policy |
| `FallbackChain` | Hermes `fallback_providers` | Disable or compile strictly from an AGK capability-preserving bounded chain |
| `Reasoning policy` | `resolve_reasoning_config` and provider effort adapters | Compile AGK qualitative policy to Hermes effort; record adapter clamp/downgrade |
| `Context Plan/Manifest` | `ContextEngine.select_context` and `compress` | Better seam than `MemoryProvider`; requires an outer fail-closed check because Hermes fails open |
| `Budget` | `IterationBudget`, usage accounting | Hermes local guards are defense-in-depth only; AGK must reserve centrally before calls |
| OAuth/account linking | `hermes_cli.auth` implementations | Reuse protocol code if useful, but tokens must land in AGK vault, not Hermes `auth.json` |
| Run/Span telemetry | plugin hooks and JSON-RPC event stream | Convert into AGK records; Hermes transcript/trace remains noncanonical adapter state |

### Required changes to the F22 integration plan

The literal “four plugins, zero forks” plan is insufficient for the stated hard invariants unless AGK adds stronger outer boundaries:

1. **Route all main and auxiliary LLM calls through an AGK-controlled gateway**, ideally one logical Hermes profile per wire protocol. The gateway performs atomic budget/account admission and owns upstream credentials. Do not rely on `pre_llm_call`.
2. **Disable Hermes direct OAuth, credential pools, and operational fallback** in governed mode. Give Hermes one short-lived AGK gateway capability, never vendor credentials.
3. **Use a custom `ContextEngine` for AGK context compilation**, but require a gateway/supervisor-side signed Context Manifest check because the engine is fail-open.
4. **Use normal Hermes tool-loop transports only.** Disable `codex_app_server` and `copilot-acp` where every tool must pass `pre_tool_call`.
5. **Make every exposed AGK tool enforce permission again inside its own wrapper.** Plugin callbacks must catch AGK outages/timeouts and return an explicit block; an exception otherwise fails open.
6. **Treat Hermes SQLite as either an explicitly governed ephemeral runtime cache or add a new upstream session-store seam.** `MemoryProvider` cannot replace it. A strict “no second memory” rule is not achievable through the four named plugins alone.
7. **Have AGK own continuity.** Disable direct live `/model` switching for governed sessions; model/provider switches create a new AGK Session and a new/rebound Hermes process as AGK requires.
8. **Book usage at the AGK gateway**, not only `post_llm_call`, so retries, compression, vision, MoA, titles, and auxiliary work are all counted.
9. **Set explicit Hermes `max_turns`, spawn depth, and timeouts** as defense-in-depth even though AGK’s central Budget remains authoritative.
10. **Run each Hermes process under an isolated OS home or custom non-profile `HERMES_HOME`** to prevent global auth fallback.

### AGK specification conflict to settle

AGK currently gives two incompatible account-switch semantics:

- `D116-model-routing.md` says an account switch preserves Session ID and PTY and changes only the credential reference.
- `D117-provider-accounts-credential-routing.md` says live sessions are sticky and rotation affects the next bind, never the live one.

Hermes credential swapping matches the first and violates the second. This must be resolved before the adapter contract can define whether live credential rotation is permitted.

## Verification and issues

- Source-backed through direct reads, AST/introspection, and isolated provider discovery.
- Relevant provider tests inspected:
  - `tests/providers/test_provider_profiles.py`
  - `test_plugin_discovery.py`
  - `test_entry_point_discovery.py`
  - `test_e2e_wiring.py`
  - `test_transport_parity.py`
- No pytest suite was executed, preserving the strict read-only scope.
- Main blocker is not missing Hermes functionality but the absence of AGK implementation code and several F22 assumptions that exceed the actual plugin contracts.