# Hermes Files Modified

No Hermes production file has been modified during the architecture phase.

| File | Reason | AGK requirement | Adapter impossible | Conflict risk | Status |
|---|---|---|---|---|---|
| None | Analysis and architecture only | D-009 | Not applicable | None | CLOSED |

Files created under `agk-upgrade/**` are AGK architecture artifacts and do not change Hermes runtime behavior.

## Required update format

Every future row records:

- exact file and symbols
- direct reason
- linked implementation task
- supported extension paths evaluated
- why an adapter or plugin was insufficient
- tests added
- expected upstream conflict class
- rollback commit or feature gate

A generated diff check must fail when a modified Hermes production path lacks a row here.
