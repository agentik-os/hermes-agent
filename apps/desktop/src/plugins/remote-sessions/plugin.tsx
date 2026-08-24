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
  type SidebarNavContribution
} from '@hermes/plugin-sdk'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { muxInputForXtermData } from './terminal-input'

// ── shapes ───────────────────────────────────────────────────────────────────

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

/** One registered gateway connection = one MACHINE row. */
interface Machine {
  id: string
  kind: 'cloud' | 'local' | 'remote' | 'ssh' | string
  label: string
  primary: boolean
  reachable: boolean | null
  error?: string
  installId?: string
}

/** A (machine, backend profile) pair that can serve mux sessions. */
interface RouteView extends PluginProfileRoute {
  /** Backend-facing profile this route serves. */
  targetName: string
}

interface RouteData {
  engine: null | string
  error: null | string
  fetchedAt: number
  loading: boolean
  projects: MuxProject[]
  sessions: MuxSession[]
  unavailableReason: null | string
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

// ── helpers ──────────────────────────────────────────────────────────────────

const ROUTE_KEY_SEP = '\u241F'

function routeKey(connectionId: string, targetName: string): string {
  return `${connectionId || 'local'}${ROUTE_KEY_SEP}${targetName || 'default'}`
}

function sessionKey(route: RouteView, session: string): string {
  return `${routeKey(route.connectionId, route.targetName)}${ROUTE_KEY_SEP}${session}`
}

function parseRosterAgents(payload: unknown): Machine[] {
  const agents = Array.isArray((payload as { agents?: unknown[] })?.agents)
    ? ((payload as { agents: Array<Record<string, unknown>> }).agents)
    : []

  const byId = new Map<string, Machine>()

  for (const agent of agents) {
    const id = String(agent?.connectionId ?? '')
    const kind = String(agent?.connectionKind ?? 'remote')

    if (!id || byId.has(id)) {
      continue
    }

    byId.set(id, {
      id,
      kind,
      label: String(agent?.connectionLabel ?? id),
      primary: false,
      reachable: true
    })
  }

  const sources = Array.isArray((payload as { sources?: unknown[] })?.sources)
    ? ((payload as { sources: Array<Record<string, unknown>> }).sources)
    : []

  for (const source of sources) {
    const id = String(source?.connectionId ?? '')
    const known = byId.get(id)

    if (!known) {
      continue
    }

    if (typeof source.reachable === 'boolean') {
      known.reachable = source.reachable
    }

    if (typeof source.error === 'string' && source.error) {
      known.error = source.error
    }
  }

  return [...byId.values()]
}

async function loadConnections(): Promise<{ connections: Machine[]; legacy: boolean }> {
  try {
    const rows = await host.connections()

    if (!Array.isArray(rows) || rows.length === 0) {
      return { connections: [], legacy: false }
    }

    const machines: Machine[] = rows.map(row => ({
      id: String(row.id ?? ''),
      kind: String(row.kind ?? 'remote'),
      label: String(row.label ?? row.id ?? 'connection'),
      primary: Boolean(row.primary),
      reachable: null
    }))

    return {
      connections: machines.filter(machine => machine.id),
      legacy: false
    }
  } catch {
    // Older desktop builds: single-machine world, everything was "the local".
    return {
      connections: [{ id: 'local', kind: 'local', label: 'This machine', primary: true, reachable: null }],
      legacy: true
    }
  }
}

async function annotateReachability(machines: Machine[]): Promise<void> {
  try {
    const roster = await host.agents()
    const seen = parseRosterAgents(roster)
    const byId = new Map(seen.map(machine => [machine.id, machine]))

    for (const machine of machines) {
      const match = byId.get(machine.id)

      if (match && typeof match.reachable === 'boolean') {
        machine.reachable = match.reachable

        if (match.error) {
          machine.error = match.error
        }
      }
    }
  } catch {
    // Reachability stays unknown; per-route mux errors still surface below.
  }
}

/**
 * Routable descriptors for every (connection, profile) pair. `profileRoutes`
 * is the authority — synthesized routes would guess profile/targetProfile
 * wrong on shared sockets and per-profile backends alike.
 */
async function loadRoutes(): Promise<PluginProfileRoute[]> {
  try {
    const routes = await host.profileRoutes()

    if (Array.isArray(routes) && routes.length > 0) {
      return routes
    }
  } catch {
    // Fall through to the legacy shape.
  }

  return [{ connectionId: 'local', mode: 'local', profile: 'default', targetProfile: 'default' }]
}

function dedupeRoutes(routes: readonly PluginProfileRoute[]): RouteView[] {
  const unique = new Map<string, RouteView>()

  for (const route of routes) {
    const targetName = route.targetProfile || route.profile || 'default'
    const key = routeKey(route.connectionId, targetName)

    if (!unique.has(key)) {
      unique.set(key, { ...route, targetName })
    }
  }

  return [...unique.values()]
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'local':
      return 'LOCAL'

    case 'ssh':
      return 'SSH'

    case 'cloud':
      return 'CLOUD'

    default:
      return 'GATEWAY'
  }
}

function formatActivity(value: number | undefined): string {
  if (!value) {
    return ''
  }

  const seconds = Math.max(0, Math.round(Date.now() / 1000 - value))

  if (seconds < 60) {
    return 'now'
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`
  }

  return `${Math.floor(seconds / 86400)}d`
}

// ── terminal ─────────────────────────────────────────────────────────────────

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
      scrollback: 8000,
      theme: {
        background: '#101011',
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

// ── page ─────────────────────────────────────────────────────────────────────

type Scope = 'all' | string

function RemoteSessionsPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [legacy, setLegacy] = useState(false)
  const [routes, setRoutes] = useState<RouteView[]>([])
  const [routeData, setRouteData] = useState<Record<string, RouteData>>({})
  const [scope, setScope] = useState<Scope>('all')
  const [selected, setSelected] = useState<null | string>(null)
  const [newName, setNewName] = useState('')
  const [newCwd, setNewCwd] = useState('')
  const [creating, setCreating] = useState(false)
  const [armedKill, setArmedKill] = useState<null | string>(null)
  const [cliAuth, setCliAuth] = useState<CliAuthFlow | null>(null)
  const [cliAuthCode, setCliAuthCode] = useState('')
  const [cliAuthBusy, setCliAuthBusy] = useState(false)
  const [cliAccountId, setCliAccountId] = useState('personal')

  const emptyData = useMemo(
    () => ({
      engine: null,
      error: null,
      fetchedAt: 0,
      loading: true,
      projects: [] as MuxProject[],
      sessions: [] as MuxSession[],
      unavailableReason: null
    }),
    []
  )

  // ── machine/route inventory ──────────────────────────────────────────────
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const refresh = async () => {
      const { connections, legacy: legacyMode } = await loadConnections()

      if (stopped) {
        return
      }

      await annotateReachability(connections)

      if (stopped) {
        return
      }

      const descriptors = await loadRoutes()

      if (stopped) {
        return
      }

      const views = dedupeRoutes(descriptors)
      // A route whose connection vanished from the roster enumeration (or an
      // older desktop without the registry) still points at a reachable
      // gateway — keep it as a synthesized machine row instead of dropping it.
      const knownIds = new Set(connections.map(machine => machine.id))

      for (const view of views) {
        if (!knownIds.has(view.connectionId)) {
          knownIds.add(view.connectionId)
          connections.push({
            id: view.connectionId,
            kind: 'remote',
            label: view.connectionId,
            primary: false,
            reachable: null
          })
        }
      }

      setLegacy(legacyMode)
      setMachines(current => (JSON.stringify(current) === JSON.stringify(connections) ? current : connections))
      setRoutes(views)

      timer = setTimeout(() => void refresh(), 6000)
    }

    void refresh()

    return () => {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  // ── mux polling across the visible routes ────────────────────────────────
  const visibleRoutes = useMemo(
    () => (scope === 'all' ? routes : routes.filter(route => route.connectionId === scope)),
    [routes, scope]
  )

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let tick = 0
    const routesRef = visibleRoutes

    const mergeResult = (key: string, patch: Partial<RouteData>) => {
      setRouteData(current => {
        const previous = current[key] ?? emptyData

        return { ...current, [key]: { ...previous, ...patch } }
      })
    }

    const pull = async () => {
      if (globalThis.document.hidden) {
        timer = setTimeout(() => void pull(), 4000)

        return
      }

      const jobs = routesRef.map(async route => {
        const key = routeKey(route.connectionId, route.targetName)
        mergeResult(key, { loading: true })

        try {
          const result = await host.requestProfile<MuxListResult>(route, 'mux.sessions.list', {})
          const wantsProjects = tick % 10 === 0

          const projectResult = wantsProjects
            ? await host
                .requestProfile<{ projects: MuxProject[] }>(route, 'mux.projects.list', { limit: 200 })
                .catch(() => ({ projects: [] as MuxProject[] }))
            : null

          if (stopped) {
            return
          }

          mergeResult(key, {
            engine: result.engine,
            error: result.error ?? null,
            loading: false,
            sessions: Array.isArray(result.sessions) ? result.sessions : [],
            unavailableReason: result.available ? null : 'rmux/tmux unavailable on this machine',
            ...(projectResult ? { projects: projectResult.projects } : {}),
            fetchedAt: Date.now()
          })
        } catch (error) {
          if (!stopped) {
            mergeResult(key, {
              loading: false,
              error: error instanceof Error ? error.message : 'Session inventory unavailable',
              sessions: [],
              fetchedAt: Date.now()
            })
          }
        }
      })

      await Promise.all(jobs)

      if (!stopped) {
        tick += 1
        timer = setTimeout(() => void pull(), 4000)
      }
    }

    void pull()

    return () => {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [visibleRoutes, emptyData])

  // Drop selections that no longer resolve (machine removed, session killed elsewhere).
  useEffect(() => {
    setSelected(current => {
      if (!current) {
        return current
      }

      return routes.some(route => sessionKey(route, current.split(ROUTE_KEY_SEP)[2] ?? '') === current)
        ? current
        : null
    })
  }, [routes])

  // ── CLI authorization against the SELECTED route ─────────────────────────
  useEffect(() => {
    if (!cliAuth) {
      return
    }

    const stale = cliAuth

    const stillVisible = visibleRoutes.some(
      route => route.connectionId === stale.route.connectionId && route.targetName === (stale.route.targetProfile || stale.route.profile)
    )

    if (stillVisible) {
      return
    }

    setCliAuth(null)
    setCliAuthCode('')
    void host
      .requestProfile(stale.route, 'auth.cli.cancel', {
        provider: stale.provider,
        account_id: stale.account_id,
        session_id: stale.session_id
      })
      .catch(() => undefined)
  }, [cliAuth, visibleRoutes])

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
            message: `${active.provider === 'claude-code' ? 'Claude Code' : 'OpenAI Codex'} connected on ${active.route.connectionId}.`
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

  const startCliAuth = async (providerId: CliAuthFlow['provider'], route: RouteView) => {
    const accountId = cliAccountId.trim().toLowerCase()

    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(accountId) || cliAuthBusy) {
      host.notify({ kind: 'error', message: 'Account slot must use 1–32 lowercase letters, digits, or hyphens.' })

      return
    }

    setCliAuthBusy(true)

    try {
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
      // The session may already have exited; closing the local modal is safe.
    } finally {
      setCliAuth(null)
      setCliAuthCode('')
      setCliAuthBusy(false)
    }
  }

  // ── derived views ────────────────────────────────────────────────────────

  const scopedMachines = useMemo(
    () => (scope === 'all' ? machines : machines.filter(machine => machine.id === scope)),
    [machines, scope]
  )

  const rows = useMemo(() => {
    const out: { route: RouteView; session: MuxSession; key: string }[] = []

    for (const route of visibleRoutes) {
      const data = routeData[routeKey(route.connectionId, route.targetName)]

      for (const session of data?.sessions ?? []) {
        out.push({ key: sessionKey(route, session.name), route, session })
      }
    }

    return out.sort((a, b) => (b.session.activity || 0) - (a.session.activity || 0))
  }, [visibleRoutes, routeData])

  const selectedTarget = useMemo(() => rows.find(row => row.key === selected) ?? null, [rows, selected])

  const totals = useMemo(() => {
    const online = scopedMachines.filter(machine => machine.reachable !== false).length

    return { machinesOnline: online, machinesTotal: scopedMachines.length, sessionsRunning: rows.length }
  }, [scopedMachines, rows])

  const machineById = useMemo(() => new Map(machines.map(machine => [machine.id, machine])), [machines])

  const createSession = async (route: RouteView) => {
    const session = newName.trim()
    const cwd = newCwd.trim()

    if (!session || !cwd || creating) {
      return
    }

    setCreating(true)

    try {
      await host.requestProfile(route, 'mux.sessions.create', { session, cwd })
      const result = await host.requestProfile<MuxListResult>(route, 'mux.sessions.list', {})

      setRouteData(current => ({
        ...current,
        [routeKey(route.connectionId, route.targetName)]: {
          ...(current[routeKey(route.connectionId, route.targetName)] ?? emptyData),
          engine: result.engine,
          error: result.error ?? null,
          loading: false,
          sessions: Array.isArray(result.sessions) ? result.sessions : [],
          unavailableReason: result.available ? null : 'rmux/tmux unavailable on this machine',
          fetchedAt: Date.now()
        }
      }))
      setSelected(sessionKey(route, session))
      setNewName('')
      host.notify({
        kind: 'success',
        message: `Persistent session ${session} created on ${machineById.get(route.connectionId)?.label ?? route.connectionId}.`
      })
    } catch (error) {
      host.notify({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not create the persistent session.'
      })
    } finally {
      setCreating(false)
    }
  }

  const killSession = async (row: { route: RouteView; session: MuxSession; key: string }) => {
    if (armedKill !== row.key) {
      setArmedKill(row.key)

      return
    }

    setArmedKill(null)

    try {
      await host.requestProfile(row.route, 'mux.sessions.close', { session: row.session.name, confirm: true })
      host.notify({ kind: 'success', message: `Session ${row.session.name} closed.` })
    } catch (error) {
      host.notify({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not close the session.'
      })
    }
  }

  useEffect(() => {
    if (!armedKill) {
      return
    }

    const timer = setTimeout(() => setArmedKill(null), 4000)

    return () => clearTimeout(timer)
  }, [armedKill])

  const copyAttach = async (row: { route: RouteView; session: MuxSession }) => {
    const engine = routeData[routeKey(row.route.connectionId, row.route.targetName)]?.engine || 'tmux'
    const command = `${engine} attach -t ${row.session.name}`
    await navigator.clipboard.writeText(command)
    host.notify({ kind: 'success', message: `Copied: ${command}` })
  }

  const authRoute = selectedTarget?.route ?? visibleRoutes[0] ?? null

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="remote-sessions-page">
      <header className="remote-sessions-header">
        <div>
          <span className="remote-sessions-eyebrow">AGK BUILD · RUNTIME INFRASTRUCTURE</span>
          <h1>Machines &amp; Remote Sessions</h1>
          <p>
            Every gateway connection is a machine. Persistent rmux/tmux sessions survive closing this app — detach
            here, reattach anywhere.
          </p>
        </div>
        <div className="remote-sessions-totals">
          <span className="remote-sessions-total">
            <i className="remote-sessions-dot" data-attached={totals.machinesOnline > 0 ? 'true' : 'false'} />
            {totals.machinesOnline}/{totals.machinesTotal} machines
          </span>
          <span className="remote-sessions-total">
            <Codicon name="terminal" />
            {totals.sessionsRunning} sessions
          </span>
        </div>
      </header>

      <div className="remote-sessions-grid">
        {/* ── machine registry ── */}
        <aside className="remote-sessions-col remote-sessions-machines">
          <div className="remote-sessions-list-title">
            <strong>Machines</strong>
            <span>{legacy ? 'single' : 'gateway registry'}</span>
          </div>

          <button
            className="remote-sessions-machine"
            data-active={scope === 'all' ? 'true' : 'false'}
            onClick={() => setScope('all')}
            type="button"
          >
            <span className="remote-sessions-machine-icon">
              <Codicon name="files" />
            </span>
            <span className="remote-sessions-machine-copy">
              <strong>All machines</strong>
              <small>{totals.sessionsRunning} sessions</small>
            </span>
          </button>

          {machines.map(machine => {
            const machineRoutes = routes.filter(route => route.connectionId === machine.id)

            const sessionCount = machineRoutes.reduce(
              (sum, route) => sum + (routeData[routeKey(route.connectionId, route.targetName)]?.sessions.length ?? 0),
              0
            )

            return (
              <button
                className="remote-sessions-machine"
                data-active={scope === machine.id ? 'true' : 'false'}
                key={machine.id}
                onClick={() => setScope(machine.id)}
                type="button"
              >
                <span className="remote-sessions-machine-icon" data-kind={machine.kind}>
                  <Codicon name={machine.kind === 'local' ? 'screen-normal' : 'server'} />
                </span>
                <span className="remote-sessions-machine-copy">
                  <strong>
                    {machine.label}
                    {machine.primary ? <em className="remote-sessions-primary">PRIMARY</em> : null}
                  </strong>
                  <small>
                    {machine.reachable === false
                      ? machine.error || 'unreachable'
                      : `${kindLabel(machine.kind)} · ${sessionCount} sessions`}
                  </small>
                </span>
                <i
                  className="remote-sessions-dot"
                  data-attached={machine.reachable === false ? 'false' : machine.reachable === null ? 'unknown' : 'true'}
                />
              </button>
            )
          })}

          <div className="remote-sessions-footnote">
            Machines are managed in Settings → Connections; each one exposes its profiles as gateway routes.
          </div>
        </aside>

        {/* ── session inventory ── */}
        <section className="remote-sessions-col remote-sessions-inventory">
          <div className="remote-sessions-list-title">
            <strong>Sessions</strong>
            <span>{rows.length}</span>
          </div>

          <form
            className="remote-sessions-create"
            onSubmit={event => {
              event.preventDefault()

              if (authRoute) {
                void createSession(authRoute)
              }
            }}
          >
            <input
              aria-label="New session name"
              onChange={event => setNewName(event.target.value)}
              placeholder="session-name"
              value={newName}
            />
            <input
              aria-label={`New session working directory on ${authRoute ? machineById.get(authRoute.connectionId)?.label ?? authRoute.connectionId : 'selected machine'}`}
              onChange={event => setNewCwd(event.target.value)}
              placeholder="/path/to/project"
              value={newCwd}
            />
            <button
              disabled={
                creating ||
                !authRoute ||
                !newName.trim() ||
                !newCwd.trim() ||
                Boolean(cliAuth)
              }
              type="submit"
            >
              <Codicon name={creating ? 'loading' : 'add'} />
              New persistent session{authRoute ? ` → ${machineById.get(authRoute.connectionId)?.label ?? authRoute.connectionId}` : ''}
            </button>
          </form>

          {visibleRoutes.length === 0 ? (
            <div className="remote-sessions-empty">No gateway routes. Register a machine in Settings → Connections.</div>
          ) : (
            rows.length === 0 && (
              <div className="remote-sessions-empty">No persistent sessions on this scope.</div>
            )
          )}

          {rows.map(row => {
            const machine = machineById.get(row.route.connectionId)
            const armed = armedKill === row.key

            return (
              <div className="remote-sessions-row-wrap" key={row.key}>
                <button
                  className="remote-sessions-row"
                  data-active={selected === row.key ? 'true' : 'false'}
                  onClick={() => setSelected(row.key)}
                  type="button"
                >
                  <span className="remote-sessions-dot" data-attached={row.session.attached ? 'true' : 'false'} />
                  <span className="remote-sessions-row-copy">
                    <strong>{row.session.name}</strong>
                    <small>
                      {machine?.label ?? row.route.connectionId} · {row.route.targetName} · {row.session.cwd || 'cwd unavailable'}
                    </small>
                  </span>
                  <span className="remote-sessions-meta">
                    {formatActivity(row.session.activity) && <em>{formatActivity(row.session.activity)}</em>}
                    <span>{row.session.size}</span>
                  </span>
                </button>
                <div className="remote-sessions-row-actions">
                  <button onClick={() => setSelected(row.key)} title="Attach terminal" type="button">
                    <Codicon name="terminal" />
                  </button>
                  <button onClick={() => void copyAttach(row)} title="Copy attach command" type="button">
                    <Codicon name="copy" />
                  </button>
                  <button
                    className="remote-sessions-kill"
                    data-armed={armed ? 'true' : 'false'}
                    onClick={() => void killSession(row)}
                    title={armed ? 'Click again to confirm' : 'Close session (two clicks)'}
                    type="button"
                  >
                    <Codicon name={armed ? 'check' : 'trash'} />
                  </button>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── live terminal ── */}
        <main className="remote-sessions-terminal-card">
          {selectedTarget ? (
            <>
              <div className="remote-sessions-terminal-head">
                <div>
                  <strong>{selectedTarget.session.name}</strong>
                  <span>
                    {machineById.get(selectedTarget.route.connectionId)?.label ?? selectedTarget.route.connectionId}
                    {' · '}
                    {selectedTarget.route.targetName} · {selectedTarget.session.cwd}
                  </span>
                </div>
                <button onClick={() => void copyAttach(selectedTarget)} type="button">
                  <Codicon name="clippy" /> Copy attach
                </button>
              </div>
              <MuxTerminal
                key={`${selectedTarget.route.connectionId}:${selectedTarget.route.targetName}:${selectedTarget.session.name}`}
                route={selectedTarget.route}
                session={selectedTarget.session.name}
              />
            </>
          ) : (
            <div className="remote-sessions-placeholder">
              <Codicon name="terminal" size="2rem" />
              <strong>Select a session</strong>
              <span>
                Pick any session on any machine — its live ANSI pane opens here and keeps running after you leave.
              </span>
            </div>
          )}
        </main>
      </div>

      {/* ── CLI accounts on the selected machine ── */}
      <div className="remote-sessions-authbar">
        <div>
          <strong>CLI accounts</strong>
          <span>
            Claude Code / Codex credentials are authorized on{' '}
            <b>
              {authRoute
                ? `${machineById.get(authRoute.connectionId)?.label ?? authRoute.connectionId} · ${authRoute.targetName}`
                : 'no selected route'}
            </b>
            .
          </span>
        </div>
        <input
          aria-label="CLI account slot"
          onChange={event => setCliAccountId(event.target.value)}
          placeholder="personal"
          value={cliAccountId}
        />
        <button
          disabled={!authRoute || cliAuthBusy || Boolean(cliAuth)}
          onClick={() => authRoute && void startCliAuth('claude-code', authRoute)}
          type="button"
        >
          Connect Claude Code
        </button>
        <button
          disabled={!authRoute || cliAuthBusy || Boolean(cliAuth)}
          onClick={() => authRoute && void startCliAuth('openai-cli', authRoute)}
          type="button"
        >
          Connect OpenAI Codex
        </button>
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
                    {machineById.get(cliAuth.route.connectionId)?.label ?? cliAuth.route.connectionId} ·{' '}
                    {cliAuth.route.targetProfile || cliAuth.route.profile}
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

// ── registration ─────────────────────────────────────────────────────────────

const plugin: HermesPlugin = {
  id: 'remote-sessions',
  name: 'Remote Sessions',
  description: 'Machine registry + persistent rmux/tmux sessions across every gateway connection.',
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
          codicon: 'server',
          label: 'Remote Sessions',
          path: '/remote-sessions'
        } satisfies SidebarNavContribution
      }
    ])
  }
}

export default plugin
