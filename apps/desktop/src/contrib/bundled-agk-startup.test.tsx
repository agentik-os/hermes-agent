import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./runtime-loader', () => ({ watchRuntimePlugins: vi.fn() }))

const REQUIRED = ['agk', 'account-resource-footer', 'agk-surface-prototype', 'bot-sessions']

async function bootBundledDesktop() {
  vi.resetModules()
  const store = await import('./plugins-store')
  const decisions = JSON.parse(localStorage.getItem('hermes.desktop.pluginDecisions.v2') ?? '{}')
  store.$pluginDecisions.set(decisions)

  const themeModule = await import('@/themes/context')
  const { discoverBundledPlugins } = await import('./plugins')
  let themeName = ''

  function Probe() {
    themeName = themeModule.useTheme().themeName

    return null
  }

  const view = render(
    <themeModule.ThemeProvider>
      <Probe />
    </themeModule.ThemeProvider>
  )

  act(() => discoverBundledPlugins())
  await waitFor(() => expect(themeName).toBe('agk'))

  const records = store.$pluginRecords.get()

  for (const id of REQUIRED) {
    expect(records[id]).toMatchObject({ kind: 'bundled', required: true, status: 'loaded' })
  }

  expect(store.$pluginDecisions.get()).toEqual({})

  view.unmount()
}

describe('real bundled AGK startup', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('heals stale theme/plugin state on first boot and remains AGK on the next boot', async () => {
    localStorage.setItem('hermes-desktop-theme-v2', 'nous')
    localStorage.setItem('hermes.plugin.agk.enabled-v1', 'false')
    localStorage.setItem(
      'hermes.desktop.pluginDecisions.v2',
      JSON.stringify(Object.fromEntries(REQUIRED.map(id => [id, false])))
    )

    await bootBundledDesktop()

    expect(localStorage.getItem('hermes-desktop-theme-v2')).toBe('agk')
    expect(localStorage.getItem('hermes.plugin.agk.enabled-v1')).toBe('true')
    expect(localStorage.getItem('hermes.desktop.pluginDecisions.v2')).toBe('{}')

    await bootBundledDesktop()
    expect(localStorage.getItem('hermes-desktop-theme-v2')).toBe('agk')
  })
})
