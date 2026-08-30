## Audit outcome

Audited Hermes at commit `8794e5a21c98`, including the required `apps/desktop/AGENTS.md` and `apps/desktop/DESIGN.md`.

**Bottom line:** Hermes Desktop is the strongest reusable host for AGK. It already has a contribution-driven shell, durable routes, a draggable/persisted pane tree, multi-session/profile routing, Projects, Files/Review/Terminal/Preview, and a runtime UI SDK. AGK surface switching should be **renderer presentation state**, not a backend/profile/toolset switch, so active sessions and prompt caches remain intact.

## Architecture and state authority

| Surface | Architecture and authority | Navigation/layout | Main limitation |
|---|---|---|---|
| **Electron Desktop** | Electron owns machine/runtime capabilities; React renderer owns navigation and presentation; agent backend owns sessions, tools, model execution and streams (`apps/desktop/AGENTS.md:11-25`). Electron launches headless `hermes serve`, falling back to legacy `dashboard --no-open` for old runtimes (`electron/backend-command.ts:1-37`). Renderer is sandboxed behind `window.hermesDesktop` (`electron/preload.ts:12-484`; `electron/session-windows.ts:46-55`). | Hash router; durable pages, route overlays, session routes, contributed routes; full draggable pane tree and presets. | Richest surface, but much of its shell is Desktop-specific rather than shared with web/TUI. |
| **`@hermes/shared`** | Small pure substrate: backend scope keys, JSON-RPC WS client, WebSocket auth/URL resolution, skins, billing, cron-trigger guard (`apps/shared/src/index.ts:1-114`). Used by Desktop, web, and TUI package manifests. | None. | It is **not** shared UI, route, project, or pane state. Cross-surface UX remains separately implemented. |
| **Web dashboard** | React/Vite SPA served by the FastAPI `hermes_cli.web_server`; management pages use REST. Chat is an xterm-hosted Ink TUI over `/api/pty`, with `/api/ws`/event sidecars for structured state (`web/src/pages/ChatPage.tsx:1-17`; `web_server.py:16944-17150`). | React Router sidebar pages; plugins may add or override routes. Chat remains mounted after first activation so its PTY survives route changes (`web/src/App.tsx:138-182,791-818`). | Page-oriented, no pane/layout tree. Chat is a terminal embedding, not Desktop’s native React chat. |
| **Ink TUI** | TypeScript/Ink UI spawns `python -m tui_gateway.entry`; newline JSON-RPC over stdio, with optional WebSocket attach (`ui-tui/README.md:9-34`; `ui-tui/src/gatewayClient.ts:345-423,523-548`). Python owns agent/session work; nanostores own ephemeral UI (`ui-tui/src/app/uiStore.ts:10-53`). | One chat shell with overlays, one modal widget, ambient docks and reserved side rails (`ui-tui/src/sdk/host.tsx:20-130,207-285`). | No route/page system or multi-pane workbench. Widget SDK has UI/charts but no Desktop-like `host.request`/state API. |
| **Classic CLI** | Large prompt-toolkit `HermesCLI` directly orchestrates `AIAgent`, conversation memory and modals (`cli.py:4970-5010,5370-5451,17344+`). | Single REPL with inline modal states and slash commands. `--cli` versus `--tui` is decided at launch (`hermes_cli/main.py:2889-2929,3180-3211`). | No live surface switching, route model, panes, or public UI-extension SDK; the implementation remains a ~21k-line monolith. |
| **ACP** | Stdio ACP server wraps `AIAgent` directly and persists ACP sessions in the shared profile `state.db` (`acp_adapter/entry.py:220-278`; `acp_adapter/session.py:186-242,401-456`). | Host editor owns all navigation/layout. Hermes exposes sessions, models, approval modes, commands, tool progress and streaming. | No Hermes shell or surface-switch concept. Only image prompt capability plus session load/list/resume/fork are advertised (`acp_adapter/server.py:1295-1327`). |

### Canonical state

- `$HERMES_HOME/state.db` is the canonical cross-surface session/message store, using WAL, FTS5, source tags, and lineage (`hermes_state.py:3-15,349-396`).
- Desktop renderer state is explicitly a cache of backend truth; Electron is authoritative for machine facts; renderer-only presentation belongs in nanostores/local persistence (`apps/desktop/AGENTS.md:27-46,58-77`).
- Session identity is intentionally split into durable stored ID, live runtime ID, and lineage root (`apps/desktop/AGENTS.md:48-56`).
- Desktop’s gateway registry supports a primary socket plus concurrent secondary sockets per profile/source, so background sessions continue streaming (`apps/desktop/src/store/gateway.ts:10-18,90-121,241-280`).
- Switching connection/profile is a “re-home,” not a reboot; soft connection switches, runtime-home switches, and live profile swaps have different semantics (`apps/desktop/AGENTS.md:79-101`).

## Desktop navigation, layout, and panes

- `HashRouter` owns navigation (`apps/desktop/src/main.tsx:16-21,71-83`).
- Built-in routes include Chat, Skills, Messaging, Artifacts, Settings, Command Center, Cron, Profiles, Agents, Starmap and Webhooks (`apps/desktop/src/app/routes.ts:9-21,59-71`).
- Full pages render inside the `workspace` pane; designated overlays float above the current route (`routes.ts:122-137,202-246`; `DESIGN.md:46-68`).
- Plugin routes are one-segment absolute paths with no parameters and cannot override reserved built-in paths (`routes.ts:76-100`).
- The layout is a persisted split/group tree: weighted row/column splits, tab groups, minimized zones, header visibility, center/edge drops, multi-tab movement and horizontal mirroring (`components/pane-shell/tree/model.ts:1-14,18-74,233-289,545-562`).
- Core presets are:
  - `default`
  - `focus`
  - `terminal-deck`
  - `quad`  
  (`app/contrib/controller.tsx:369-429`)
- User layouts and plugin layouts share the contribution registry and can persist as named presets (`components/pane-shell/tree/presets.ts:1-17,31-111`).
- Panes remain mounted when hidden where state must survive. The terminal explicitly keeps xterm and PTYs alive after first opening (`right-sidebar/terminal/persistent.tsx:16-21,64-82,286-293`).
- Session tiles are first-class persisted layout panes, each subscribing to independent runtime state (`store/session-states.ts:1-17,468-510`).

### Files / Git / Terminal / Review

**Reusable for AGK Build and Inspect:**

- Files are scoped to the active session cwd; raw per-session folder picking was intentionally replaced by Projects (`right-sidebar/index.tsx:28-51,143-147`; `DESIGN.md:63-64`).
- Filesystem reads/writes and Git operations route locally through Electron or to the active remote backend through mirrored REST APIs (`lib/desktop-fs.ts:60-150`; `lib/desktop-git.ts:13-47`).
- Review provides changed-file list/diff, stage, unstage, revert, commit, push and PR creation. Its canonical scope is currently **uncommitted changes only** (`store/review.ts:18-25,121-223,396-463`).
- Terminal PTYs are Electron-owned and can use a remote shell only when the connection is SSH (`electron/terminal-ipc.ts:286-335`; `electron/main.ts:9076-9105`).

**Limits:**

- Remote filesystem rename, trash and Finder/Explorer reveal remain local-only (`desktop-fs.ts:153-179`).
- Remote Git lacks PR-comment fetching, and repo scanning is a no-op because the backend supplies session-derived discovery (`desktop-git.ts:99-108`).
- Token/OAuth URL remotes do not provide a remote interactive terminal; the embedded terminal remains local. SSH connections do.
- Files and Review are cwd/project-gated; detached chats honestly expose neither.

## Projects versus workspaces

- A **Project** is a named, explicit, multi-folder, per-profile object stored in `$HERMES_HOME/projects.db`; it is distinct from old inferred “workspaces” and from Kanban’s board DB (`hermes_cli/projects_db.py:1-21,44-50,57-96`).
- Project membership is longest-prefix folder matching (`projects_db.py:774-803`).
- The authoritative project → repo → lane → session tree is built backend-side in `tui_gateway/project_tree.py`, including explicit projects, auto-discovered repos, worktrees and the synthetic `Home` bucket (`project_tree.py:1-25,559-590,619-793`).
- Desktop atoms are cached views; `projects.tree` and `projects.project_sessions` are authoritative RPCs (`store/projects.ts:35-52,473-578`; `tui_gateway/methods_config.py:117-169`).
- Desktop project scope is renderer presentation state; the active-project pointer is durable backend state (`store/projects.ts:143-171`).
- Project mutations are unavailable while viewing all profiles because persistence belongs to one profile (`store/projects.ts:350-364`).
- Classic CLI has complete `hermes project` CRUD (`hermes_cli/projects_cmd.py:22-105`).
- TUI currently displays the resolved Project name in status chrome but has no Project browser/switcher (`ui-tui/src/domain/paths.ts:18-43`; `useMainApp.ts:1237-1241`).
- Web dashboard and ACP currently have no first-class Projects UI.

## Desktop plugin SDK and extension seams

The Desktop shell itself is contribution-driven; core and plugins use the same registry (`src/app/index.tsx:1-6`; `contrib/registry.ts:14-33,40-71`).

Useful public seams:

- `panes`
- full-page `routes`
- `sidebar.nav`
- `statusBar.left/right`
- `titleBar.left/center/right`
- command palette and keybinds
- themes
- composer slots/middleware
- transcript directives  
  (`website/docs/developer-guide/desktop-plugin-sdk.md:200-215`)
- `host.state.*`, gateway RPC, events, navigation, native notifications, plugin-local storage/i18n, React Query, and native UI primitives (`apps/desktop/src/sdk/index.ts:383-445,741-870,875-999`).
- Runtime plugin files hot-load from either:
  - `$HERMES_HOME/desktop-plugins/<id>/plugin.js`
  - `$HERMES_HOME/plugins/<id>/desktop/plugin.js`  
  (`contrib/runtime-loader.ts:13-28,211-227,421-509`).

Important constraints:

- The top-bar seam for a persistent switcher is a **render contribution** to `TITLEBAR_AREAS.center`; the core currently leaves center empty (`app/contrib/controller.tsx:254-257,855-875`).
- Desktop plugins cannot override built-in routes.
- The public SDK does **not** expose layout-preset application. That capability exists internally as `applyDesktopLayoutPreset()` (`store/pane-focus.ts:35-56`) and through the agent’s `apply_layout` tool. A plugin can contribute a preset for the picker, but cannot programmatically activate it through public SDK.
- `Contribution.when()` is not reactive unless another registry mutation rebuilds the area (`contrib/types.ts:28-32`).
- Disk plugins may import only `@hermes/plugin-sdk`, React and React JSX runtime (`contrib/runtime-loader.ts:59-85,120-126`).
- Plugins run as ESM in the renderer with **full app authority**; boundaries isolate failures, not capabilities (`contrib/runtime-loader.ts:18-28`).
- Desktop, dashboard and Python plugin APIs are unrelated; only `/api/plugins/<id>` backend namespaces are shared (`desktop-plugin-sdk.md:23-32`).

The web dashboard has a separate extension system: same-realm script bundles can add/override routes and populate shell/page slots (`web/src/App.tsx:256-368`; `web/src/plugins/slots.ts:16-94`). SRI is optional, and scripts execute in the dashboard realm (`web/src/plugins/usePlugins.ts:96-153`).

## Recommended AGK reuse

| AGK posture | Reuse |
|---|---|
| **Operate** | Desktop session/profile/connection authority, Projects overview, status bar, Command Center, Cron/Messaging/Agents overlays; web dashboard’s Profiles, Channels, Cron, System and management REST pages. |
| **Build** | Desktop `workspace` plus Files, Review, Terminal and Preview panes; worktree creation and project-root cwd; `terminal-deck`/`quad` layouts. Use ACP when the actual build surface should remain the user’s IDE rather than recreating an editor. |
| **Inspect** | Review/diff, file preview/editor, Logs pane, Artifacts, Starmap, session usage/status, plus dashboard Analytics/Logs/Sessions. Preserve the existing canonical pane names beneath an “Inspect” umbrella. |

### Surface switching

1. Keep **product surface** and **workspace posture** as separate concepts.
2. For a fast Desktop prototype:
   - permanent switcher in `TITLEBAR_AREAS.center`;
   - full destinations through `ROUTES_AREA`;
   - plugin-local atom/storage for selected AGK surface;
   - `host.navigate()` on explicit user selection.
3. Do not change profile, connection, toolsets or system prompt when switching AGK surfaces. That would conflate presentation with backend authority and can invalidate prompt caching.
4. Preserve the shell and expensive panes; routes should change what `workspace` renders while Terminal/Preview/etc. retain lifecycle.
5. If each AGK posture must activate a layout automatically, expose the existing internal preset resolver as a narrow generic SDK action rather than reaching into internals.
6. On web, use ordinary routes plus a header slot; persistent Chat already survives route changes.
7. TUI can approximate switching with slash commands or one modal widget; classic CLI cannot support a true live workbench switch. ACP must let the editor host render the switcher.

## Canonical naming conflicts

Do **not** silently equate the two taxonomies in the request:

- AGK postures: **Operate / Build / Inspect** — three concepts.
- Target switcher: **Collectif/Learn / Build / Deals / Self** — four labels.

Recommended separate IDs, for example:

- `agk.surface.collectif`, `agk.surface.build`, `agk.surface.deals`, `agk.surface.self`
- `agk.posture.operate`, `agk.posture.build`, `agk.posture.inspect`

Additional conflicts:

- **Project** already means the durable named multi-folder entity.
- **workspace** already means cwd and the main Desktop pane; do not reuse it for an AGK product surface.
- **profile** means an isolated `$HERMES_HOME`.
- **mode** already means connection mode and, in ACP, edit-approval mode.
- **Learn** overlaps existing `/api/learning`, Skills/memory learning data and Starmap.
- **Inspect** should remain an umbrella over canonical `review`, `preview`, `files`, and `logs`, not rename those panes.
- Preserve the exact token **Collectif**; do not normalize it to “Collective” without an explicit product decision. Also decide whether `Collectif/Learn` is one label, two aliases, or two surfaces before assigning a canonical route/id.

## Repository state / issues

- **Files created or modified:** none.
- Verified no tracked or staged diff.
- Pre-existing untracked `agk-upgrade/` remained untouched.
- Live documentation leaf extraction returned 403; the docs index, required in-repo docs, and source were available.
- Minor source-doc drift: TUI widget comments describe corner widgets as overlays, but the implemented host reserves side-rail width (`ui-tui/src/sdk/types.ts:57-73` vs. `sdk/host.tsx:249-285`).