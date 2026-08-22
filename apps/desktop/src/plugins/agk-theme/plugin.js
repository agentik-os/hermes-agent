import { host, PALETTE_AREA, requestTheme, THEMES_AREA } from '@hermes/plugin-sdk'

const ID = 'agk'
const STYLE_ID = 'agk-layout-v2'

// AGK = the OpenAI neutral-zinc PALETTE on the Claude Code LAYOUT. Four rules
// drive every value below:
//
//   1. Cool neutral zinc, not warm paper. #f7f7f8 canvas / #212121 dark base;
//      every neutral is zinc, and there is no chromatic accent at all.
//   2. Hairlines, not shadows. Panels sit flush and are separated by 1px rules.
//      The composer is the single elevated object on the page.
//   3. Monochrome discipline. Focus, selection and agent activity are carried
//      by surface and weight; primary controls stay ink-dark.
//   4. Product UI, not a document: headings stay in the sans stack (the serif
//      belonged to the warm-paper revision this palette replaced), and body
//      copy gets a generous 1.7 line-height.
const theme = {
  name: ID,
  label: 'AGK',
  description: 'Neutral zinc canvas with Claude Code structure: flat surfaces, quiet chrome, one raised composer',
  typography: {
    fontSans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
    fontMono: '"SF Mono", Menlo, Monaco, Consolas, monospace'
  },
  colors: {
    background: '#f7f7f8',
    foreground: '#18181b',
    card: '#ffffff',
    cardForeground: '#18181b',
    muted: '#eeeeef',
    mutedForeground: '#62626a',
    popover: '#ffffff',
    popoverForeground: '#18181b',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    secondary: '#ececef',
    secondaryForeground: '#27272a',
    accent: '#e4e4e7',
    accentForeground: '#18181b',
    border: '#d7d7db',
    input: '#d4d4d8',
    ring: '#71717a',
    midground: '#52525b',
    midgroundForeground: '#ffffff',
    composerRing: '#71717a',
    destructive: '#b42318',
    destructiveForeground: '#ffffff',
    sidebarBackground: '#ececee',
    sidebarBorder: '#d5d5d8',
    userBubble: '#e9e9eb',
    userBubbleBorder: '#e9e9eb'
  },
  darkColors: {
    background: '#212121',
    foreground: '#f4f4f5',
    card: '#2a2a2a',
    cardForeground: '#f4f4f5',
    muted: '#303030',
    mutedForeground: '#b4b4b8',
    popover: '#2b2b2b',
    popoverForeground: '#f4f4f5',
    primary: '#f4f4f5',
    primaryForeground: '#18181b',
    secondary: '#333333',
    secondaryForeground: '#f4f4f5',
    accent: '#3a3a3a',
    accentForeground: '#fafafa',
    border: '#424242',
    input: '#454545',
    ring: '#a1a1aa',
    midground: '#d4d4d8',
    midgroundForeground: '#18181b',
    composerRing: '#8b8b93',
    destructive: '#ef6a63',
    destructiveForeground: '#18181b',
    sidebarBackground: '#171717',
    sidebarBorder: '#303030',
    userBubble: '#303030',
    userBubbleBorder: '#303030'
  }
}

const css = `
:root[data-hermes-theme='agk'] {
  --radius-scalar: 0.7;
  --dt-spacing-mul: 1.03;
  /* Keep theme geometry coupled to the native titlebar constants. */
  --titlebar-control-size: 24px;
  --conversation-text-font-size: 0.9375rem;
  --paragraph-gap: 0.9rem;
  --agk-serif: "New York", "Iowan Old Style", Georgia, "Times New Roman", serif;
  /* Core terminal hooks render AGK on an alpha canvas; this opaque token stays
     available as the fallback for DOM layers and non-canvas terminal paths. */
  --ui-terminal-surface-background: var(--agk-raised);
}

:root[data-hermes-theme='agk'][data-hermes-mode='light'] {
  --dt-background: #f7f7f8 !important;
  --background: #f7f7f8 !important;
  --sidebar: #ececee !important;
  --popover: #ffffff !important;
  --agk-accent: #52525b;
  --agk-shell: #f7f7f8;
  --agk-raised: #ffffff;
  --agk-hairline: #d7d7db;
  --agk-hover: rgb(24 24 27 / 5%);
  --agk-active: #e4e4e7;
  --agk-selected: #d8d8dd;
  --agk-bg: #f0f0f2;
  --agk-ink-soft: #62626a;
  --agk-composer: #ffffff;
  --agk-composer-focus: #ffffff;
  --agk-send: #18181b;
  --agk-send-ink: #fafafa;
  --agk-send-idle: #d4d4d8;
  --agk-send-idle-ink: #ffffff;
  --agk-lift: 0 1px 2px rgb(24 24 27 / 5%), 0 8px 24px rgb(24 24 27 / 6%);
}

:root[data-hermes-theme='agk'][data-hermes-mode='dark'] {
  --dt-background: #212121 !important;
  --background: #212121 !important;
  --sidebar: #171717 !important;
  --popover: #2b2b2b !important;
  --agk-accent: #a1a1aa;
  --agk-shell: #212121;
  --agk-raised: #2a2a2a;
  --agk-hairline: #424242;
  --agk-hover: rgb(244 244 245 / 6%);
  --agk-active: #333333;
  --agk-selected: #3f3f3f;
  --agk-bg: #1a1a1a;
  --agk-ink-soft: #b4b4b8;
  --agk-composer: #2f2f2f;
  --agk-composer-focus: #353535;
  --agk-send: #f4f4f5;
  --agk-send-ink: #18181b;
  --agk-send-idle: #4a4a4a;
  --agk-send-idle-ink: #8b8b8b;
  --agk-lift: 0 1px 2px rgb(0 0 0 / 24%), 0 10px 28px rgb(0 0 0 / 28%);
}

/* ── Shell ─────────────────────────────────────────────────────────────────
   Claude Code uses ONE canvas colour everywhere: shell, titlebar, sidebar and
   panes all share it. Depth comes from a single raised surface (the content
   pane and the composer), never from a different grey per zone. Panes are
   rounded cards floating on that canvas with a small uniform gutter. */
:root[data-hermes-theme='agk'] body,
:root[data-hermes-theme='agk'] [data-contrib-shell] {
  letter-spacing: -0.004em;
  background-color: var(--agk-shell) !important;
  background-image: none !important;
}

:root[data-hermes-theme='agk'] [data-contrib-shell] > div:has(> [data-tree-split]),
:root[data-hermes-theme='agk'] [data-contrib-shell] > div:has(> [data-tree-group]) {
  padding: 0 8px 8px;
  background: transparent;
}

:root[data-hermes-theme='agk'] [data-tree-split] {
  gap: 8px;
}

/* The content pane is the raised card; no borders, no seams. */
:root[data-hermes-theme='agk'] [data-tree-group] {
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: var(--agk-raised) !important;
  box-shadow: none !important;
}

/* The sidebar stays on the canvas colour so it reads as part of the frame. */
:root[data-hermes-theme='agk'] [data-tree-group]:has([data-slot='sidebar']) {
  background: var(--agk-shell) !important;
}

:root[data-hermes-theme='agk'] [data-slot='sidebar-wrapper'],
:root[data-hermes-theme='agk'] [data-slot='sidebar'] {
  background-color: var(--agk-shell) !important;
}

/* Nested trees are content, never a second card. */
:root[data-hermes-theme='agk'] [data-project-tree],
:root[data-hermes-theme='agk'] [data-project-tree] > div,
:root[data-hermes-theme='agk'] [data-tree-group] aside,
:root[data-hermes-theme='agk'] [data-tree-group] > div:has(> [data-project-tree]) {
  background: transparent !important;
}

/* ── Titlebar ──────────────────────────────────────────────────────────────
   Aligned from the real Electron geometry, not by eye:
     main.ts:807  TITLEBAR_HEIGHT = 34
     main.ts:808  MACOS_TRAFFIC_LIGHTS_HEIGHT = 14
     main.ts:810  y = 34/2 - 14/2 = 10  ->  lights centre at 17px from the top
   So the control row must also centre at 17px. Forcing height to 40px (as an
   earlier revision did) pushed everything down and broke the axis: use the
   native 34px, centre the children, and let the 24px buttons land on 17px. */
:root[data-hermes-theme='agk'] [data-contrib-shell] > div:first-of-type {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  min-height: 34px;
  padding-block: 0;
  box-sizing: border-box;
  background: var(--agk-shell) !important;
  border-bottom: 0;
}

/* The leading cluster carries a notification badge rendered as an absolutely
   positioned child. That badge grows the cluster's box upward, so the icons
   drift above the traffic-light axis while the right-hand cluster (no badge)
   stays correct. Pin the cluster's height to the button size and let the badge
   overflow instead of stretching its parent. */
:root[data-hermes-theme='agk'] [data-contrib-shell] > div:first-of-type > div {
  display: flex;
  align-items: center;
  align-self: center;
  height: 24px;
  gap: 8px;
}

:root[data-hermes-theme='agk'] [data-contrib-shell] > div:first-of-type > div > * {
  align-self: center;
}

:root[data-hermes-theme='agk'] [data-contrib-shell] > div:first-of-type button {
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

:root[data-hermes-theme='agk'] [data-contrib-shell] > div:first-of-type button:hover {
  background-color: var(--agk-hover) !important;
}

/* ── Sidebar ───────────────────────────────────────────────────────────────
   Compact rows with real breathing room between them, quiet hover, and an
   unmistakable active row. The surface colour is set once in the shell block
   above, so nothing repaints it here. */
:root[data-hermes-theme='agk'] [data-sidebar] ul,
:root[data-hermes-theme='agk'] [data-sidebar] [role='list'],
:root[data-hermes-theme='agk'] [data-sidebar] nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

:root[data-hermes-theme='agk'] [data-sidebar] a,
:root[data-hermes-theme='agk'] [data-sidebar] button:not([class*='bg-primary']) {
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

/* Session rows: DO NOT restyle the trailing cluster.

   session-row.tsx already solves the age/kebab conflict natively
   (lines 108-113, 290-300): the trailing metadata sits in normal flow, the
   kebab lifts out of it with absolute right-0, TAIL_HIDES fades the age on
   hover, and the title truncates against that cluster's intrinsic width.

   My earlier override added padding-right 34px on the row and forced the menu
   to position absolute from the theme. That broke the shell's auto actions
   column: the title stopped truncating against the cluster and ran underneath
   the timestamp instead. The right fix is to remove the override entirely and
   let Hermes' own mechanism work. */
:root[data-hermes-theme='agk'] [data-sidebar] a:hover,
:root[data-hermes-theme='agk'] [data-sidebar] button:not([class*='bg-primary']):hover {
  background: var(--agk-hover);
  color: var(--ui-text-primary);
}

/* Active row: stronger fill than hover, full-strength ink, and a terracotta
   marker on the leading edge so it reads at a glance. */
:root[data-hermes-theme='agk'] [data-sidebar] [aria-current='page'],
:root[data-hermes-theme='agk'] [data-sidebar] [data-active='true'] {
  position: relative;
  background: var(--agk-selected) !important;
  color: var(--ui-text-primary) !important;
  font-weight: 600;
}

:root[data-hermes-theme='agk'] [data-sidebar] [aria-current='page']::before,
:root[data-hermes-theme='agk'] [data-sidebar] [data-active='true']::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  width: 3px;
  height: 15px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--agk-accent);
}

/* Anything that paints its own background inside a rounded pane must inherit
   the pane's rounding, otherwise a square corner (the terminal, an xterm
   viewport, a scroll container) pokes out past the card's radius. Clipping on
   the pane alone is not enough: a child painting on top of the clipped region
   still shows a hard corner under macOS compositing. */
:root[data-hermes-theme='agk'] [data-tree-group] > div,
:root[data-hermes-theme='agk'] [data-tree-group] > div > div,
:root[data-hermes-theme='agk'] [data-tree-group] [data-terminal-slot],
:root[data-hermes-theme='agk'] [data-tree-group] [data-tree-tab='terminal'] {
  border-radius: inherit;
}

/* THE TERMINAL IS NOT INSIDE THE PANE. persistent.tsx renders ONE xterm host
   at the app root (wiring.tsx:1190) as a position:fixed overlay that CHASES the
   pane slot's bounding rect — moving the host DOM would detach xterm's WebGL
   renderer and wipe the screen, so it never moves. Consequences, all of which
   earlier revisions of this file got wrong:

     - the pane contains [data-terminal-slot] (persistent.tsx:46), NOT
       [data-terminal]. Every [data-tree-group]:has([data-terminal]) rule
       matched nothing at all;
     - the opaque slab is the OVERLAY, [data-persistent-terminal], whose
       background is an INLINE style (persistent.tsx:281) — only !important
       beats it;
     - the overlay is fixed, so the pane's own overflow:hidden cannot clip it.
       The bottom corners have to be cut on the overlay itself. It already
       carries contain: layout size paint, so paint containment clips its
       children to that rounded box for free. */
:root[data-hermes-theme='agk'] [data-persistent-terminal] {
  background: transparent !important;
  background-color: transparent !important;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
}

/* The instance inside the overlay. instance.tsx:15 gives it
   bg-(--ui-terminal-surface-background) plus px-2 pb-2; the bottom padding
   would leave a strip of pane showing under the rounded corner. */
:root[data-hermes-theme='agk'] [data-terminal] {
  background: transparent !important;
  padding-bottom: 0 !important;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
}

/* The xterm DOM layers are forced with Tailwind important modifiers
   (instance.tsx:21), so match the flag. The CANVAS is deliberately NOT cleared:
   it is opaque by design and now paints --agk-raised, the same colour as the
   pane behind it. Clearing it here would only expose the renderer's own
   fallback. */
:root[data-hermes-theme='agk'] [data-terminal] .xterm,
:root[data-hermes-theme='agk'] [data-terminal] .xterm-viewport,
:root[data-hermes-theme='agk'] [data-terminal] .xterm-screen,
:root[data-hermes-theme='agk'] [data-terminal] .xterm-rows {
  background: transparent !important;
  background-color: transparent !important;
}

:root[data-hermes-theme='agk'] [data-terminal] > div,
:root[data-hermes-theme='agk'] [data-terminal] .xterm,
:root[data-hermes-theme='agk'] [data-terminal] .xterm-viewport,
:root[data-hermes-theme='agk'] [data-terminal] .xterm-screen {
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
}

/* The pane that HOSTS the terminal is matched on the slot it really contains. */
:root[data-hermes-theme='agk'] [data-tree-group]:has([data-terminal-slot]) {
  border-radius: 12px;
  overflow: hidden;
}

:root[data-hermes-theme='agk'] [data-tree-group]:has([data-terminal-slot]) > div:last-child,
:root[data-hermes-theme='agk'] [data-tree-group]:has([data-terminal-slot]) > div:last-child > div {
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
  overflow: hidden;
}

/* Superseded by the ordered pair further down (tab-strip rounding, then the
   conversation-pane squaring). Kept intentionally empty. */

/* The close affordance ships a 16px transparent-to-tab-face gradient strip so
   the button "melts" over the label, plus an inset underline on the active
   tab. Both read as artefacts here: kill the gradient and the underline and
   keep only the round close button on its own background. */
:root[data-hermes-theme='agk'] [data-tree-tab] span[class*='bg-linear-to-r'],
:root[data-hermes-theme='agk'] [data-tree-tab] div[class*='bg-linear-to-r'],
:root[data-hermes-theme='agk'] [data-tree-tab] [class*='from-transparent'] {
  background-image: none !important;
  background: transparent !important;
  box-shadow: none !important;
  width: 0 !important;
}

:root[data-hermes-theme='agk'] [data-tree-tab] [class*='shadow-[inset'],
:root[data-hermes-theme='agk'] [data-tree-tab][data-active='true'] [class*='inset_0_-2px'] {
  box-shadow: none !important;
}

/* The close button itself: a compact round target with a quiet hover fill. */
:root[data-hermes-theme='agk'] [data-tree-tab] button[aria-label*='Close'],
:root[data-hermes-theme='agk'] [data-tree-tab] button[title*='Close'] {
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

:root[data-hermes-theme='agk'] [data-tree-tab] button[aria-label*='Close']:hover,
:root[data-hermes-theme='agk'] [data-tree-tab] button[title*='Close']:hover {
  background: var(--agk-hover);
}

/* ── Sidebar footer (profile row) ──────────────────────────────────────────
   The leading avatar/icon must be a true square target, and the profile button
   next to it needs its own leading padding so the pair reads as two aligned
   controls rather than an icon glued to a label. */
:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
}

:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] > * {
  min-width: 0;
}

/* Square icon button: equal padding on both sides, fixed 30px box. */
:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] button:has(> svg:only-child),
:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] a:has(> svg:only-child) {
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

/* The profile button itself: leading padding, comfortable height. */
:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] button:not(:has(> svg:only-child)),
:root[data-hermes-theme='agk'] [data-slot='sidebar-footer'] a:not(:has(> svg:only-child)) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding-left: 9px;
  padding-right: 9px;
  border-radius: 8px;
}

/* ── Tabs ──────────────────────────────────────────────────────────────────
   Claude's tab strip. The strip MUST declare its own flex context: it sets a
   40px height while the pills are 26px, so without an explicit align-items
   center each panel falls back to whatever alignment Hermes gave it (stretch
   or flex-start) and the pills land at a different vertical offset in every
   pane. That mismatch is what breaks the horizontal axis. */
/* Top panel: the tab strip is the pane's header, so it must carry the pane's
   top rounding. Without this the strip paints a square edge over the rounded
   card and both top corners show a notch. */
:root[data-hermes-theme='agk'] [data-zone-tabstrip] {
  display: flex;
  align-items: center;
  min-height: 40px;
  height: 40px;
  gap: 9px;
  padding: 0 8px;
  border-bottom: 0;
  background: transparent;
}

/* Every pane keeps a rounded top by default, so the tab strip heading it is
   rounded too. The conversation pane is squared again just below — this rule
   sits first because the shorthand here would otherwise overwrite the longhand
   corners, both selectors having equal specificity. */
:root[data-hermes-theme='agk'] [data-tree-group]:has([data-zone-tabstrip]) {
  border-radius: 12px;
  overflow: hidden;
}

/* Square top corners for the conversation pane ONLY: it butts against the
   window chrome, where a rounded top reads as a floating notch. */
:root[data-hermes-theme='agk'] [data-tree-group]:has([data-slot='composer-surface']) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* Tag-style tabs: the label needs breathing room on both axes, otherwise the
   pill hugs the text and reads as cramped. An explicit align-self center pins
   the pill to the strip's centre line even if a pane overrides the parent.
   The spacing BETWEEN pills uses margin rather than the strip gap: Hermes
   wraps the tabs in an inner container, so a gap on the strip only separates
   that wrapper from its siblings and never reaches the pills themselves. */
:root[data-hermes-theme='agk'] [data-zone-tabstrip] [data-tree-tab] {
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
  color: var(--agk-ink-soft);
  box-shadow: none;
  transition: background-color 110ms ease, color 110ms ease;
}

/* Hermes uppercases the label on a child node, so reset it there too. */
:root[data-hermes-theme='agk'] [data-zone-tabstrip] [data-tree-tab] * {
  text-transform: none;
  letter-spacing: 0;
  font-size: inherit;
}

:root[data-hermes-theme='agk'] [data-zone-tabstrip] [data-tree-tab][data-active='true'] {
  background: var(--agk-active);
  color: var(--ui-text-primary);
  font-weight: 600;
  box-shadow: none;
}

:root[data-hermes-theme='agk'] [data-zone-tabstrip] [data-tree-tab]:not([data-active='true']):hover {
  background: var(--agk-hover);
  color: var(--ui-text-primary);
}

/* The strip's own trailing controls (the + button) match the tab rhythm and
   sit on the same centre line as the pills. */
:root[data-hermes-theme='agk'] [data-zone-tabstrip] button:not([data-tree-tab]) {
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

:root[data-hermes-theme='agk'] [data-zone-tabstrip] button:not([data-tree-tab]):hover {
  background: var(--agk-hover);
}

/* ── Conversation ──────────────────────────────────────────────────────────
   User turns are quiet warm blocks; assistant copy is airy and readable. */
:root[data-hermes-theme='agk'] [data-slot='aui_user-message-root'] {
  border: 0;
  border-radius: 12px;
  padding: 13px 15px;
}

:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] {
  line-height: 1.7;
}

:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] p + p {
  margin-top: 0.9rem;
}

/* Headings stay in the sans stack: the OpenAI palette reads as a product UI,
   not a document, so a serif would fight the neutral zinc surfaces. */
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] h1,
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] h2,
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] h3 {
  font-weight: 620;
  letter-spacing: -0.015em;
  margin-top: 1.6rem;
}

/* Code blocks: hairline-bounded slab, no fill on the text itself. The previous
   rule also matched inline code inside pre, so every token carried its own
   background on top of the block — a double fill that reads as highlighted
   text. Scope the fill to the block and make nested code transparent. */
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] pre {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--agk-hairline);
  background: var(--agk-bg) !important;
  box-shadow: none;
}

/* Inline code keeps a subtle chip; code inside a block has no fill at all. */
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] :not(pre) > code {
  padding: 0.1em 0.34em;
  border-radius: 6px;
  background: var(--agk-bg) !important;
}

:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] pre code,
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] pre code span,
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] pre * {
  padding: 0;
  border-radius: 0;
  background: transparent !important;
  background-color: transparent !important;
}

/* Code cards render through code-card.tsx, whose own contract is background
   only, no border. The stray inner borders were mine: the card rule and the
   pre rule each added one, so a pre inside a card drew two. Keep the border on
   the outermost surface only, and widen the measure further. */
:root[data-hermes-theme='agk'] [class*='group/code'],
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] [class*='group/code'] {
  width: 100%;
  max-width: 100%;
  background: var(--agk-bg) !important;
  --ui-bg-editor: var(--agk-bg);
  --expandable-fade-from: var(--agk-bg);
  border: 1px solid var(--agk-hairline);
  border-radius: 10px;
}

/* No nested chrome inside a code card: no second border, no inner radius. */
:root[data-hermes-theme='agk'] [class*='group/code'] pre,
:root[data-hermes-theme='agk'] [class*='group/code'] > div,
:root[data-hermes-theme='agk'] [class*='group/code'] code {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Widen the message column so blocks stop feeling cramped. */
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-root'],
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'],
:root[data-hermes-theme='agk'] [data-slot='aui_user-message-root'] {
  max-width: min(100%, 78rem);
}

:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] pre,
:root[data-hermes-theme='agk'] [data-slot='aui_assistant-message-content'] table {
  width: 100%;
  max-width: 100%;
}

/* Background-task stack (status-stack/index.tsx:249).

   Hermes designs the stack and the composer as ONE fused capsule: the card is
   rounded on top, SQUARE on the bottom, with a transparent bottom border,
   because the composer surface's own visible TOP border is meant to be the
   single shared seam between them.

   This theme removes that top border (the composer is borderless here), so the
   seam vanished and the stack ended in a bare square edge cut off above the
   composer. Fix it on this theme's own terms: give the stack the same fill, the
   same radius on all four corners and the same inset as the composer, so the
   two read as two stacked cards rather than a broken capsule.

   Scoped by NAME, not by class substring: status-stack/index.tsx now carries
   data-slot='composer-status-card' for exactly this. rounded-b-none alone
   also dresses the coding/cwd/git-branch strip (coding-row.tsx:209), and
   joining it to mx-2 to tell the two apart was one utility rename away from
   restyling the git/diff row again — which is how that row lost its branch
   name and its +/- counts the first time. And still no overflow clipping, for
   the same reason.

   The inset is 12px, slightly MORE than the composer's own, so the card sits
   just inside the composer's silhouette instead of overhanging the void its
   corner radius carves out. */
:root[data-hermes-theme='agk'] [data-slot='composer-status-card'] {
  margin-inline: 12px !important;
  margin-bottom: 6px;
  border: 0 !important;
  border-radius: 14px !important;
  background: var(--agk-composer) !important;
  box-shadow: var(--agk-lift);
  overflow: visible !important;
}

/* Row content: the glyph and its label are declared with no gap, so the text
   butts against the icon. Add breathing room WITHOUT touching layout — only
   the inline gap, scoped to this card. */
:root[data-hermes-theme='agk'] [data-slot='composer-status-card'] [class*='flex'] {
  column-gap: 8px;
}

/* Rows inside the stack keep their own padding but never their own chrome. */
:root[data-hermes-theme='agk'] [data-slot='composer-status-card'] > div {
  border: 0 !important;
  background: transparent !important;
}

/* NOTE: no rules for the rows inside the status stack.

   An earlier revision restyled them with two far-too-broad selectors keyed on
   the rounded-b-none utility alone. That class also dresses the git/diff strip,
   so the rules hit the git/diff summary row too and forced every control into
   a fixed 22px box. That is what clipped the branch name and the diff counts.

   status-row.tsx already lays these rows out; leave them to it. */
/* The composer separates its input row from its controls row with a border.
   Remove it: the surface already groups them and the rule reads as a seam. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] > *,
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] > * > * {
  border-top: 0 !important;
  border-bottom: 0 !important;
}

:root[data-hermes-theme='agk'] [data-slot='composer-surface'] hr,
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] [role='separator'] {
  display: none !important;
}

/* ── Composer ──────────────────────────────────────────────────────────────
   Modelled on the ChatGPT / Claude composer: a soft raised slab with a large
   radius, no visible border, the text field on its own line and the controls
   sitting flush underneath. Focus deepens the surface instead of drawing a
   coloured ring. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] {
  padding: 12px 12px 10px;
  border-radius: 22px;
  border: 0 !important;
  outline: 0 !important;
  background: var(--agk-composer);
  box-shadow: var(--agk-lift);
  transition: background-color 140ms ease, box-shadow 140ms ease;
}

:root[data-hermes-theme='agk'] [data-slot='composer-surface']:focus,
:root[data-hermes-theme='agk'] [data-slot='composer-surface']:focus-visible,
:root[data-hermes-theme='agk'] [data-slot='composer-surface']:focus-within {
  border: 0 !important;
  outline: 0 !important;
  background: var(--agk-composer-focus);
  box-shadow: var(--agk-lift) !important;
}

/* Control rows: real spacing, and a clean split between the leading tools and
   the trailing send cluster. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] [class*='flex']:has(> button + button) {
  gap: 10px;
}

:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button {
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

:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button:hover {
  background: var(--agk-hover);
  color: var(--ui-text-primary);
}

/* The send button is the one filled control in the whole app.

   The "it appears only when I type" effect is NOT a hidden button: read
   controls.tsx:75 — showVoicePrimary = !busy && !hasComposerPayload. Hermes
   SWAPS the primary control, rendering the voice button when the composer is
   empty and the submit button once there is text. Both use PRIMARY_ICON_BTN,
   sized via --composer-control-primary-size (falling back to
   --composer-control-size), and control-classes.ts:21 already keeps the
   disabled state at full opacity.

   So the layout shift comes from the two controls resolving to different
   widths, not from one appearing. Pin the primary slot to a fixed 32px box for
   every state — voice, send, stop — and nothing can move. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] {
  --composer-control-primary-size: 32px;
}

:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[type='submit'],
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[aria-label*='Send'],
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[class*='bg-foreground'],
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[class*='bg-primary'] {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  flex: 0 0 32px;
  opacity: 1 !important;
  visibility: visible !important;
  background: var(--agk-send) !important;
  color: var(--agk-send-ink) !important;
  transition: background-color 130ms ease, color 130ms ease;
}

:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[type='submit']:hover:not(:disabled),
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[aria-label*='Send']:hover:not(:disabled),
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[class*='bg-primary']:hover:not(:disabled) {
  filter: brightness(1.08);
}

/* Disabled send: present and legible, clearly not actionable. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[type='submit']:disabled,
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[aria-label*='Send']:disabled,
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] button[class*='bg-primary']:disabled {
  opacity: 1 !important;
  background: var(--agk-send-idle) !important;
  color: var(--agk-send-idle-ink) !important;
  cursor: default;
  filter: none !important;
}

/* Placeholder and text field sit flush: no inner box, no second border. */
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] textarea,
:root[data-hermes-theme='agk'] [data-slot='composer-surface'] input {
  padding-inline: 2px;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* ── Menus, popovers and buttons ───────────────────────────────────────────
   One raised surface, generous radius, hairline edge, no heavy chrome. Rows
   are borderless with a quiet hover — the Claude menu feel. */
:root[data-hermes-theme='agk'] [data-slot='dropdown-menu-content'],
:root[data-hermes-theme='agk'] [data-slot='context-menu-content'],
:root[data-hermes-theme='agk'] [data-slot='popover-content'],
:root[data-hermes-theme='agk'] [data-slot='dialog-content'],
:root[data-hermes-theme='agk'] [role='menu'] {
  padding: 5px;
  border: 1px solid var(--agk-hairline);
  border-radius: 13px;
  background: var(--agk-raised) !important;
  box-shadow: var(--agk-lift);
}

:root[data-hermes-theme='agk'] [role='menuitem'],
:root[data-hermes-theme='agk'] [data-slot='dropdown-menu-item'],
:root[data-hermes-theme='agk'] [data-slot='context-menu-item'] {
  min-height: 30px;
  border-radius: 8px;
  font-weight: 450;
}

:root[data-hermes-theme='agk'] [role='menuitem']:hover,
:root[data-hermes-theme='agk'] [data-slot='dropdown-menu-item']:hover,
:root[data-hermes-theme='agk'] [data-slot='context-menu-item']:hover {
  background: var(--agk-hover) !important;
}

/* Secondary buttons are quiet: no border, no shadow, hover-only surface. */
:root[data-hermes-theme='agk'] button:not(:disabled):not([class*='bg-primary']):not([data-tree-tab]) {
  border-radius: 8px;
  box-shadow: none !important;
}

:root[data-hermes-theme='agk'] input,
:root[data-hermes-theme='agk'] [data-slot='input'] {
  border-radius: 9px;
  border-color: var(--agk-hairline);
  background: var(--agk-shell);
}

/* ── Status bar ────────────────────────────────────────────────────────────
   A hairline strip flush with the shell, not a floating pill. */
:root[data-hermes-theme='agk'] [data-slot='statusbar'] {
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
  background: var(--agk-shell) !important;
  box-shadow: none !important;
}

/* ── Focus discipline ──────────────────────────────────────────────────────
   No coloured ring, but keyboard focus must remain visible. Pointer focus is
   quiet; focus-visible gets a neutral inset marker that does not alter layout. */
:root[data-hermes-theme='agk'] *:focus:not(:focus-visible) {
  outline: none;
}

:root[data-hermes-theme='agk'] *:focus-visible:not([data-slot='composer-rich-input']):not([data-slot='composer-surface']) {
  outline: none !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-text-primary) 22%, transparent) inset !important;
}

/* The message editor is a contenteditable div, not an input/textarea. It must
   remain completely borderless in every editing state. */
:root[data-hermes-theme='agk'] [data-slot='composer-rich-input'],
:root[data-hermes-theme='agk'] [data-slot='composer-rich-input']:focus,
:root[data-hermes-theme='agk'] [data-slot='composer-rich-input']:focus-visible,
:root[data-hermes-theme='agk'] [data-slot='composer-rich-input']:active {
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* AGK session rows stay quiet: the relative age ("now", "2d", …) is metadata,
   not navigation, and the user explicitly does not want it in the left menu. */
:root[data-hermes-theme='agk'] [data-row-actions] time {
  display: none !important;
}

:root[data-hermes-theme='agk'] ::selection {
  background: color-mix(in srgb, var(--agk-accent) 20%, transparent);
}

:root[data-hermes-theme='agk'] ::-webkit-scrollbar-thumb {
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

function activate(ctx, message = true) {
  ctx.storage.set('enabled-v1', true)
  const ok = requestTheme(ID)
  if (message) {
    host.notify({
      kind: ok ? 'success' : 'error',
      message: ok ? 'AGK theme activated.' : 'AGK theme is not available.'
    })
  }
  return ok
}

function restoreDefault(ctx) {
  ctx.storage.set('enabled-v1', false)
  const ok = requestTheme('nous')
  host.notify({
    kind: ok ? 'success' : 'error',
    message: ok ? 'Default Hermes theme restored.' : 'Default Hermes theme is not available.'
  })
}

export default {
  id: ID,
  name: 'AGK Theme',
  description: 'AGK surface: neutral zinc OpenAI palette on the Claude Code layout — flat panes, quiet chrome, one raised composer.',
  register(ctx) {
    // AGK is the default surface: it auto-activates on first load, exactly the
    // way openai-shadcn used to. The user can still switch away from the
    // palette, and that choice is remembered via storage.
    ctx.register({ id: 'theme', area: THEMES_AREA, data: theme })
    installStyle(ctx)

    ctx.registerMany([
      {
        id: 'activate',
        area: PALETTE_AREA,
        data: {
          id: 'agk.activate',
          label: 'Theme: activate AGK',
          keywords: ['theme', 'appearance', 'agk', 'zinc', 'openai', 'neutral', 'default'],
          run: () => activate(ctx, true)
        }
      },
      {
        id: 'restore-default',
        area: PALETTE_AREA,
        data: {
          id: 'agk.restore-default',
          label: 'Theme: return to Hermes default',
          keywords: ['theme', 'appearance', 'default', 'rollback', 'nous'],
          run: () => restoreDefault(ctx)
        }
      }
    ])

    // FIRST LOAD ONLY. AGK is the default surface, so it claims the theme once,
    // on the very first boot that ever sees this plugin. It must not claim it
    // again on every boot after that: requestTheme persists the choice per
    // profile (themes/request.ts), so Hermes already restores AGK by itself —
    // and re-claiming would overwrite a user who deliberately switched to
    // another theme, every single launch, with no way to make it stick.
    if (ctx.storage.get('enabled-v1', null) === null) {
      ctx.storage.set('enabled-v1', true)
      queueMicrotask(() => activate(ctx, false))
    }
  }
}
