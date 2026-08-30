import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })

  return { promise, resolve }
}

const harness = vi.hoisted(() => ({
  activeConnectionId: vi.fn(),
  connections: vi.fn(),
  notify: vi.fn(),
  openExternal: vi.fn(),
  profileRoutes: vi.fn(),
  request: vi.fn(),
  requestProfile: vi.fn(),
  states: {} as Record<string, { get: () => unknown; set: (value: unknown) => void }>,
  writeClipboard: vi.fn()
}))

vi.mock('@hermes/plugin-sdk', async importOriginal => {
  const actual = (await importOriginal()) as any
  const React = await import('react')

  const states = {
    activeSessionId: actual.atom('primary-session'),
    connectionId: actual.atom('local'),
    focusedSessionId: actual.atom('focused-session'),
    focusedSessionProfile: actual.atom('default'),
    focusedUsage: actual.atom({}),
    gateway: actual.atom('open'),
    profile: actual.atom('default')
  }

  Object.assign(harness.states, states)
  const pass = ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children)

  return {
    ...actual,
    Codicon: () => null,
    Popover: pass,
    PopoverContent: pass,
    PopoverTrigger: pass,
    host: {
      ...actual.host,
      activeConnectionId: harness.activeConnectionId,
      connections: harness.connections,
      notify: harness.notify,
      profileRoutes: harness.profileRoutes,
      request: harness.request,
      requestProfile: harness.requestProfile,
      state: { ...actual.host.state, ...states }
    }
  }
})

// Bundled SDK-consumer plugins intentionally remain plain JS for disk-door compatibility.
// @ts-expect-error The adjacent plugin.js has no standalone declaration file.
import plugin from './plugin.js'

const oldRoute = { connectionId: 'local', profile: 'default', targetProfile: 'default' }

function mountFooter() {
  let footer: { render: () => React.ReactNode } | undefined
  plugin.register({
    onDispose: vi.fn(),
    os: { openExternal: harness.openExternal, writeClipboard: harness.writeClipboard },
    register: (contribution: { id: string; render: () => React.ReactNode }) => {
      if (contribution.id === 'footer') {footer = contribution}

      return vi.fn()
    },
    registerMany: vi.fn(),
    storage: { get: vi.fn(), remove: vi.fn(), set: vi.fn() }
  } as never)

  if (!footer) {throw new Error('footer contribution missing')}

  return render(footer.render())
}

function setScope(connectionId: string, profile: string) {
  act(() => {
    harness.states.connectionId.set(connectionId)
    harness.states.focusedSessionProfile.set(profile)
    harness.states.profile.set(profile)
  })
}

function installBaseHost() {
  harness.activeConnectionId.mockImplementation(() => harness.states.connectionId.get())
  harness.connections.mockResolvedValue([{ id: 'local', kind: 'local', label: 'Local' }])
  harness.openExternal.mockResolvedValue(true)
  harness.profileRoutes.mockImplementation(async () => {
    const connectionId = String(harness.states.connectionId.get())
    const profile = String(harness.states.profile.get())

    return [{ connectionId, profile, targetProfile: profile }]
  })
  harness.request.mockImplementation(async (method: string) => {
    if (method === 'auth.accounts') {return { accounts: [] }}

    if (method === 'auth.cli.accounts') {return { accounts: [] }}

    return null
  })
  harness.requestProfile.mockImplementation(async (_route, method, params) =>
    harness.request(method, params)
  )
}

describe('account and resources footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    harness.states.activeSessionId.set('primary-session')
    harness.states.focusedSessionId.set('focused-session')
    setScope('local', 'default')
    installBaseHost()
  })

  afterEach(() => {
    const close = screen.queryByRole('button', { name: 'Close authorization' })

    if (close) {fireEvent.click(close)}
    cleanup()
  })

  it('renders each account quota and Claude Code Max status before selection', async () => {
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        return {
          accounts: [{
            id: 'simono',
            label: 'Simono',
            active: true,
            preferred: true,
            status: 'ok',
            usage: {
              plan: 'plus',
              windows: [{ label: '5h', remaining_percent: 79, used_percent: 21 }]
            }
          }]
        }
      }

      if (method === 'auth.accounts') {return { accounts: [] }}

      if (method === 'auth.cli.accounts') {
        return {
          accounts: [
            { authMethod: 'claude.ai', label: 'default', loggedIn: true, subscriptionType: 'max' },
            { authMethod: null, label: 'moonbase', loggedIn: false, subscriptionType: null }
          ]
        }
      }

      return null
    })

    mountFooter()

    const simono = await screen.findByRole('button', { name: /Simono/ })
    expect(within(simono).getByText('OpenAI plus · ok')).toBeTruthy()
    expect(within(simono).getByText('21% used · 79% left')).toBeTruthy()
    expect((await screen.findByRole('button', { name: /Default Claude Code/ })).textContent).toContain('Claude Code · MAX · connected')
    expect(screen.getByRole('button', { name: /moonbase/ }).textContent).toContain('Claude Code · logged out')
    expect(screen.getByRole('button', { name: 'Connect Anthropic API' })).toBeTruthy()
    expect(harness.request).not.toHaveBeenCalledWith('auth.accounts', expect.objectContaining({ action: 'use' }))
  })

  it('labels durable preference separately from the credential active in the gateway chat', async () => {
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        return {
          accounts: [
            {
              active: false,
              id: 'agentik',
              label: 'Agentik',
              preferred: true,
              status: 'exhausted'
            },
            {
              active: true,
              id: 'simono',
              label: 'Simono',
              preferred: false,
              status: 'ok'
            }
          ]
        }
      }

      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}

      return null
    })

    mountFooter()

    const preferred = await screen.findByRole('button', { name: /Agentik/ })
    const active = screen.getByRole('button', { name: /Simono/ })
    expect(within(preferred).getByText('PREFERRED')).toBeTruthy()
    expect(within(active).getByText('ACTIVE')).toBeTruthy()
    expect(harness.request).toHaveBeenCalledWith('auth.accounts', {
      action: 'list',
      profile: 'default',
      provider: 'openai-codex',
      session_id: 'primary-session'
    })
  })

  it('keeps the newest account refresh when an older request resolves last in the same scope', async () => {
    const firstUsage = deferred<{ provider: string; windows: unknown[] }>()
    const firstUsageStarted = vi.fn()
    let accountUsageCalls = 0
    let openAiListCalls = 0

    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'account.usage') {
        accountUsageCalls += 1
        if (accountUsageCalls === 1) {
          firstUsageStarted()

          return firstUsage.promise
        }

        return { provider: 'openai-codex', windows: [] }
      }

      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        openAiListCalls += 1

        return {
          accounts: [{
            id: openAiListCalls === 1 ? 'stale-a' : 'fresh-b',
            label: openAiListCalls === 1 ? 'Stale A' : 'Fresh B',
            preferred: true,
            status: 'ok'
          }]
        }
      }

      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}

      return null
    })

    mountFooter()
    await waitFor(() => expect(firstUsageStarted).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('button', { name: /Fresh B/ })).toBeTruthy()
    await act(async () => {
      firstUsage.resolve({ provider: 'openai-codex', windows: [] })
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /Fresh B/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Stale A/ })).toBeNull()
  })

  it('disables account cards while one switch is in flight', async () => {
    const switching = deferred<{ accounts: unknown[]; pending_session_id?: string }>()
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.action === 'use') {return switching.promise}
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        return { accounts: [{ id: 'simono', label: 'Simono', preferred: true, status: 'ok' }] }
      }
      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}
      if (method === 'account.usage') {return { provider: 'openai-codex', windows: [] }}

      return null
    })

    mountFooter()
    const simono = await screen.findByRole('button', { name: /Simono/ })
    fireEvent.click(simono)

    await waitFor(() => expect((simono as HTMLButtonElement).disabled).toBe(true))
    fireEvent.click(simono)
    expect(harness.request.mock.calls.filter(([method, params]) =>
      method === 'auth.accounts' && params?.action === 'use')).toHaveLength(1)
    expect(harness.request).toHaveBeenCalledWith('auth.accounts', {
      action: 'use',
      provider: 'openai-codex',
      credential_id: 'simono',
      profile: 'default',
      session_id: 'primary-session'
    })

    switching.resolve({ accounts: [], pending_session_id: 'primary-session' })
    await waitFor(() => expect((simono as HTMLButtonElement).disabled).toBe(false))
    expect(harness.notify).toHaveBeenCalledWith({
      kind: 'success',
      message: 'OpenAI account will apply to the active chat on its next turn.'
    })
  })

  it('does not refresh an old account scope after the active chat changes during USE', async () => {
    const switching = deferred<{ accounts: unknown[]; pending_session_id?: string }>()
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.action === 'use') {return switching.promise}
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        const sessionId = String(params?.session_id || '')

        return {
          accounts: [{
            active: true,
            id: sessionId === 'session-b' ? 'account-b' : 'account-a',
            label: sessionId === 'session-b' ? 'Account B' : 'Account A',
            preferred: true,
            status: 'ok'
          }]
        }
      }
      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}

      return null
    })

    harness.states.activeSessionId.set('session-a')
    mountFooter()
    fireEvent.click(await screen.findByRole('button', { name: /Account A/ }))
    await waitFor(() => expect(harness.request).toHaveBeenCalledWith(
      'auth.accounts',
      expect.objectContaining({ action: 'use', session_id: 'session-a' })
    ))

    act(() => { harness.states.activeSessionId.set('session-b') })
    expect(await screen.findByRole('button', { name: /Account B/ })).toBeTruthy()
    const oldListCallsBeforeResolve = harness.request.mock.calls.filter(([method, params]) =>
      method === 'auth.accounts' && params?.action === 'list' && params?.session_id === 'session-a').length

    switching.resolve({ accounts: [], pending_session_id: 'session-a' })
    await act(async () => { await Promise.resolve() })

    const oldListCallsAfterResolve = harness.request.mock.calls.filter(([method, params]) =>
      method === 'auth.accounts' && params?.action === 'list' && params?.session_id === 'session-a').length
    expect(oldListCallsAfterResolve).toBe(oldListCallsBeforeResolve)
    expect(screen.getByRole('button', { name: /Account B/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Account A/ })).toBeNull()
  })

  it('pins USE to the gateway route that was active when the click started', async () => {
    const oldRouteLookup = deferred<Array<typeof oldRoute>>()
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        return {
          accounts: [{
            active: true,
            id: 'account-a',
            label: 'Account A',
            preferred: true,
            status: 'ok'
          }]
        }
      }
      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}

      return null
    })

    mountFooter()
    const accountA = await screen.findByRole('button', { name: /Account A/ })
    harness.requestProfile.mockImplementation(async (route, method, params) => {
      if (method === 'auth.accounts' && params?.action === 'use') {
        return { accounts: [], pending_session_id: params.session_id, route }
      }

      return harness.request(method, params)
    })
    harness.profileRoutes.mockImplementationOnce(() => oldRouteLookup.promise)
    fireEvent.click(accountA)

    setScope('remote', 'default')
    act(() => { harness.states.activeSessionId.set('session-b') })
    oldRouteLookup.resolve([oldRoute])

    await waitFor(() => expect(harness.requestProfile).toHaveBeenCalledWith(
      oldRoute,
      'auth.accounts',
      expect.objectContaining({
        action: 'use',
        credential_id: 'account-a',
        profile: 'default',
        session_id: 'primary-session'
      })
    ))
    expect(harness.request.mock.calls.some(([method, params]) =>
      method === 'auth.accounts' && params?.action === 'use')).toBe(false)
    expect(harness.notify).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }))
  })

  it('does not announce an overlapping selection that the backend superseded', async () => {
    harness.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.accounts' && params?.action === 'use') {
        return { accounts: [], superseded: true }
      }
      if (method === 'auth.accounts' && params?.provider === 'openai-codex') {
        return { accounts: [{ id: 'simono', label: 'Simono', preferred: true, status: 'ok' }] }
      }
      if (method === 'auth.accounts') {return { accounts: [] }}
      if (method === 'auth.cli.accounts') {return { accounts: [] }}

      return null
    })

    mountFooter()
    fireEvent.click(await screen.findByRole('button', { name: /Simono/ }))

    await waitFor(() => expect(harness.request).toHaveBeenCalledWith(
      'auth.accounts',
      expect.objectContaining({ action: 'use', credential_id: 'simono' })
    ))
    await act(async () => { await Promise.resolve() })
    expect(harness.notify).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }))
  })

  it('starts a named Claude Code login through the route-pinned CLI broker', async () => {
    harness.requestProfile.mockImplementation(async (route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.cli.start') {
        return { auth_url: 'https://claude.example/authorize', expects_code: true, session_id: 'cli-named' }
      }

      if (method === 'auth.cli.poll') {return new Promise(() => undefined)}

      return harness.request(method, params)
    })

    mountFooter()
    fireEvent.change(screen.getByLabelText('New Claude Code profile name'), { target: { value: 'Simono' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect Claude Code' }))

    expect(await screen.findByRole('dialog', { name: 'Connect Claude Code · simono' })).toBeTruthy()
    expect(screen.getByLabelText('Claude Code authorization code')).toBeTruthy()
    expect(harness.requestProfile).toHaveBeenCalledWith(oldRoute, 'auth.cli.start', {
      account_id: 'simono',
      profile: 'default',
      provider: 'claude-code'
    })
    expect(screen.getByRole('button', { name: 'Connect Anthropic API' })).toBeTruthy()
  })

  it('resolves authorization by desktop profile and uses its backend target', async () => {
    const wantedRoute = {
      connectionId: 'local',
      profile: 'work',
      targetProfile: 'backend-work'
    }
    setScope('local', 'work')
    harness.profileRoutes.mockResolvedValue([
      { connectionId: 'local', profile: 'other', targetProfile: 'work' },
      wantedRoute
    ])
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.oauth.start') {
        return { auth_url: 'https://openai.example/authorize', flow: 'pkce', session_id: 'strict-route' }
      }

      return harness.request(method, params)
    })

    mountFooter()
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))

    expect(await screen.findByRole('dialog', { name: 'Connect OpenAI' })).toBeTruthy()
    expect(harness.requestProfile).toHaveBeenCalledWith(
      wantedRoute,
      'auth.oauth.start',
      { provider: 'openai-codex', profile: 'backend-work' }
    )
    expect(harness.request).toHaveBeenCalledWith('account.usage', {
      profile: 'backend-work'
    })
  })

  it('fails closed when the focused profile route is ambiguous', async () => {
    setScope('local', 'work')
    harness.profileRoutes.mockResolvedValue([
      { connectionId: 'local', profile: 'work', targetProfile: 'backend-a' },
      { connectionId: 'local', profile: 'work', targetProfile: 'backend-b' }
    ])

    mountFooter()
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))

    await waitFor(() => expect(harness.notify).toHaveBeenCalledWith({
      kind: 'error',
      message: 'The active gateway route is ambiguous.'
    }))
    expect(harness.requestProfile.mock.calls.some(([, method]) => method === 'auth.oauth.start')).toBe(false)
  })

  it('keeps the modal and pasted code through browser focus loss, scope changes, remount and approval', async () => {
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.oauth.start') {
        return { auth_url: 'https://openai.example/authorize', flow: 'pkce', session_id: 'pkce-persistent' }
      }

      if (method === 'auth.oauth.submit') {return { status: 'approved' }}

      return harness.request(method, params)
    })

    const mounted = mountFooter()
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))
    const codeInput = await screen.findByLabelText('OpenAI authorization code')
    fireEvent.change(codeInput, { target: { value: 'persist-me' } })
    fireEvent.blur(codeInput)
    fireEvent.click(screen.getByRole('button', { name: 'Open authorization page' }))

    expect(harness.openExternal).toHaveBeenCalledWith('https://openai.example/authorize')
    expect((screen.getByLabelText('OpenAI authorization code') as HTMLInputElement).value).toBe('persist-me')

    setScope('remote', 'other-profile')
    expect(screen.getByRole('dialog', { name: 'Connect OpenAI' })).toBeTruthy()
    expect((screen.getByLabelText('OpenAI authorization code') as HTMLInputElement).value).toBe('persist-me')

    mounted.unmount()
    mountFooter()
    expect(screen.getByRole('dialog', { name: 'Connect OpenAI' })).toBeTruthy()
    expect((screen.getByLabelText('OpenAI authorization code') as HTMLInputElement).value).toBe('persist-me')

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(await screen.findByRole('button', { name: 'Done' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Connect OpenAI' })).toBeTruthy()
    expect((screen.getByLabelText('OpenAI authorization code') as HTMLInputElement).value).toBe('persist-me')

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Connect OpenAI' })).toBeNull())
    expect(harness.requestProfile).toHaveBeenCalledWith(oldRoute, 'auth.oauth.submit', expect.objectContaining({
      code: 'persist-me',
      session_id: 'pkce-persistent'
    }))
    expect(harness.requestProfile).toHaveBeenCalledWith(oldRoute, 'auth.oauth.cancel', expect.objectContaining({
      session_id: 'pkce-persistent'
    }))
  })

  it('explicit close releases busy while a submit request is still pending', async () => {
    const submitting = deferred<{ status: string }>()
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.oauth.start') {
        return { auth_url: 'https://openai.example/authorize', flow: 'pkce', session_id: 'pkce-slow' }
      }
      if (method === 'auth.oauth.submit') {return submitting.promise}

      return harness.request(method, params)
    })

    mountFooter()
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))
    fireEvent.change(await screen.findByLabelText('OpenAI authorization code'), { target: { value: 'slow-code' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Connect OpenAI' }) as HTMLButtonElement).disabled).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: 'Close authorization' }))
    expect(screen.queryByRole('dialog', { name: 'Connect OpenAI' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Connect OpenAI' }) as HTMLButtonElement).disabled).toBe(false)

    submitting.resolve({ status: 'approved' })
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('dialog', { name: 'Connect OpenAI' })).toBeNull()
  })

  it('scope change before submit keeps the pinned result out of the new account view', async () => {
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.oauth.start') {
        return { auth_url: 'https://openai.example/authorize', flow: 'pkce', session_id: 'pkce-old-scope' }
      }

      if (method === 'auth.oauth.submit') {return { status: 'approved' }}

      return harness.request(method, params)
    })

    mountFooter()
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))
    fireEvent.change(await screen.findByLabelText('OpenAI authorization code'), { target: { value: 'old-scope-code' } })

    setScope('remote', 'other-profile')
    expect(screen.getByRole('status').textContent).toContain('Authorization remains pinned to default on local')
    await waitFor(() => {
      const refreshes = harness.request.mock.calls.filter(([method]) => method === 'account.usage')
      expect(refreshes.length).toBeGreaterThanOrEqual(2)
    })
    harness.request.mockClear()
    harness.notify.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(await screen.findByRole('button', { name: 'Done' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Switch back to refresh that account view.')
    expect(harness.requestProfile).toHaveBeenCalledWith(oldRoute, 'auth.oauth.submit', expect.objectContaining({
      code: 'old-scope-code',
      session_id: 'pkce-old-scope'
    }))
    expect(harness.request.mock.calls.some(([method]) => method === 'account.usage')).toBe(false)
    expect(harness.notify).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'OpenAI connected.' }))
  })

  it('keeps a route-pinned Claude Code modal open after poll approval', async () => {
    const poll = deferred<{ status: string; subscriptionType: string }>()
    harness.request.mockImplementation(async (method: string) => {
      if (method === 'auth.accounts') {return { accounts: [] }}

      if (method === 'auth.cli.accounts') {
        return { accounts: [{ label: 'default', loggedIn: false, subscriptionType: null }] }
      }

      return null
    })
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string, params?: Record<string, unknown>) => {
      if (method === 'auth.cli.start') {
        return { auth_url: 'https://claude.example/authorize', expects_code: false, session_id: 'cli-poll' }
      }

      if (method === 'auth.cli.poll') {return poll.promise}

      return harness.request(method, params)
    })

    mountFooter()
    fireEvent.click(await screen.findByRole('button', { name: /Default Claude Code/ }))
    expect(await screen.findByRole('dialog', { name: 'Connect Claude Code' })).toBeTruthy()
    await waitFor(() => expect(harness.requestProfile).toHaveBeenCalledWith(oldRoute, 'auth.cli.poll', {
      account_id: 'default',
      profile: 'default',
      provider: 'claude-code',
      session_id: 'cli-poll'
    }))

    setScope('remote', 'other-profile')
    poll.resolve({ status: 'approved', subscriptionType: 'max' })

    expect(await screen.findByRole('button', { name: 'Done' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Connect Claude Code' }).textContent).toContain('approved · MAX')
  })
})
