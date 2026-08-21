# 001: AGK Surface Shell on Hermes Desktop

## Question

Given the existing Hermes Desktop plugin SDK, when the AD-314 interface shell is loaded in a separate preview app, can the user switch among Collective, Learn, Build, Deals and Evolve from the title bar, use the four Build modes, and see a genuinely different layout for each universe without patching Hermes core?

## Approach

The spike is a standalone runtime Desktop plugin. It uses only the public `@hermes/plugin-sdk`, React runtime and theme tokens.

It contributes:

- `/agk-prototype` as a full workspace route;
- `AGK Prototype` in the Hermes sidebar;
- `AGK Prototype: Open surface shell` in the command palette;
- a page-owned title bar switcher for Collective, Learn, Build, Deals and Evolve;
- five distinct universe specifications and layouts;
- Operate, Design, Code and Inspect modes inside Build;
- explicit `Visual spike` and `Build Gate · Closed` labels.

Hermes core product files are not patched. The installed runtime copy lives at:

```text
~/.hermes/desktop-plugins/agk-surface-prototype/plugin.js
```

The source of truth for the spike is `plugin.js` in this directory.

## Run

Install or refresh the plugin:

```bash
mkdir -p ~/.hermes/desktop-plugins/agk-surface-prototype
cp spikes/001-agk-surface-shell/plugin.js \
  ~/.hermes/desktop-plugins/agk-surface-prototype/plugin.js
```

Open Hermes Desktop, then select `AGK Prototype` in the sidebar. The app watches the plugin directory and hot reloads changes. If needed, run `Reload desktop plugins` from the command palette.

## Verification

### Static and behavioral

```text
node --check plugin.js: PASS
node --test plugin.test.mjs: 4/4 PASS
```

The tests prove:

- route, sidebar and command-palette registration;
- exactly five ratified universe IDs;
- distinct layout IDs and complete navigation, metrics, primary content and Context data;
- rejection of unknown universe IDs and Build modes.

### Real Hermes renderer

A separate Hermes Electron preview app was launched with its own `user-data-dir` and CDP on port 9345. `verify-cdp.mjs` clicked the real contributed sidebar route, switched all five title bar tabs, exercised all four Build modes, read the rendered DOM and captured each universe. The active Hermes app was not used as the preview surface.

```text
Collective -> network-hub         -> 3 metrics, 3 cards
Learn      -> learning-path       -> 3 metrics, 2 cards
Build      -> operating-center    -> 3 metrics, 3 cards, 4 modes
Deals      -> commercial-pipeline -> 3 metrics, 2 cards
Evolve     -> operator-evolution  -> 3 metrics, 2 cards
```

Screenshots:

- `screenshots/collective.png`
- `screenshots/learn.png`
- `screenshots/build.png`
- `screenshots/deals.png`
- `screenshots/evolve.png`

Visual inspection confirmed readable type, visible top tabs, distinct layouts, coherent Context rails and explicit prototype boundaries. The existing Hermes update notification was dismissed before the final captures.

## Verdict: VALIDATED

### What worked

- Hermes Desktop can host a convincing AGK surface shell through the public plugin SDK.
- The title bar contribution provides the ratified Collective, Learn, Build, Deals and Evolve tabs.
- Build exposes Operate, Design, Code and Inspect as nested modes.
- Each tab changes navigation, metrics, content structure, Context and page layout.
- The approach remains update-safe and avoids a Hermes core fork patch.
- The plugin hot loads in the existing default Hermes profile.

### What did not become real

- no AGK Control Plane or domain state;
- no governed Hermes Runtime adapter;
- no working Canvas, Project, Oracle, Team, Workforce or OS services;
- no canonical AGK Web or Tauri application;
- no Build Gate authorization.

### Recommendation for the real build

Use this spike to validate the AD-314 information architecture and visual hierarchy only. Keep the plugin as a reviewable prototype while AGK-OS reconciles F22, the Runtime security boundary and the fork role. Do not promote the mocked values or this Electron route into canonical AGK product state.
