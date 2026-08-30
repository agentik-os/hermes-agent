import { host, PALETTE_AREA, requestTheme, THEMES_AREA } from '@hermes/plugin-sdk'

const ID = 'agk-cursor'
const STYLE_ID = 'agk-cursor-layout-v1'

// AGK Cursor = the Cursor (Anysphere) visual language on the Hermes layout.
// Sampled from the user's own Cursor screenshot (dark mode) and ported as a
// structural contract, not a hex costume:
//
//   1. WARM CHARCOAL, not cool zinc. The dark canvas is ~#1a1a18 (a hair warm),
//      and the SIDEBAR IS DARKER THAN THE CANVAS (~#141413) — the inverse of
//      the zinc theme, where the sidebar is a lighter card. One canvas for
//      shell + titlebar + chat; the sidebar reads as its own darker rail.
//   2. FLAT, borderless chrome. No hairlines between zones; separation is done
//      by surface value alone. Elevation is a single soft shadow, reused.
//   3. VIOLET IS A STATE, NEVER A FILL. Cursor spends its periwinkle/violet
//      (#7c6ff0 family) only on git-branch markers, active states and small
//      glyphs. Buttons stay ink-on-surface; the accent never paints a button.
//   4. PILLS AND SOFT CHIPS. The composer is a fully-rounded pill (~26px),
//      user turns are rounded charcoal chips, code chips are small quiet
//      rounded rectangles — never bordered slabs.
//   5. Quiet, slightly warm text ramp: #ececec primary, ~#9a9a94 secondary.
const theme = {
  name: ID,
  label: 'AGK Cursor',
  description: 'Cursor visual language: warm charcoal canvas, darker sidebar rail, violet state accent, pill composer',
  typography: {
    fontSans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
    fontMono: '"SF Mono", Menlo, Monaco, Consolas, monospace'
  },
  colors: {
    background: '#f7f7f5',
    foreground: '#1a1a18',
    card: '#ffffff',
    cardForeground: '#1a1a18',
    muted: '#efefed',
    mutedForeground: '#6b6b66',
    popover: '#ffffff',
    popoverForeground: '#1a1a18',
    primary: '#1a1a18',
    primaryForeground: '#f7f7f5',
    secondary: '#ececea',
    secondaryForeground: '#2a2a28',
    accent: '#e8e8e6',
    accentForeground: '#1a1a18',
    border: '#dcdcd8',
    input: '#d8d8d4',
    ring: '#6c6cf5',
    midground: '#57574f',
    midgroundForeground: '#ffffff',
    composerRing: '#6c6cf5',
    destructive: '#c73a3a',
    destructiveForeground: '#ffffff',
    sidebarBackground: '#ededeb',
    sidebarBorder: '#e0e0dc',
    userBubble: '#ececea',
    userBubbleBorder: '#ececea'
  },
  darkColors: {
    background: '#1a1a18',
    foreground: '#ececec',
    card: '#222220',
    cardForeground: '#ececec',
    muted: '#262624',
    mutedForeground: '#9a9a94',
    popover: '#232321',
    popoverForeground: '#ececec',
    primary: '#ececec',
    primaryForeground: '#161614',
    secondary: '#2b2b29',
    secondaryForeground: '#e4e4e2',
    accent: '#333331',
    accentForeground: '#f0f0ee',
    border: '#2e2e2c',
    input: '#333331',
    ring: '#8b83f7',
    midground: '#c9c9c4',
    midgroundForeground: '#161614',
    composerRing: '#8b83f7',
    destructive: '#e5484d',
    destructiveForeground: '#ffffff',
    sidebarBackground: '#141413',
    sidebarBorder: '#232321',
    userBubble: '#242422',
    userBubbleBorder: '#242422'
  }
}

const css = `
:root[data-hermes-theme='agk-cursor'] {
  --radius-scalar: 0.8;
  --dt-spacing-mul: 1.03;
  /* Keep theme geometry coupled to the native titlebar constants. */
  --titlebar-control-size: 24px;
  --conversation-text-font-size: 0.9375rem;
  --paragraph-gap: 0.9rem;
  /* Cursor state accent: periwinkle/violet. Used ONLY for markers, focus and
     small glyphs — never as a button fill. */
  --cursor-accent: #7c6ff0;
  --cursor-accent-soft: rgb(124 111 240 / 16%);
  /* Opaque fallback for DOM layers and non-canvas terminal paths. */
  --ui-terminal-surface-background: var(--cursor-raised);
}

:root[data-hermes-theme='agk-cursor'][data-hermes-mode='light'] {
  --dt-background: #f7f7f5 !important;
  --background: #f7f7f5 !important;
  --sidebar: #ededeb !important;
  --popover: #ffffff !important;
  --cursor-shell: #f7f7f5;
  --cursor-rail: #ededeb;
  --cursor-raised: #ffffff;
  --cursor-hover: rgb(26 26 24 / 5%);
  --cursor-active: #e4e4e0;
  --cursor-selected: #e2e2de;
  --cursor-chip: #ececea;
  --cursor-hairline: #e3e3df;
  --cursor-ink-soft: #6b6b66;
  --cursor-composer: #ffffff;
  --cursor-composer-focus: #ffffff;
  --cursor-send: #1a1a18;
  --cursor-send-ink: #f7f7f5;
  --cursor-send-idle: #d8d8d4;
  --cursor-send-idle-ink: #ffffff;
  --cursor-lift: 0 1px 2px rgb(20 20 18 / 5%), 0 8px 24px rgb(20 20 18 / 6%);
}

:root[data-hermes-theme='agk-cursor'][data-hermes-mode='dark'] {
  --dt-background: #1a1a18 !important;
  --background: #1a1a18 !important;
  --sidebar: #141413 !important;
  --popover: #232321 !important;
  --cursor-accent: #8b83f7;
  --cursor-shell: #1a1a18;
  --cursor-rail: #141413;
  --cursor-raised: #222220;
  --cursor-hover: rgb(236 236 236 / 6%);
  --cursor-active: #2b2b29;
  --cursor-selected: #2e2e2c;
  --cursor-chip: #242422;
  --cursor-hairline: #2a2a28;
  --cursor-ink-soft: #9a9a94;
  --cursor-composer: #242422;
  --cursor-composer-focus: #292927;
  --cursor-send: #ececec;
  --cursor-send-ink: #161614;
  --cursor-send-idle: #3a3a38;
  --cursor-send-idle-ink: #8f8f89;
  --cursor-lift: 0 1px 2px rgb(0 0 0 / 26%), 0 10px 30px rgb(0 0 0 / 30%);
}

/* ── Shell ─────────────────────────────────────────────────────────────────
   ONE warm charcoal canvas for shell, titlebar and chat. The sidebar is the
   DARKER rail (Cursor's signature inversion). Panes are rounded cards on the
   canvas with a small uniform gutter; no borders anywhere. */
:root[data-hermes-theme='agk-cursor'] body,
:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] {
  letter-spacing: -0.004em;
  background-color: var(--cursor-shell) !important;
  background-image: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:has(> [data-tree-split]),
:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:has(> [data-tree-group]) {
  padding: 0 8px 8px;
  background: transparent;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-split] {
  gap: 8px;
}

/* The content pane is the raised card; no borders, no seams. */
:root[data-hermes-theme='agk-cursor'] [data-tree-group] {
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: var(--cursor-raised) !important;
  box-shadow: none !important;
}

/* The sidebar drops to the DARKER rail colour — Cursor's inverted hierarchy. */
:root[data-hermes-theme='agk-cursor'] [data-tree-group]:has([data-slot='sidebar']) {
  background: var(--cursor-rail) !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-wrapper'],
:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar'] {
  background-color: var(--cursor-rail) !important;
}

/* Nested trees are content, never a second card. */
:root[data-hermes-theme='agk-cursor'] [data-project-tree],
:root[data-hermes-theme='agk-cursor'] [data-project-tree] > div,
:root[data-hermes-theme='agk-cursor'] [data-tree-group] aside,
:root[data-hermes-theme='agk-cursor'] [data-tree-group] > div:has(> [data-project-tree]) {
  background: transparent !important;
}

/* ── Titlebar ──────────────────────────────────────────────────────────────
   Same geometry contract as the AGK theme, read from Electron source:
   TITLEBAR_HEIGHT = 34, traffic lights centre at 17px; the 24px control row
   must centre on that axis. */
:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:first-of-type {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  min-height: 34px;
  padding-block: 0;
  box-sizing: border-box;
  background: var(--cursor-shell) !important;
  border-bottom: 0;
}

:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:first-of-type > div {
  display: flex;
  align-items: center;
  align-self: center;
  height: 24px;
  gap: 8px;
}

:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:first-of-type > div > * {
  align-self: center;
}

:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:first-of-type button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border-radius: 7px !important;
  box-shadow: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-contrib-shell] > div:first-of-type button:hover {
  background-color: var(--cursor-hover) !important;
}

/* ── Sidebar ───────────────────────────────────────────────────────────────
   Cursor rows: quiet, compact, rounded-8, hover is a whisper. The active row
   is a slightly lighter charcoal chip with a VIOLET marker on the leading
   edge — the one place the state accent shows in navigation. */
:root[data-hermes-theme='agk-cursor'] [data-sidebar] ul,
:root[data-hermes-theme='agk-cursor'] [data-sidebar] [role='list'],
:root[data-hermes-theme='agk-cursor'] [data-sidebar] nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

:root[data-hermes-theme='agk-cursor'] [data-sidebar] a,
:root[data-hermes-theme='agk-cursor'] [data-sidebar] button:not([class*='bg-primary']):not([data-sidebar-compact-action]) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin-block: 1px;
  padding-inline: 9px;
  border-radius: 8px;
  font-weight: 450;
  color: var(--ui-text-secondary);
  transition: background-color 110ms ease, color 110ms ease;
}

:root[data-hermes-theme='agk-cursor'] [data-sidebar] [data-sidebar-compact-action] {
  padding: 0;
  margin-block: 0;
}

:root[data-hermes-theme='agk-cursor'] [data-sidebar] a:hover,
:root[data-hermes-theme='agk-cursor'] [data-sidebar] button:not([class*='bg-primary']):not([data-sidebar-compact-action]):hover {
  background: var(--cursor-hover);
  color: var(--ui-text-primary);
}

:root[data-hermes-theme='agk-cursor'] [data-sidebar] [aria-current='page'],
:root[data-hermes-theme='agk-cursor'] [data-sidebar] [data-active='true'] {
  position: relative;
  background: var(--cursor-selected) !important;
  color: var(--ui-text-primary) !important;
  font-weight: 600;
}

:root[data-hermes-theme='agk-cursor'] [data-sidebar] [aria-current='page']::before,
:root[data-hermes-theme='agk-cursor'] [data-sidebar] [data-active='true']::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  width: 3px;
  height: 15px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--cursor-accent);
}

/* Anything painting inside a rounded pane inherits the rounding. */
:root[data-hermes-theme='agk-cursor'] [data-tree-group] > div,
:root[data-hermes-theme='agk-cursor'] [data-tree-group] > div > div,
:root[data-hermes-theme='agk-cursor'] [data-tree-group] [data-terminal-slot],
:root[data-hermes-theme='agk-cursor'] [data-tree-group] [data-tree-tab='terminal'] {
  border-radius: inherit;
}

/* ── Terminal overlay ──────────────────────────────────────────────────────
   Same contract as AGK: ONE xterm host at the app root chases the pane slot;
   the opaque slab is the overlay with an inline style; only !important wins;
   the bottom corners must be cut on the overlay itself. */
:root[data-hermes-theme='agk-cursor'] [data-persistent-terminal] {
  background: transparent !important;
  background-color: transparent !important;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
}

:root[data-hermes-theme='agk-cursor'] [data-terminal] {
  background: transparent !important;
  padding-bottom: 0 !important;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
}

:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm-viewport,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm-screen,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm-rows {
  background: transparent !important;
  background-color: transparent !important;
}

:root[data-hermes-theme='agk-cursor'] [data-terminal] > div,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm-viewport,
:root[data-hermes-theme='agk-cursor'] [data-terminal] .xterm-screen {
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-group]:has([data-terminal-slot]) {
  border-radius: 12px;
  overflow: hidden;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-group]:has([data-terminal-slot]) > div:last-child,
:root[data-hermes-theme='agk-cursor'] [data-tree-group]:has([data-terminal-slot]) > div:last-child > div {
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
  overflow: hidden;
}

/* ── Tabs ──────────────────────────────────────────────────────────────────
   Cursor tab strip: quiet pills on the raised pane, explicit flex centre so
   every pane lands the pills on the same line. */
:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] {
  display: flex;
  align-items: center;
  min-height: 40px;
  height: 40px;
  gap: 9px;
  padding: 0 8px;
  border-bottom: 0;
  background: transparent;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-group]:has([data-zone-tabstrip]) {
  border-radius: 12px;
  overflow: hidden;
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] [data-tree-tab] {
  display: inline-flex;
  align-items: center;
  align-self: center;
  flex: 0 0 auto;
  gap: 6px;
  min-height: 26px;
  height: 26px;
  margin: 0 5px 0 0;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
  color: var(--cursor-ink-soft);
  box-shadow: none;
  transition: background-color 110ms ease, color 110ms ease;
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] [data-tree-tab] * {
  text-transform: none;
  letter-spacing: 0;
  font-size: inherit;
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] [data-tree-tab][data-active='true'] {
  background: var(--cursor-active);
  color: var(--ui-text-primary);
  font-weight: 600;
  box-shadow: none;
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] [data-tree-tab]:not([data-active='true']):hover {
  background: var(--cursor-hover);
  color: var(--ui-text-primary);
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] button:not([data-tree-tab]) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  margin: 0;
  padding: 0;
  border-radius: 8px;
}

:root[data-hermes-theme='agk-cursor'] [data-zone-tabstrip] button:not([data-tree-tab]):hover {
  background: var(--cursor-hover);
}

/* Tab chrome artefacts: kill the melt gradient and inset underline. */
:root[data-hermes-theme='agk-cursor'] [data-tree-tab] span[class*='bg-linear-to-r'],
:root[data-hermes-theme='agk-cursor'] [data-tree-tab] div[class*='bg-linear-to-r'],
:root[data-hermes-theme='agk-cursor'] [data-tree-tab] [class*='from-transparent'] {
  background-image: none !important;
  background: transparent !important;
  box-shadow: none !important;
  width: 0 !important;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-tab] [class*='shadow-[inset'],
:root[data-hermes-theme='agk-cursor'] [data-tree-tab][data-active='true'] [class*='inset_0_-2px'] {
  box-shadow: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-tab] button[aria-label*='Close'],
:root[data-hermes-theme='agk-cursor'] [data-tree-tab] button[title*='Close'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  min-width: 17px;
  min-height: 17px;
  margin-left: 3px;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-tree-tab] button[aria-label*='Close']:hover,
:root[data-hermes-theme='agk-cursor'] [data-tree-tab] button[title*='Close']:hover {
  background: var(--cursor-hover);
}

/* ── Sidebar footer (profile row) ────────────────────────────────────────── */
:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] > * {
  min-width: 0;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] button:has(> svg:only-child),
:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] a:has(> svg:only-child) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
  padding: 0 7px;
  border-radius: 8px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] button:not(:has(> svg:only-child)),
:root[data-hermes-theme='agk-cursor'] [data-slot='sidebar-footer'] a:not(:has(> svg:only-child)) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding-left: 9px;
  padding-right: 9px;
  border-radius: 8px;
}

/* ── Conversation ──────────────────────────────────────────────────────────
   User turns are Cursor's rounded charcoal chips (slightly lighter than the
   canvas, no border); assistant copy is airy on the canvas itself. */
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_user-message-root'] {
  border: 0;
  border-radius: 14px;
  padding: 13px 15px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] {
  line-height: 1.7;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] p + p {
  margin-top: 0.9rem;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] h1,
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] h2,
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] h3 {
  font-weight: 620;
  letter-spacing: -0.015em;
  margin-top: 1.6rem;
}

/* Code blocks and inline chips: quiet rounded fills, no borders. */
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] pre {
  padding: 14px 16px;
  border-radius: 12px;
  border: 0;
  background: var(--cursor-chip) !important;
  box-shadow: none;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] :not(pre) > code {
  padding: 0.1em 0.4em;
  border-radius: 6px;
  background: var(--cursor-chip) !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] pre code,
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] pre code span,
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] pre * {
  padding: 0;
  border-radius: 0;
  background: transparent !important;
  background-color: transparent !important;
}

:root[data-hermes-theme='agk-cursor'] [class*='group/code'],
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] [class*='group/code'] {
  width: 100%;
  max-width: 100%;
  background: var(--cursor-chip) !important;
  --ui-bg-editor: var(--cursor-chip);
  --expandable-fade-from: var(--cursor-chip);
  border: 0;
  border-radius: 12px;
}

:root[data-hermes-theme='agk-cursor'] [class*='group/code'] pre,
:root[data-hermes-theme='agk-cursor'] [class*='group/code'] > div,
:root[data-hermes-theme='agk-cursor'] [class*='group/code'] code {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-root'],
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'],
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_user-message-root'] {
  max-width: min(100%, 78rem);
}

:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] pre,
:root[data-hermes-theme='agk-cursor'] [data-slot='aui_assistant-message-content'] table {
  width: 100%;
  max-width: 100%;
}

/* ── Background-task status stack ──────────────────────────────────────────
   Same fused-capsule contract as AGK, restated for this theme's variables. */
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-status-card'] {
  margin-inline: 12px !important;
  margin-bottom: 6px;
  border: 0 !important;
  border-radius: 14px !important;
  background: var(--cursor-composer) !important;
  box-shadow: var(--cursor-lift);
  overflow: visible !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-status-card'] [class*='flex'] {
  column-gap: 8px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-status-card'] > div {
  border: 0 !important;
  background: transparent !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] > *,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] > * > * {
  border-top: 0 !important;
  border-bottom: 0 !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] hr,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] [role='separator'] {
  display: none !important;
}

/* ── Composer ──────────────────────────────────────────────────────────────
   Cursor's pill: fully-rounded, borderless, one soft shadow. Focus deepens
   the surface; a whisper of the violet state accent rides the shadow only. */
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] {
  padding: 12px 14px 10px;
  border-radius: 26px;
  border: 0 !important;
  outline: 0 !important;
  background: var(--cursor-composer);
  box-shadow: var(--cursor-lift);
  transition: background-color 140ms ease, box-shadow 140ms ease;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface']:focus,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface']:focus-visible,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface']:focus-within {
  border: 0 !important;
  outline: 0 !important;
  background: var(--cursor-composer-focus);
  box-shadow: var(--cursor-lift), 0 0 0 1px var(--cursor-accent-soft) !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] [class*='flex']:has(> button + button) {
  gap: 10px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 30px;
  min-height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-text-secondary);
  transition: background-color 110ms ease, color 110ms ease;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button:hover {
  background: var(--cursor-hover);
  color: var(--ui-text-primary);
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] {
  --composer-control-primary-size: 32px;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[type='submit'],
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[aria-label*='Send'],
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[class*='bg-foreground'],
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[class*='bg-primary'] {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  flex: 0 0 32px;
  opacity: 1 !important;
  visibility: visible !important;
  background: var(--cursor-send) !important;
  color: var(--cursor-send-ink) !important;
  transition: background-color 130ms ease, color 130ms ease;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[type='submit']:hover:not(:disabled),
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[aria-label*='Send']:hover:not(:disabled),
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[class*='bg-primary']:hover:not(:disabled) {
  filter: brightness(1.08);
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[type='submit']:disabled,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[aria-label*='Send']:disabled,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] button[class*='bg-primary']:disabled {
  opacity: 1 !important;
  background: var(--cursor-send-idle) !important;
  color: var(--cursor-send-idle-ink) !important;
  cursor: default;
  filter: none !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] textarea,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-surface'] input {
  padding-inline: 2px;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* ── Menus, popovers and buttons ─────────────────────────────────────────── */
:root[data-hermes-theme='agk-cursor'] [data-slot='dropdown-menu-content'],
:root[data-hermes-theme='agk-cursor'] [data-slot='context-menu-content'],
:root[data-hermes-theme='agk-cursor'] [data-slot='popover-content'],
:root[data-hermes-theme='agk-cursor'] [data-slot='dialog-content'],
:root[data-hermes-theme='agk-cursor'] [role='menu'] {
  padding: 5px;
  border: 1px solid var(--cursor-hairline);
  border-radius: 13px;
  background: var(--cursor-raised) !important;
  box-shadow: var(--cursor-lift);
}

:root[data-hermes-theme='agk-cursor'] [role='menuitem'],
:root[data-hermes-theme='agk-cursor'] [data-slot='dropdown-menu-item'],
:root[data-hermes-theme='agk-cursor'] [data-slot='context-menu-item'] {
  min-height: 30px;
  border-radius: 8px;
  font-weight: 450;
}

:root[data-hermes-theme='agk-cursor'] [role='menuitem']:hover,
:root[data-hermes-theme='agk-cursor'] [data-slot='dropdown-menu-item']:hover,
:root[data-hermes-theme='agk-cursor'] [data-slot='context-menu-item']:hover {
  background: var(--cursor-hover) !important;
}

:root[data-hermes-theme='agk-cursor'] button:not(:disabled):not([class*='bg-primary']):not([data-tree-tab]) {
  border-radius: 8px;
  box-shadow: none !important;
}

/* Text-entry: fill and caret only, never border chrome. */
:root[data-hermes-theme='agk-cursor'] :is(
  input:not([type]),
  input[type='text'],
  input[type='search'],
  input[type='email'],
  input[type='password'],
  input[type='url'],
  input[type='tel'],
  input[type='number'],
  textarea,
  [data-slot='input']:not([type]),
  [data-slot='input'][type='text'],
  [data-slot='input'][type='search'],
  [data-slot='input'][type='email'],
  [data-slot='input'][type='password'],
  [data-slot='input'][type='url'],
  [data-slot='input'][type='tel'],
  [data-slot='input'][type='number'],
  [data-slot='textarea'],
  [data-slot='input-group']:has(> [data-slot='input']:is(
    :not([type]),
    [type='text'],
    [type='search'],
    [type='email'],
    [type='password'],
    [type='url'],
    [type='tel'],
    [type='number']
  ))
),
:root[data-hermes-theme='agk-cursor'] :is(
  input:not([type]),
  input[type='text'],
  input[type='search'],
  input[type='email'],
  input[type='password'],
  input[type='url'],
  input[type='tel'],
  input[type='number'],
  textarea,
  [data-slot='input']:not([type]),
  [data-slot='input'][type='text'],
  [data-slot='input'][type='search'],
  [data-slot='input'][type='email'],
  [data-slot='input'][type='password'],
  [data-slot='input'][type='url'],
  [data-slot='input'][type='tel'],
  [data-slot='input'][type='number'],
  [data-slot='textarea'],
  [data-slot='input-group']:has(> [data-slot='input']:is(
    :not([type]),
    [type='text'],
    [type='search'],
    [type='email'],
    [type='password'],
    [type='url'],
    [type='tel'],
    [type='number']
  ))
):is(:hover, :focus, :focus-visible, :focus-within) {
  border: 0 !important;
  border-radius: 9px;
  outline: 0 !important;
  box-shadow: none !important;
  background: var(--cursor-chip);
  color: var(--ui-text-primary) !important;
  caret-color: var(--ui-text-primary);
  -webkit-text-fill-color: var(--ui-text-primary);
}

:root[data-hermes-theme='agk-cursor'] input::placeholder,
:root[data-hermes-theme='agk-cursor'] [data-slot='input']::placeholder {
  color: var(--ui-text-tertiary) !important;
  -webkit-text-fill-color: var(--ui-text-tertiary);
}

/* ── Status bar ──────────────────────────────────────────────────────────── */
:root[data-hermes-theme='agk-cursor'] [data-slot='statusbar'] {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 30px;
  height: 30px;
  margin: 0;
  padding: 2px 12px;
  border: 0;
  border-top: 0;
  border-radius: 0;
  background: var(--cursor-shell) !important;
  box-shadow: none !important;
}

/* ── Focus discipline ──────────────────────────────────────────────────────
   No coloured ring; keyboard focus keeps a neutral inset marker. The composer
   keeps its violet whisper via its own focus rule above. */
:root[data-hermes-theme='agk-cursor'] *:focus:not(:focus-visible) {
  outline: none;
}

:root[data-hermes-theme='agk-cursor'] *:focus-visible:not([data-slot='composer-rich-input']):not([data-slot='composer-surface']):not(:is(
    input:not([type]),
    input[type='text'],
    input[type='search'],
    input[type='email'],
    input[type='password'],
    input[type='url'],
    input[type='tel'],
    input[type='number'],
    textarea,
    [data-slot='input']:not([type]),
    [data-slot='input'][type='text'],
    [data-slot='input'][type='search'],
    [data-slot='input'][type='email'],
    [data-slot='input'][type='password'],
    [data-slot='input'][type='url'],
    [data-slot='input'][type='tel'],
    [data-slot='input'][type='number'],
    [data-slot='textarea']
  )) {
  outline: none !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-text-primary) 22%, transparent) inset !important;
}

:root[data-hermes-theme='agk-cursor'] [data-slot='composer-rich-input'],
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-rich-input']:focus,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-rich-input']:focus-visible,
:root[data-hermes-theme='agk-cursor'] [data-slot='composer-rich-input']:active {
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

:root[data-hermes-theme='agk-cursor'] [data-row-actions] time {
  display: none !important;
}

:root[data-hermes-theme='agk-cursor'] ::selection {
  background: var(--cursor-accent-soft);
}

:root[data-hermes-theme='agk-cursor'] ::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-text-primary) 14%, transparent);
}
`

function installStyle(ctx) {
  document.getElementById(STYLE_ID)?.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
  ctx.onDispose(() => style.remove())
}

// Opt-in PEER theme: register + install + palette commands. It only requests
// the theme through explicit activation or its own stored intent (chosen-v1);
// it never touches the canonical AGK theme's enabled-v1 storage.
function activate(ctx, message = true) {
  try {
    if (ctx.storage.get('chosen-v1', null) !== true) {
      ctx.storage.set('chosen-v1', true)
    }
  } catch {
    // Storage unavailable: activation still applies for this session.
  }
  const ok = requestTheme(ID)
  if (message) {
    host.notify({
      kind: ok ? 'success' : 'error',
      message: ok ? 'AGK Cursor theme activated.' : 'AGK Cursor theme is not available.'
    })
  }
  return ok
}

function deactivate(ctx, message = true) {
  try {
    if (ctx.storage.get('chosen-v1', null) !== false) {
      ctx.storage.set('chosen-v1', false)
    }
  } catch {
    // Storage unavailable: rollback still applies for this session.
  }
  const ok = requestTheme('agk')
  if (message) {
    host.notify({
      kind: ok ? 'success' : 'error',
      message: ok ? 'Back to the canonical AGK theme.' : 'AGK theme is not available.'
    })
  }
  return ok
}

export default {
  id: ID,
  name: 'AGK Cursor Theme',
  description: 'Cursor look for AGK: warm charcoal canvas, darker sidebar rail, violet state accent, pill composer. Opt-in.',
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: theme })
    installStyle(ctx)

    ctx.register({
      id: 'activate',
      area: PALETTE_AREA,
      data: {
        id: 'agk-cursor.activate',
        label: 'Theme: activate AGK Cursor',
        keywords: ['theme', 'appearance', 'agk', 'cursor', 'charcoal', 'violet', 'dark'],
        run: () => activate(ctx, true)
      }
    })

    ctx.register({
      id: 'deactivate',
      area: PALETTE_AREA,
      data: {
        id: 'agk-cursor.deactivate',
        label: 'Theme: back to canonical AGK',
        keywords: ['theme', 'appearance', 'agk', 'restore', 'default'],
        run: () => deactivate(ctx, true)
      }
    })

    // Boot persistence for an opt-in peer: if the user's last stored theme is
    // this one (or a boot normalization wiped it while the intent flag says it
    // was chosen), re-assert it after registration. The canonical AGK theme
    // checks the same key and yields when this value is present, so the two
    // plugins cannot fight over the boot paint.
    try {
      const stored = globalThis.localStorage?.getItem('hermes-desktop-theme-v2') ?? null
      const chosen = ctx.storage.get('chosen-v1', null)
      if (stored === ID || (stored !== 'agk' && chosen === true)) {
        if (chosen !== true) {
          ctx.storage.set('chosen-v1', true)
        }
        queueMicrotask(() => activate(ctx, false))
      }
    } catch {
      // localStorage unavailable (tests, odd embeds): stay passive.
    }
  }
}
