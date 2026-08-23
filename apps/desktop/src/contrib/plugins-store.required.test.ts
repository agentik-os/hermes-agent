import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $pluginDecisions,
  $pluginRecords,
  enforceRequiredPluginDecision,
  publishPlugin,
  setPluginEnabled
} from './plugins-store'

describe('required bundled plugins', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $pluginDecisions.set({})
    $pluginRecords.set({})
  })

  it.each([
    ['v2 decision', 'hermes.desktop.pluginDecisions.v2', JSON.stringify({ agk: false })],
    ['legacy migrated decision', 'hermes.desktop.disabledPlugins.v1', JSON.stringify(['agk'])]
  ])('removes a stale required=false %s so the next boot stays healed', (_label, key, value) => {
    window.localStorage.setItem(key, value)
    $pluginDecisions.set({ agk: false })

    enforceRequiredPluginDecision('agk')

    expect($pluginDecisions.get().agk).toBeUndefined()
    expect(JSON.parse(window.localStorage.getItem('hermes.desktop.pluginDecisions.v2') ?? '{}').agk).toBeUndefined()
  })

  it('cannot be disabled because it is product chrome, not an optional extension', async () => {
    const activate = vi.fn()
    const deactivate = vi.fn()

    publishPlugin(
      {
        id: 'agk',
        kind: 'bundled',
        name: 'AGK Theme',
        required: true,
        status: 'loaded'
      } as never,
      { activate, deactivate }
    )

    await setPluginEnabled('agk', false)

    expect(deactivate).not.toHaveBeenCalled()
    expect($pluginRecords.get().agk.status).toBe('loaded')
    expect($pluginDecisions.get().agk).not.toBe(false)
  })
})
