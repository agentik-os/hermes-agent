import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./runtime-loader', () => ({ watchRuntimePlugins: vi.fn() }))

const REQUIRED = ['agk', 'account-resource-footer']

async function bootBundledDesktop(expectedTheme: string) {
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
  await waitFor(() => expect(themeName).toBe(expectedTheme))

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

  it('registers required product plugins without creating a theme preference on first boot', async () => {
    localStorage.setItem('hermes.plugin.agk.enabled-v1', 'false')
    localStorage.setItem(
      'hermes.desktop.pluginDecisions.v2',
      JSON.stringify(Object.fromEntries(REQUIRED.map(id => [id, false])))
    )

    await bootBundledDesktop('nous')

    expect(localStorage.getItem('hermes-desktop-theme-v2')).toBeNull()
    expect(localStorage.getItem('hermes.plugin.agk.enabled-v1')).toBe('true')
    expect(localStorage.getItem('hermes.desktop.pluginDecisions.v2')).toBe('{}')
  })

  it('preserves an existing persisted theme across boots', async () => {
    localStorage.setItem('hermes-desktop-theme-v2', 'mono')

    await bootBundledDesktop('mono')
    expect(localStorage.getItem('hermes-desktop-theme-v2')).toBe('mono')

    await bootBundledDesktop('mono')
    expect(localStorage.getItem('hermes-desktop-theme-v2')).toBe('mono')
  })
})
