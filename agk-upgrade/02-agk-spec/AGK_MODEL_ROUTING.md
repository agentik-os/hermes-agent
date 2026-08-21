# AGK Model Routing

## Separation

Model, provider, Provider Account, credential reference, routing policy, Runtime and Agent are distinct.

## Routing policy

A policy may consider preferred and fallback models, task class, capability requirements, context size, reasoning level, cost ceiling, latency preference, privacy, provider health, quota, geography and environment.

The result records selected provider and model, reason, alternatives, policy version and qualitative confidence. Standard UX does not show a false precision percentage.

## Hermes mapping

Reuse provider plugins, `hermes_cli/runtime_provider.py`, `hermes_cli/auth.py`, credential pools, fallback chains and auxiliary routing. AGK owns account identity, Budget reservation, policy and audit. The adapter supplies the selected route or requests a compatible route and records the resolved result.

## Failure

A provider failure may rotate a credential, use an allowed fallback or stop. A fallback cannot silently violate data retention, cost, model capability or Organization policy.

Whether a live Session may rotate Provider Account credentials is unresolved in the pinned source corpus. Until ratified, governed Sessions remain sticky and a route change creates a new binding or Session according to the final contract.

## Security

Credentials remain references resolved by the secret broker. Provider selection cannot cause one provider's credential to be sent to another endpoint.
