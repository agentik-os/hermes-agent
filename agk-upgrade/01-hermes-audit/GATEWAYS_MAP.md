# Hermes Gateways Map

## Core

`gateway/run.py::GatewayRunner` coordinates platform lifecycle, authorization, Session routing, Agent execution, slash commands, streaming, cron and maintenance. `gateway/platforms/base.py::BasePlatformAdapter` defines common behavior. `gateway/delivery.py` handles direct, home, explicit and cross-platform delivery.

Most adapters live in `plugins/platforms`; the static baseline has 22 plugin directories. Additional direct adapters live under `gateway/platforms`.

## Normalization

Raw platform events become `MessageEvent`. Session keys are built through `gateway/session.py`, not constructed manually. Running messages pass two guards so approvals, denials and stop commands reach the blocked Agent safely.

## Authorization

Platform allowlists, allow-all settings and pairing gate network callers. Within one authorized adapter set, Hermes does not provide per-caller AGK capabilities. Session ids are routing handles, not authorization.

## Hooks

Gateway lifecycle hooks cover startup, Session, Agent step and command events. They are separate from native plugin hooks and are not a durable event ledger.

## AGK mapping

ADAPT transports beneath canonical Actor, Message, Project and Organization policy. AGK stamps sender identity, classifies content, meters Context and records semantic messages. Gateway Sessions bind to canonical AGK Sessions. Direct raw gateways are disabled for governed deployments unless registered through the AGK Communication Adapter.

## High-risk boundaries

- Outbound A2A peer-card URLs need same-origin or explicit allowlist and egress enforcement. The audited path can select arbitrary HTTP targets and forward the configured bearer.
- API-server bearer authority is broad and its default Tool posture can include terminal, file, browser, delegation and cron. AGK requires per-Actor authorization above authentication.
- `tui_gateway/ws.py::handle_ws` relies on the official outer mount for authentication. Any new mount must reproduce ticket, Host, Origin and peer checks.
- Delivery is retry-aware but not universally exactly once. Ambiguous sends and partial attachment delivery need AGK reconciliation.
