import { $approvalModes, setApprovalModeForProfile } from '@/store/approval-mode'
import { $gateway } from '@/store/gateway'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $activeSessionId,
  $processYoloActive,
  $yoloActive,
  $yoloAuthorityKnown,
  setSessionYoloActive,
  setYoloActive
} from '@/store/session'
import { $sessionStates } from '@/store/session-states'

export type GatewayRequester = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

let sessionYoloGeneration = 0
const sessionYoloRevisions = new Map<string, number>()

export function resetSessionYoloReconciliation(): void {
  sessionYoloGeneration += 1
  sessionYoloRevisions.clear()
}

/**
 * Toggle per-session YOLO (approval bypass) via gateway `config.set` — the same
 * session-scoped flag as the TUI's Shift+Tab. It does NOT touch the global
 * `approvals.mode` config, so CLI / TUI / cron behavior is unaffected.
 */
export async function setSessionYolo(
  requestGateway: GatewayRequester,
  sessionId: string,
  enabled: boolean
): Promise<boolean> {
  const result = await requestGateway<{ value?: string }>('config.set', {
    key: 'yolo',
    session_id: sessionId,
    value: enabled ? '1' : '0'
  })

  // config.set emits authoritative session.info (session override OR global
  // mode) before the RPC resolves. Return only the scope-local value and never
  // overwrite the effective store with this narrower fact.
  return result?.value === '1'
}

/**
 * Toggle GLOBAL YOLO (approval bypass) via gateway `config.set` with
 * `scope: 'global'`. This flips the persistent `approvals.mode` in config.yaml
 * between `off` (bypass on) and `manual` (bypass off), affecting every session,
 * the CLI, the TUI, and cron — and it survives restarts. Triggered by
 * Shift+clicking the status-bar zap.
 */
export async function setGlobalYolo(requestGateway: GatewayRequester, enabled: boolean): Promise<boolean> {
  const result = await requestGateway<{ value?: string }>('config.set', {
    key: 'yolo',
    scope: 'global',
    value: enabled ? '1' : '0'
  })

  // config.set emits authoritative session.info (session override OR global
  // mode) before the RPC resolves. Return only the scope-local value and never
  // overwrite the effective store with this narrower fact.
  return result?.value === '1'
}

/** Set persistent global YOLO against one already-bound gateway/profile. */
export async function setGlobalYoloForTarget(
  request: GatewayRequester,
  profile: string,
  enabled: boolean
): Promise<boolean> {
  const mode = await setApprovalModeForProfile(request, profile, enabled ? 'off' : 'manual')

  return mode === 'off'
}

/** Set persistent global YOLO using the current gateway/profile. */
export async function setGlobalYoloEnabled(enabled: boolean): Promise<boolean> {
  const gateway = $gateway.get()

  if (!gateway) {
    throw new Error('Hermes gateway unavailable')
  }

  const profile = $activeGatewayProfile.get()

  return setGlobalYoloForTarget((method, params) => gateway.request(method, params), profile, enabled)
}

export async function setSessionYoloAndReconcile(
  requestGateway: GatewayRequester,
  sessionId: string,
  enabled: boolean
): Promise<boolean> {
  const generation = sessionYoloGeneration
  const revision = (sessionYoloRevisions.get(sessionId) ?? 0) + 1
  sessionYoloRevisions.set(sessionId, revision)
  const targetGateway = $gateway.get()
  const targetProfile = $activeGatewayProfile.get().trim() || 'default'
  const active = await setSessionYolo(requestGateway, sessionId, enabled)

  const stillCurrentRequest =
    sessionYoloGeneration === generation && sessionYoloRevisions.get(sessionId) === revision

  if (!stillCurrentRequest) {
    return active
  }

  const states = $sessionStates.get()
  const state = states[sessionId]

  if (state) {
    $sessionStates.set({ ...states, [sessionId]: { ...state, sessionYolo: active } })
  }

  const stillForeground =
    $gateway.get() === targetGateway &&
    ($activeGatewayProfile.get().trim() || 'default') === targetProfile &&
    $activeSessionId.get() === sessionId

  if (!stillForeground) {
    return active
  }

  setSessionYoloActive(active)

  const globalActive = ($approvalModes.get()[targetProfile] ?? 'smart') === 'off'
  const legacyUnknownActive = !$yoloAuthorityKnown.get() && $yoloActive.get()
  setYoloActive(active || $processYoloActive.get() || globalActive || legacyUnknownActive)

  return active
}

/**
 * Set YOLO to an explicit state from a surface that has no React context — the
 * ⌘K rows. `useSlashCommand` keeps its own `requestGateway` (it already holds
 * one, with the reconnect handling), so this reaches the active gateway
 * directly rather than growing a second requester abstraction.
 *
 * With no session yet the flag is armed locally; the session-create path
 * (use-session-actions) applies it on the first message, exactly as a bare
 * `/yolo` in a fresh draft does.
 */
export async function setYoloEnabled(enabled: boolean): Promise<boolean> {
  const sessionId = $activeSessionId.get()

  if (!sessionId) {
    setSessionYoloActive(enabled)
    setYoloActive(enabled)

    return enabled
  }

  const gateway = $gateway.get()

  if (!gateway) {
    throw new Error('Hermes gateway unavailable')
  }

  return setSessionYoloAndReconcile(
    (method, params) => gateway.request(method, params),
    sessionId,
    enabled
  )
}
