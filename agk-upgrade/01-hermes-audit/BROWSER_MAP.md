# Hermes Browser Map

## Built-in browser stack

Primary source paths are `tools/browser_tool.py`, `agent/browser_provider.py`, `agent/browser_registry.py`, `tools/browser_supervisor.py`, `tools/browser_cdp_tool.py`, `tools/browser_dialog_tool.py` and browser provider plugins.

Capabilities include local Chromium and Lightpanda, cloud providers, accessibility snapshots, ref-based actions, screenshots, vision, console evaluation, images, recording, dialogs, frame tracking and raw CDP.

## URL and output controls

Hermes blocks recognized credentials in URLs, credential-like query parameters on cloud browsers, private destinations in non-local modes, website policy denials and metadata endpoints. Hermes-owned HTTP clients can use DNS and IP safety transports. Browser, console and CDP output is redacted.

## Security limits

- local browser plus local terminal intentionally permits private-network access;
- browser navigation still has DNS time-of-check versus use risk;
- current-page private URL probes can fail open on probe errors;
- JavaScript evaluation restrictions are optional;
- raw CDP is intentionally broad and its guard is best-effort;
- cloud-configured private navigation may route to a local sidecar;
- browser dialog support and provider CDP routing have implementation constraints not fully expressed by generic docs.

## `browser_exec`

`tools/browser_use_cli.py::browser_exec` sends model-authored Python to Browser Use CLI. It shares host filesystem authority and browser credentials. Literal URL scanning does not constrain dynamically constructed URLs, subprocesses, filesystem access or other Python networking. It has no whole-script approval equivalent to `execute_code`.

`browser_exec` is therefore a trusted optional execution feature, not a browser-only capability or sandbox.

## AGK decision

Reuse BrowserProvider, supervisor, semantic actions and screenshots. Governed Browser and Browser Use execution run inside the same whole-process sandbox, egress Policy, Connector grants and secret scope as other arbitrary code. Raw CDP and Python Browser Use are disabled by default for untrusted or multi-tenant workloads.

Runtime capability negotiation reports local or cloud provider, private-network reachability, CDP, dialogs, download, recording and evaluation restrictions. AGK authorization is evaluated per action and does not infer safety from a configured provider.
