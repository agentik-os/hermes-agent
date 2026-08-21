import '@xterm/xterm/css/xterm.css'
import './remote-sessions.css'

import {
  Codicon,
  type HermesPlugin,
  host,
  type PluginOs,
  type PluginProfileRoute,
  type RouteContribution,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  type SidebarNavContribution,
  useValue
} from '@hermes/plugin-sdk'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { resolveCliAuthRoute } from './auth-route'
import { muxInputForXtermData } from './terminal-input'

interface MuxSession {
  activity: number
  attached: boolean
  cwd: string
  name: string
  size: string
  status: string
  windows: number
}

interface MuxListResult {
  available: boolean
  engine: null | string
  error?: string
  sessions: MuxSession[]
}

interface MuxProject {
  cwd: string
  is_git: boolean
  last_active: number
  live_sessions: string[]
  name: string
  sessions: number
}

interface CliAuthFlow {
  account_id: string
  auth_url?: string
  expects_code?: boolean
  provider: 'claude-code' | 'openai-cli'
  route: PluginProfileRoute
  session_id: string
  status: string
}

let pluginOs: null | PluginOs = null

function MuxTerminal({ route, session }: { route: PluginProfileRoute; session: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current

    if (!mount) {
      return
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      scrollback: 5000,
      theme: {
        background: '#111111',
        foreground: '#e4e4e7',
        cursor: '#fafafa',
        selectionBackground: '#3f3f46'
      }
    })

    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(mount)
    terminal.focus()

    let lastCols = 0
    let lastRows = 0

    const syncSize = () => {
      fit.fit()

      if (terminal.cols === lastCols && terminal.rows === lastRows) {
        return
      }

      lastCols = terminal.cols
      lastRows = terminal.rows
      void host
        .requestProfile(route, 'mux.sessions.resize', { session, cols: terminal.cols, rows: terminal.rows })
        .catch(() => undefined)
    }

    syncSize()

    const input = terminal.onData(data => {
      const payload = muxInputForXtermData(data)
      void host
        .requestProfile(route, 'mux.sessions.input', { session, ...payload })
        .catch(error =>
          host.notify({ kind: 'error', message: error instanceof Error ? error.message : 'Terminal input failed.' })
        )
    })

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let inFlight = false

    const pull = async () => {
      if (stopped || inFlight) {
        return
      }

      if (globalThis.document.hidden) {
        timer = setTimeout(() => void pull(), 1000)

        return
      }

      inFlight = true

      try {
        const result = await host.requestProfile<{ ansi?: string }>(route, 'mux.sessions.capture', {
          session,
          lines: 1200
        })

        if (!stopped) {
          terminal.reset()
          terminal.write(result?.ansi || '')
        }
      } catch (error) {
        if (!stopped) {
          terminal.write(`\r\n\x1b[31m${error instanceof Error ? error.message : 'Session unavailable'}\x1b[0m`)
        }
      } finally {
        inFlight = false

        if (!stopped) {
          timer = setTimeout(() => void pull(), 700)
        }
      }
    }

    void pull()

    const observer = new ResizeObserver(syncSize)
    observer.observe(mount)

    return () => {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }

      observer.disconnect()
      input.dispose()
      terminal.dispose()
    }
  }, [route, session])

  return <div className="remote-sessions-xterm" ref={mountRef} />
}

function RemoteSessionsPage() {
  const connectionId = useValue(host.state.connectionId)
  const profile = useValue(host.state.focusedSessionProfile)
  const activeCwd = useValue(host.state.cwd)
  const [inventory, setInventory] = useState<MuxListResult>({ available: false, engine: null, sessions: [] })
  const [projects, setProjects] = useState<MuxProject[]>([])
  const [muxRoute, setMuxRoute] = useState<PluginProfileRoute | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCwd, setNewCwd] = useState(activeCwd || '')
  const [creating, setCreating] = useState(false)
  const [cliAuth, setCliAuth] = useState<CliAuthFlow | null>(null)
  const [cliAuthCode, setCliAuthCode] = useState('')
  const [cliAuthBusy, setCliAuthBusy] = useState(false)
  const [cliAccountId, setCliAccountId] = useState('personal')

  useEffect(() => {
    setSelected(null)
    setMuxRoute(null)
    setNewCwd(activeCwd || '')
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let refreshCount = 0

    const refresh = async () => {
      if (globalThis.document.hidden) {
        timer = setTimeout(() => void refresh(), 3000)

        return
      }

      try {
        const routes = await host.profileRoutes()
        const route = resolveCliAuthRoute(routes, connectionId, profile)

        if (!route) {
          throw new Error('The selected gateway/profile route is unavailable.')
        }

        const result = await host.requestProfile<MuxListResult>(route, 'mux.sessions.list', {})

        const projectResult =
          refreshCount % 10 === 0
            ? await host
                .requestProfile<{ projects: MuxProject[] }>(route, 'mux.projects.list', { limit: 200 })
                .catch(() => ({ projects: [] }))
            : null

        refreshCount += 1

        if (!stopped) {
          setMuxRoute(current =>
            current?.connectionId === route.connectionId &&
            current.profile === route.profile &&
            current.targetProfile === route.targetProfile
              ? current
              : route
          )
          setInventory(result)

          if (projectResult) {
            setProjects(projectResult.projects)
          }

          setSelected(current => (current && result.sessions.some(row => row.name === current) ? current : null))
        }
      } catch (error) {
        if (!stopped) {
          setInventory({
            available: false,
            engine: null,
            sessions: [],
            error: error instanceof Error ? error.message : 'Session inventory unavailable'
          })
        }
      } finally {
        if (!stopped) {
          setLoading(false)
          timer = setTimeout(() => void refresh(), 3000)
        }
      }
    }

    void refresh()

    return () => {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [activeCwd, connectionId, profile])

  useEffect(() => {
    if (!cliAuth) {
      return
    }

    if (cliAuth.route.connectionId === connectionId && cliAuth.route.profile === (profile || 'default')) {
      return
    }

    const stale = cliAuth
    setCliAuth(null)
    setCliAuthCode('')
    void host
      .requestProfile(stale.route, 'auth.cli.cancel', {
        provider: stale.provider,
        account_id: stale.account_id,
        session_id: stale.session_id
      })
      .catch(() => undefined)
  }, [cliAuth, connectionId, profile])

  useEffect(() => {
    if (!cliAuth || cliAuth.status !== 'pending') {
      return
    }

    const active = cliAuth
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const result = await host.requestProfile<Omit<CliAuthFlow, 'account_id' | 'provider' | 'route' | 'session_id'>>(
          active.route,
          'auth.cli.poll',
          { provider: active.provider, account_id: active.account_id, session_id: active.session_id }
        )

        if (stopped) {
          return
        }

        if (result.status === 'approved') {
          setCliAuth(null)
          setCliAuthCode('')
          host.notify({
            kind: 'success',
            message: `${active.provider === 'claude-code' ? 'Claude Code' : 'OpenAI Codex'} connected.`
          })

          return
        }

        setCliAuth(current => {
          if (current?.session_id !== active.session_id) {
            return current
          }

          if (
            current.status === result.status &&
            current.auth_url === result.auth_url &&
            current.expects_code === result.expects_code
          ) {
            return current
          }

          return { ...current, ...result }
        })
      } catch (error) {
        if (!stopped) {
          setCliAuth(current => (current?.session_id === active.session_id ? { ...current, status: 'error' } : current))
          host.notify({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Authorization status failed.'
          })
        }

        return
      }

      if (!stopped) {
        timer = setTimeout(() => void poll(), 1000)
      }
    }

    void poll()

    return () => {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [cliAuth])

  const startCliAuth = async (providerId: CliAuthFlow['provider']) => {
    const accountId = cliAccountId.trim().toLowerCase()

    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(accountId) || cliAuthBusy) {
      host.notify({ kind: 'error', message: 'Account slot must use 1–32 lowercase letters, digits, or hyphens.' })

      return
    }

    setCliAuthBusy(true)

    try {
      const routes = await host.profileRoutes()
      const route = resolveCliAuthRoute(routes, connectionId, profile)

      if (!route) {
        throw new Error('The selected gateway/profile route is unavailable.')
      }

      const result = await host.requestProfile<Omit<CliAuthFlow, 'route'>>(route, 'auth.cli.start', {
        provider: providerId,
        account_id: accountId
      })

      setCliAuth({ ...result, provider: providerId, account_id: accountId, route })
      setCliAuthCode('')
    } catch (error) {
      host.notify({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not start CLI authorization.'
      })
    } finally {
      setCliAuthBusy(false)
    }
  }

  const submitCliAuth = async () => {
    if (!cliAuth || !cliAuthCode.trim() || cliAuthBusy) {
      return
    }

    setCliAuthBusy(true)

    try {
      await host.requestProfile(cliAuth.route, 'auth.cli.submit', {
        provider: cliAuth.provider,
        account_id: cliAuth.account_id,
        session_id: cliAuth.session_id,
        code: cliAuthCode.trim()
      })
      setCliAuthCode('')
    } catch (error) {
      host.notify({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not submit authorization code.'
      })
    } finally {
      setCliAuthBusy(false)
    }
  }

  const cancelCliAuth = async () => {
    if (!cliAuth || cliAuthBusy) {
      return
    }

    const active = cliAuth
    setCliAuthBusy(true)

    try {
      await host.requestProfile(active.route, 'auth.cli.cancel', {
        provider: active.provider,
        account_id: active.account_id,
        session_id: active.session_id
      })
    } catch {
      // The session may already have exited; closing the local modal is still safe.
    } finally {
      setCliAuth(null)
      setCliAuthCode('')
      setCliAuthBusy(false)
    }
  }

  const selectedRow = useMemo(
    () => inventory.sessions.find(row => row.name === selected) || null,
    [inventory, selected]
  )

  const copyAttach = async () => {
    if (!selectedRow) {
      return
    }

    const command = `${inventory.engine || 'rmux'} attach -t ${selectedRow.name}`
    await navigator.clipboard.writeText(command)
    host.notify({ kind: 'success', message: `Copied: ${command}` })
  }

  const createSession = async () => {
    const session = newName.trim()
    const cwd = newCwd.trim()

    if (!session || !cwd || !muxRoute || creating) {
      return
    }

    setCreating(true)

    try {
      await host.requestProfile(muxRoute, 'mux.sessions.create', { session, cwd })
      const result = await host.requestProfile<MuxListResult>(muxRoute, 'mux.sessions.list', {})
      setInventory(result)
      setSelected(session)
      setNewName('')
      host.notify({ kind: 'success', message: `Persistent session ${session} created.` })
    } catch (error) {
      host.notify({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not create the persistent session.'
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="remote-sessions-page">
      <header className="remote-sessions-header">
        <div>
          <span className="remote-sessions-eyebrow">LOCAL / VPS SESSION BROKER</span>
          <h1>Remote Sessions</h1>
          <p>Persistent rmux/tmux terminals on the selected Hermes gateway. Closing this page never kills them.</p>
        </div>
        <div className="remote-sessions-scope">
          <Codicon name="server" />
          <span>{connectionId || 'local'}</span>
          <span>·</span>
          <span>{profile || 'default'}</span>
        </div>
      </header>

      <div className="remote-sessions-authbar">
        <div>
          <strong>CLI accounts on this gateway</strong>
          <span>Each slot keeps its own Claude Code or Codex credentials.</span>
        </div>
        <input
          aria-label="CLI account slot"
          onChange={event => setCliAccountId(event.target.value)}
          placeholder="personal"
          value={cliAccountId}
        />
        <button
          disabled={cliAuthBusy || Boolean(cliAuth)}
          onClick={() => void startCliAuth('claude-code')}
          type="button"
        >
          Connect Claude Code
        </button>
        <button
          disabled={cliAuthBusy || Boolean(cliAuth)}
          onClick={() => void startCliAuth('openai-cli')}
          type="button"
        >
          Connect OpenAI Codex
        </button>
      </div>

      <div className="remote-sessions-grid">
        <aside className="remote-sessions-list">
          <div className="remote-sessions-list-title">
            <strong>Projects</strong>
            <span>{projects.length}</span>
          </div>
          <div className="remote-sessions-projects">
            {projects.length === 0 ? (
              <div className="remote-sessions-empty">No Hermes project history on this gateway.</div>
            ) : (
              projects.map(project => (
                <button
                  key={project.cwd}
                  onClick={() => {
                    setNewCwd(project.cwd)

                    if (project.live_sessions[0]) {
                      setSelected(project.live_sessions[0])
                    }
                  }}
                  title={project.cwd}
                  type="button"
                >
                  <Codicon name={project.is_git ? 'repo' : 'folder'} />
                  <span>{project.name}</span>
                  <small>{project.live_sessions.length || project.sessions}</small>
                </button>
              ))
            )}
          </div>
          <div className="remote-sessions-list-title">
            <strong>Sessions</strong>
            <span>{loading ? '…' : inventory.engine || 'offline'}</span>
          </div>
          <form
            className="remote-sessions-create"
            onSubmit={event => {
              event.preventDefault()
              void createSession()
            }}
          >
            <input
              aria-label="New session name"
              onChange={event => setNewName(event.target.value)}
              placeholder="session-name"
              value={newName}
            />
            <input
              aria-label="New session working directory"
              onChange={event => setNewCwd(event.target.value)}
              placeholder="/path/to/project"
              value={newCwd}
            />
            <button disabled={creating || !muxRoute || !newName.trim() || !newCwd.trim()} type="submit">
              <Codicon name={creating ? 'loading' : 'add'} /> {creating ? 'Creating…' : 'New persistent session'}
            </button>
          </form>
          {!inventory.available ? (
            <div className="remote-sessions-empty">{inventory.error || 'Install rmux or tmux on this gateway.'}</div>
          ) : inventory.sessions.length === 0 ? (
            <div className="remote-sessions-empty">No persistent terminal session on this gateway.</div>
          ) : (
            inventory.sessions.map(row => (
              <button
                className="remote-sessions-row"
                data-active={selected === row.name ? 'true' : 'false'}
                key={row.name}
                onClick={() => setSelected(row.name)}
                type="button"
              >
                <span className="remote-sessions-dot" data-attached={row.attached ? 'true' : 'false'} />
                <span className="remote-sessions-row-copy">
                  <strong>{row.name}</strong>
                  <small>{row.cwd || 'cwd unavailable'}</small>
                </span>
                <span className="remote-sessions-size">{row.size}</span>
              </button>
            ))
          )}
        </aside>

        <main className="remote-sessions-terminal-card">
          {selectedRow && muxRoute ? (
            <>
              <div className="remote-sessions-terminal-head">
                <div>
                  <strong>{selectedRow.name}</strong>
                  <span>{selectedRow.cwd}</span>
                </div>
                <button onClick={() => void copyAttach()} type="button">
                  <Codicon name="copy" /> Copy Termius attach
                </button>
              </div>
              <MuxTerminal
                key={`${connectionId}:${profile}:${selectedRow.name}`}
                route={muxRoute}
                session={selectedRow.name}
              />
            </>
          ) : (
            <div className="remote-sessions-placeholder">
              <Codicon name="terminal" size="2rem" />
              <strong>Select a session</strong>
              <span>Its live ANSI pane will open here and remain attached to the selected gateway.</span>
            </div>
          )}
        </main>
      </div>
      {cliAuth
        ? createPortal(
            <div className="remote-sessions-auth-overlay" role="presentation">
              <div
                aria-label="CLI account authorization"
                aria-modal="true"
                className="remote-sessions-auth-modal"
                role="dialog"
              >
                <button
                  aria-label="Close authorization"
                  className="remote-sessions-auth-close"
                  disabled={cliAuthBusy}
                  onClick={() => void cancelCliAuth()}
                  type="button"
                >
                  ×
                </button>
                <div>
                  <span className="remote-sessions-eyebrow">
                    {connectionId || 'local'} · {profile || 'default'}
                  </span>
                  <h2>Connect {cliAuth.provider === 'claude-code' ? 'Claude Code' : 'OpenAI Codex'}</h2>
                  <p>
                    This dialog stays open while the browser is active. After signing in, paste any code the website
                    gives you into the field below.
                  </p>
                </div>
                <div className="remote-sessions-auth-status">
                  <span>{cliAuth.status}</span>
                  <code>{cliAuth.account_id}</code>
                </div>
                {cliAuth.auth_url ? (
                  <button onClick={() => void pluginOs?.openExternal(cliAuth.auth_url!)} type="button">
                    Open authorization page
                  </button>
                ) : (
                  <div className="remote-sessions-auth-waiting">
                    Waiting for the CLI to produce its authorization link…
                  </div>
                )}
                <label htmlFor="remote-cli-auth-code">Authorization code from the website</label>
                <input
                  autoFocus
                  id="remote-cli-auth-code"
                  onChange={event => setCliAuthCode(event.target.value)}
                  placeholder="Paste the code here"
                  value={cliAuthCode}
                />
                <div className="remote-sessions-auth-actions">
                  <button
                    disabled={cliAuthBusy}
                    onClick={() =>
                      void navigator.clipboard
                        .readText()
                        .then(value => setCliAuthCode(value.trim()))
                        .catch(() =>
                          host.notify({ kind: 'warning', message: 'Paste manually; clipboard access is unavailable.' })
                        )
                    }
                    type="button"
                  >
                    Paste
                  </button>
                  <button
                    disabled={cliAuthBusy || !cliAuthCode.trim()}
                    onClick={() => void submitCliAuth()}
                    type="button"
                  >
                    Send code to CLI
                  </button>
                </div>
              </div>
            </div>,
            globalThis.document.body
          )
        : null}
    </div>
  )
}

const plugin: HermesPlugin = {
  id: 'remote-sessions',
  name: 'Remote Sessions',
  description: 'Persistent Local/VPS rmux and tmux sessions with a live Hermes terminal.',
  defaultEnabled: true,
  register(ctx) {
    pluginOs = ctx.os
    ctx.onDispose(() => {
      if (pluginOs === ctx.os) {
        pluginOs = null
      }
    })
    ctx.registerMany([
      {
        id: 'page',
        area: ROUTES_AREA,
        data: { path: '/remote-sessions' } satisfies RouteContribution,
        render: () => <RemoteSessionsPage />
      },
      {
        id: 'nav',
        area: SIDEBAR_NAV_AREA,
        order: 42,
        data: {
          codicon: 'terminal-tmux',
          label: 'Remote Sessions',
          path: '/remote-sessions'
        } satisfies SidebarNavContribution
      }
    ])
  }
}

export default plugin
