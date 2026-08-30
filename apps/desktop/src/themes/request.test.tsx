import { act, cleanup, render } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registry } from '@/contrib/registry'
import { $activeGatewayProfile } from '@/store/profile'

import { __resetBackendSkinSync } from './backend-sync'
import { skinPref, ThemeProvider, useTheme } from './context'
import { midnightTheme } from './presets'
import { requestDefaultTheme, requestTheme } from './request'
import type { DesktopTheme } from './types'
import { THEMES_AREA } from './user-themes'

const cssVar = (name: string) => window.document.documentElement.style.getPropertyValue(name)

describe('requestTheme', () => {
  let ctx: ReturnType<typeof useTheme>

  function Probe() {
    ctx = useTheme()

    return null
  }

  const renderProbe = () =>
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )

  beforeEach(() => {
    window.localStorage.clear()
    __resetBackendSkinSync()
    $activeGatewayProfile.set('default')
  })

  afterEach(cleanup)

  it('switches the painted theme from outside React', () => {
    renderProbe()

    let accepted = false
    act(() => {
      accepted = requestTheme('mono')
    })

    expect(accepted).toBe(true)
    expect(ctx.themeName).toBe('mono')
  })

  // The imperative door must land in the same place the React one does, or a
  // plugin-driven switch would evaporate on the next profile read.
  it('persists per profile like a manual pick', () => {
    renderProbe()

    act(() => void requestTheme('midnight'))

    expect(skinPref.resolve('default')).toBe('midnight')
  })

  it('refuses a name that does not resolve, leaving the appearance untouched', () => {
    renderProbe()

    act(() => void requestTheme('mono'))
    const painted = cssVar('--theme-foreground')

    let accepted = true
    act(() => {
      accepted = requestTheme('a-theme-nobody-installed')
    })

    expect(accepted).toBe(false)
    expect(ctx.themeName).toBe('mono')
    expect(cssVar('--theme-foreground')).toBe(painted)
  })

  // The whole plugin loop: contribute a palette through THEMES_AREA, then
  // activate it on an event with no component in scope.
  it('activates a theme contributed through the registry', () => {
    const zeus: DesktopTheme = { ...midnightTheme, description: 'Zeus', label: 'Zeus', name: 'zeus' }
    const dispose = registry.register({ area: THEMES_AREA, data: zeus, id: 'zeus' })

    renderProbe()

    let accepted = false
    act(() => {
      accepted = requestTheme('zeus')
    })

    expect(accepted).toBe(true)
    expect(ctx.themeName).toBe('zeus')

    dispose()
  })

  describe('requestDefaultTheme', () => {
    const openAiShadcn: DesktopTheme = {
      ...midnightTheme,
      description: 'OpenAI Shadcn',
      label: 'OpenAI Shadcn',
      name: 'openai-shadcn'
    }

    it('claims an unassigned new profile and persists the default there', () => {
      const dispose = registry.register({ area: THEMES_AREA, data: openAiShadcn, id: 'openai-shadcn' })
      $activeGatewayProfile.set('new-profile')
      renderProbe()

      act(() => void requestDefaultTheme('openai-shadcn'))

      expect(ctx.themeName).toBe('openai-shadcn')
      expect(skinPref.raw('new-profile')).toBe('openai-shadcn')
      dispose()
    })

    it('never overwrites an existing persisted preference', () => {
      const dispose = registry.register({ area: THEMES_AREA, data: openAiShadcn, id: 'openai-shadcn' })
      skinPref.assign('default', 'mono')
      renderProbe()

      act(() => void requestDefaultTheme('openai-shadcn'))

      expect(ctx.themeName).toBe('mono')
      expect(skinPref.raw('default')).toBe('mono')
      dispose()
    })

    it('does not let a queued default race a newer explicit preference', () => {
      const dispose = registry.register({ area: THEMES_AREA, data: openAiShadcn, id: 'openai-shadcn' })

      expect(requestDefaultTheme('openai-shadcn')).toBe(true)
      skinPref.assign('default', 'mono')
      renderProbe()

      expect(ctx.themeName).toBe('mono')
      expect(skinPref.raw('default')).toBe('mono')
      dispose()
    })

    it('does not let a stale passive drain erase a newer explicit request', () => {
      const dispose = registry.register({ area: THEMES_AREA, data: openAiShadcn, id: 'openai-shadcn' })

      function ExplicitOverride() {
        useLayoutEffect(() => void requestTheme('mono'), [])

        return null
      }

      expect(requestDefaultTheme('openai-shadcn')).toBe(true)
      render(
        <ThemeProvider>
          <ExplicitOverride />
          <Probe />
        </ThemeProvider>
      )

      expect(ctx.themeName).toBe('mono')
      expect(skinPref.raw('default')).toBe('mono')
      dispose()
    })

    it('does not persist a fallback if the offered theme disappears before the request drains', () => {
      const dispose = registry.register({ area: THEMES_AREA, data: openAiShadcn, id: 'openai-shadcn' })

      expect(requestDefaultTheme('openai-shadcn')).toBe(true)
      dispose()
      renderProbe()

      expect(ctx.themeName).toBe('nous')
      expect(skinPref.raw('default')).toBeNull()
    })
  })
})
