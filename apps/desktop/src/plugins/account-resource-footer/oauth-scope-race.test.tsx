import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function deferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>(res => {
    resolve = res
  })

  return { promise, resolve }
}

const harness = vi.hoisted(() => ({
  activeConnectionId: vi.fn(),
  connections: vi.fn(),
  notify: vi.fn(),
  profileRoutes: vi.fn(),
  request: vi.fn(),
  requestProfile: vi.fn(),
  states: {} as Record<string, { get: () => unknown; set: (value: unknown) => void }>
}))

vi.mock('@hermes/plugin-sdk', async importOriginal => {
  // The async Vitest factory returns the live SDK module; its generic type is
  // intentionally erased here because this test replaces only host/UI leaves.
  const actual = (await importOriginal()) as any
  const React = await import('react')

  const states = {
    connectionId: actual.atom('old-connection'),
    focusedSessionProfile: actual.atom('old-profile'),
    focusedUsage: actual.atom({}),
    gateway: actual.atom('open')
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

function mountFooter() {
  let footer: { render: () => React.ReactNode } | undefined
  plugin.register({
    onDispose: vi.fn(),
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

function setScope(connection: string, profile: string) {
  act(() => {
    harness.states.connectionId.set(connection)
    harness.states.focusedSessionProfile.set(profile)
  })
}

function installBaseHost() {
  harness.activeConnectionId.mockImplementation(() => harness.states.connectionId.get())
  harness.connections.mockResolvedValue([{ id: 'old-connection', kind: 'local', label: 'Old' }])
  harness.profileRoutes.mockImplementation(async () => {
    const connectionId = String(harness.states.connectionId.get())
    const profile = String(harness.states.focusedSessionProfile.get())

    return [{ connectionId, profile, targetProfile: profile }]
  })
}

describe('account footer OAuth scope races', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setScope('old-connection', 'old-profile')
    installBaseHost()
  })

  afterEach(() => cleanup())

  it('stale PKCE completion neither notifies nor clears a newer busy operation', async () => {
    const submit = deferred<{ status: string }>()
    const staleRefresh = deferred<unknown>()
    const staleRefreshStarted = vi.fn()
    let holdRefresh = false
    let startCount = 0

    harness.request.mockImplementation(async (method: string) => {
      if (method === 'system.resources') {return null}

      if (method === 'account.usage') {
        if (holdRefresh) {
          holdRefresh = false
          staleRefreshStarted()

          return staleRefresh.promise
        }

        return null
      }

      if (method === 'auth.accounts') {return { accounts: [] }}

      return null
    })
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string) => {
      if (method === 'auth.oauth.start') {
        startCount += 1

        if (startCount === 1) {return { auth_url: 'https://example.test', flow: 'pkce', session_id: 'old-flow' }}

        return new Promise(() => undefined)
      }

      if (method === 'auth.oauth.submit') {return submit.promise}

      return { status: 'cancelled' }
    })

    mountFooter()
    await waitFor(() => expect(harness.request).toHaveBeenCalledWith('account.usage', {}))
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))
    fireEvent.change(await screen.findByLabelText('OpenAI authorization code'), { target: { value: 'code' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    holdRefresh = true
    submit.resolve({ status: 'approved' })
    await waitFor(() => expect(staleRefreshStarted).toHaveBeenCalled())

    setScope('new-connection', 'new-profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Connect OpenAI' }))
    const newerButton = screen.getByRole('button', { name: 'Connect OpenAI' })
    expect(newerButton.hasAttribute('disabled')).toBe(true)

    staleRefresh.resolve(null)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(harness.notify).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'OpenAI connected.' }))
    expect(newerButton.hasAttribute('disabled')).toBe(true)
  })

  it('stale device-code approval cannot notify after a scope transition', async () => {
    const staleRefresh = deferred<unknown>()
    const staleRefreshStarted = vi.fn()
    let holdRefresh = false
    let startCount = 0

    harness.request.mockImplementation(async (method: string) => {
      if (method === 'system.resources') {return null}

      if (method === 'account.usage') {
        if (holdRefresh) {
          holdRefresh = false
          staleRefreshStarted()

          return staleRefresh.promise
        }

        return null
      }

      if (method === 'auth.accounts') {return { accounts: [] }}

      return null
    })
    harness.requestProfile.mockImplementation(async (_route: unknown, method: string) => {
      if (method === 'auth.oauth.start') {
        startCount += 1

        if (startCount === 1) {
          return { flow: 'device_code', poll_interval: 0, session_id: 'device-flow', user_code: 'ABCD' }
        }

        return new Promise(() => undefined)
      }

      if (method === 'auth.oauth.poll') {return { status: 'approved' }}

      return { status: 'cancelled' }
    })

    mountFooter()
    await waitFor(() => expect(harness.request).toHaveBeenCalledWith('account.usage', {}))
    holdRefresh = true
    fireEvent.click(screen.getByRole('button', { name: 'Connect OpenAI' }))
    await waitFor(() => expect(staleRefreshStarted).toHaveBeenCalled())

    setScope('new-connection', 'new-profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Connect OpenAI' }))
    staleRefresh.resolve(null)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(harness.notify).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'OpenAI connected.' }))
  })
})
