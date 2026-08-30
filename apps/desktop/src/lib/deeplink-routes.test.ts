import { describe, expect, it } from 'vitest'

import { resolveDeepLinkAction } from './deeplink-routes'

describe('resolveDeepLinkAction', () => {
  it('routes unified plugin install deeplinks', () => {
    expect(
      resolveDeepLinkAction({
        kind: 'plugin',
        name: 'install',
        params: { repo: 'owner/repo', enable: '0', force: '1' }
      })
    ).toEqual({
      type: 'plugin-install',
      repo: 'owner/repo',
      enable: false,
      force: true,
      legacyHint: null
    })
  })

  it('routes legacy plugin-agent alias', () => {
    expect(
      resolveDeepLinkAction({
        kind: 'plugin-agent',
        name: '',
        params: { repo: 'owner/repo' }
      })
    ).toMatchObject({ type: 'plugin-install', legacyHint: 'agent' })
  })

  it('routes a credential-free HTTPS gateway pairing link for confirmation', () => {
    expect(
      resolveDeepLinkAction({
        kind: 'gateway',
        name: 'add',
        params: { url: 'https://station.example:8463', label: 'Station VPS', auth: 'oauth' }
      })
    ).toEqual({ type: 'gateway-pair', url: 'https://station.example:8463', label: 'Station VPS', authMode: 'oauth' })
  })

  it('rejects unsafe gateway pairing links', () => {
    expect(
      resolveDeepLinkAction({
        kind: 'gateway',
        name: 'add',
        params: { url: 'http://station.example:8463', label: 'Station VPS', auth: 'oauth' }
      })
    ).toEqual({ type: 'ignore' })
    expect(
      resolveDeepLinkAction({
        kind: 'gateway',
        name: 'add',
        params: { url: 'https://user:pass@station.example', label: 'Station VPS', auth: 'oauth' }
      })
    ).toEqual({ type: 'ignore' })
  })

  it('routes blueprint composer inserts', () => {
    expect(
      resolveDeepLinkAction({
        kind: 'blueprint',
        name: 'morning-brief',
        params: { time: '08:00' }
      })
    ).toEqual({
      type: 'composer-blueprint',
      name: 'morning-brief',
      params: { time: '08:00' }
    })
  })
})
