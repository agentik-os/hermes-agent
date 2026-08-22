import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registry } from '@/contrib/registry'

import { skinPref, ThemeProvider, useTheme } from './context'
import { THEMES_AREA } from './user-themes'

/**
 * A desktop plugin's theme does not exist when the boot paint resolves the
 * persisted skin: plugins are read off disk and evaluated long after first
 * render. `normalizeSkin` coerces any name it cannot resolve to the default, so
 * the user's choice was dropped on every launch and never re-read — the only
 * re-read was on a PROFILE switch.
 *
 * That is why plugin themes "would not stick", and why the plugins shipping
 * them re-claimed the theme on every boot to compensate, overwriting anyone who
 * had deliberately switched away.
 */
const agk = {
  name: 'agk-test-theme',
  label: 'AGK Test',
  description: 'contributed by a desktop plugin',
  colors: {
    background: '#f7f7f8',
    foreground: '#18181b',
    primary: '#18181b'
  }
}

let ctx: ReturnType<typeof useTheme>
let disposeTheme: (() => void) | null = null

/** Register the plugin's theme the way `ctx.register` does — and keep the
 *  disposer, which is the only public way back out of the registry. */
const contributeTheme = (theme: Record<string, unknown>) => {
  disposeTheme = registry.register({ area: THEMES_AREA, data: theme, id: 'late-theme' })
}

function Probe() {
  ctx = useTheme()

  return null
}

describe('a theme contributed after boot', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    disposeTheme?.()
    disposeTheme = null
  })

  const renderProbe = () =>
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )

  it('is adopted once the plugin registers it, without a relaunch', () => {
    // What the previous session persisted, before the plugin was evaluated.
    skinPref.assign('default', agk.name)

    renderProbe()

    // Boot paint: the name resolves to nothing yet, so it reads as the default.
    expect(ctx.themeName).not.toBe(agk.name)

    act(() => contributeTheme(agk))

    expect(ctx.themeName).toBe(agk.name)
  })

  it('leaves the stored preference intact while it is unresolvable', () => {
    skinPref.assign('default', agk.name)
    renderProbe()

    // The downgrade is a paint decision, never a write: the raw preference has
    // to survive, or there is nothing left to adopt.
    expect(window.localStorage.getItem('hermes-desktop-theme-v2')).toBe(agk.name)
  })

  it('does not overwrite a deliberate in-session switch', () => {
    skinPref.assign('default', agk.name)
    renderProbe()

    act(() => ctx.setTheme('mono'))
    expect(ctx.themeName).toBe('mono')

    // The plugin loads a moment later. It must not drag the user back.
    act(() => contributeTheme(agk))

    expect(ctx.themeName).toBe('mono')
  })

  it('never resurrects a retired skin name', () => {
    skinPref.assign('default', 'gold')
    renderProbe()

    const painted = ctx.themeName

    act(() => contributeTheme({ ...agk, name: 'gold' }))

    expect(ctx.themeName).toBe(painted)
    expect(ctx.themeName).not.toBe('gold')
  })
})
