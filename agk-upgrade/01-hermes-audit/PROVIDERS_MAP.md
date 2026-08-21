# Hermes Providers Map

## Registry and resolution

Provider profiles register through `providers/__init__.py` and bundled directories under `plugins/model-providers`. `hermes_cli/runtime_provider.py` resolves provider, API mode, endpoint and credential source. `hermes_cli/auth.py` and `agent/credential_pool.py` provide authentication and pooled credential behavior. `agent/auxiliary_client.py` resolves task-specific models.

The static baseline contains 36 provider plugin directories and 41 literal bundled provider registrations. The registry supports native Anthropic Messages, OpenAI-compatible Chat Completions, Codex Responses and additional transports such as Bedrock.

Independent discovery found 41 bundled Provider profiles and additional auth-only or virtual runtime ids. Directory count, profile count and supported runtime id count are different facts. models.dev catalog entries are not equivalent to first-class Hermes support.

## Capabilities

- named provider plugins and user overrides
- custom OpenAI-compatible endpoints
- OAuth and file-based credentials
- credential pools and rotation
- ordered fallback providers
- auxiliary task routing
- reasoning configuration and model metadata
- provider-specific API modes

## Limits

Provider selection does not know AGK Organization, Budget or Policy. Subagents do not automatically inherit every fallback behavior. Endpoint and credential isolation must remain explicit.

## AGK decision

REUSE provider resolution and transports. AGK owns Provider Account records, route policy, Budget, explanation and permission. The adapter executes an approved route, records the resolved endpoint and accounts every model call including AgentCalls.

Hermes does not implement a general semantic task router that derives capability requirements and ranks allowed models. AGK must add that decision layer while retaining Hermes transports, fallback and credential rotation.
