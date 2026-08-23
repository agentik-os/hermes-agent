import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatBarState } from '@/app/chat/composer/types'
import { I18nProvider } from '@/i18n'
import { $approvalModes } from '@/store/approval-mode'
import { $gateway } from '@/store/gateway'
import { $hudMode } from '@/store/hud'
import { $activeGatewayProfile } from '@/store/profile'
import {
  setProcessYoloActive,
  setSessionYoloActive,
  setYoloActive,
  setYoloAuthorityKnown,
  setYoloAuthorityReady
} from '@/store/session'
import { applyWakeStartResult, applyWakeStatus, resetWakeWordState } from '@/store/wake-word'

import { ComposerControls } from './controls'

const confirmMock = vi.hoisted(() => vi.fn(async () => true))

const yoloMocks = vi.hoisted(() => ({
  setGlobalYoloForTarget: vi.fn(async () => true),
  setYoloEnabled: vi.fn(async () => true)
}))

vi.mock('@/store/confirm', () => ({ confirm: confirmMock }))

vi.mock('@/lib/yolo-session', () => yoloMocks)
vi.mock('./model-pill', () => ({ ModelPill: () => null }))

const state: ChatBarState = {
  model: { canSwitch: false, model: '', provider: '' },
  tools: { enabled: false, label: '' },
  voice: { active: false, enabled: false }
}

function renderControls(overrides: Partial<React.ComponentProps<typeof ComposerControls>> = {}) {
  return render(
    <I18nProvider configClient={null} initialLocale="en">
      <ComposerControls
        autoSpeak={false}
        busy={false}
        busyAction="stop"
        canSubmit={true}
        conversation={{
          active: false,
          level: 0,
          muted: false,
          onEnd: vi.fn(),
          onStart: vi.fn(),
          onStopTurn: vi.fn(),
          onToggleMute: vi.fn(),
          status: 'idle'
        }}
        disabled={false}
        hasComposerPayload={true}
        onDictate={vi.fn()}
        onQueue={vi.fn()}
        onToggleAutoSpeak={vi.fn()}
        state={state}
        voiceStatus="idle"
        {...overrides}
      />
    </I18nProvider>
  )
}

function setGatewayApprovalMode(mode: 'manual' | 'off' | 'smart') {
  $gateway.set({
    request: vi.fn(async (_method: string, params?: Record<string, unknown>) =>
      params?.key === 'yolo.authorities'
        ? { process_yolo: false, yolo: mode === 'off' }
        : { value: mode }
    )
  } as never)
}

async function expectShortcutTooltip(label: string, shortcut: string) {
  fireEvent.pointerMove(screen.getByLabelText(label), { pointerType: 'mouse' })

  const tooltip = await screen.findByRole('tooltip')

  expect(tooltip.textContent).toContain(label)
  expect(tooltip.textContent).toContain(shortcut)
}

afterEach(() => {
  cleanup()
  $hudMode.set(false)
  $approvalModes.set({})
  $gateway.set(null)
  $activeGatewayProfile.set('default')
  setProcessYoloActive(false)
  setSessionYoloActive(false)
  setYoloActive(false)
  setYoloAuthorityKnown(false)
  setYoloAuthorityReady(false)
  confirmMock.mockReset()
  confirmMock.mockResolvedValue(true)
  yoloMocks.setGlobalYoloForTarget.mockClear()
  yoloMocks.setYoloEnabled.mockClear()
})

// The HUD is a Spotlight bar a few hundred pixels wide: the four voice
// controls fold into one menu there, and the way out of HUD mode joins the
// row instead of floating above the bar in a reserved strip. The docked
// composer keeps every control inline and shows no exit.
describe('HUD mode', () => {
  it('keeps the voice controls inline and offers no exit in the docked composer', () => {
    renderControls()

    expect(screen.getByLabelText('Voice dictation')).toBeTruthy()
    expect(screen.getByLabelText('Read replies aloud')).toBeTruthy()
    expect(screen.queryByLabelText('Exit HUD mode')).toBeNull()
    expect(screen.queryByLabelText('Voice')).toBeNull()
  })

  it('folds them into one menu and offers the way out in the HUD', () => {
    $hudMode.set(true)
    renderControls()

    expect(screen.getByLabelText('Voice')).toBeTruthy()
    expect(screen.getByLabelText('Exit HUD mode')).toBeTruthy()

    // Folded away, not duplicated — the whole point is the row's width back.
    expect(screen.queryByLabelText('Voice dictation')).toBeNull()
    expect(screen.queryByLabelText('Read replies aloud')).toBeNull()
  })

  // A collapsed menu that looked idle while the mic was open would be a worse
  // trade than the space it saves, so the trigger reports the live state.
  it('reports a live voice state on the collapsed trigger', () => {
    $hudMode.set(true)
    renderControls({ voiceStatus: 'recording' })

    expect(screen.getByLabelText('Stop dictation')).toBeTruthy()
    expect(screen.queryByLabelText('Voice')).toBeNull()
  })
})

// A tile can be narrower than the controls cost, and the row is inside an
// overflow-hidden surface — so anything that doesn't fold gets clipped off the
// right edge, send button first. The ladder keeps going past `stacked`: voice
// folds into the same menu the HUD uses, then the model pill drops. Send is
// the last thing standing.
describe('narrow tiles', () => {
  it('folds the voice controls into one menu without entering HUD mode', () => {
    renderControls({ foldVoice: true })

    expect(screen.getByLabelText('Voice')).toBeTruthy()
    expect(screen.queryByLabelText('Voice dictation')).toBeNull()
    expect(screen.queryByLabelText('Read replies aloud')).toBeNull()

    // Folding is a width decision, not the HUD: no exit affordance appears.
    expect(screen.queryByLabelText('Exit HUD mode')).toBeNull()
  })

  it('keeps Send at the tightest width, with everything else dropped', () => {
    renderControls({ foldVoice: true, minimal: true })

    expect(screen.getByLabelText('Send')).toBeTruthy()
    expect(screen.queryByLabelText('Voice')).toBeNull()
  })

  it('keeps Stop reachable mid-turn at the tightest width', () => {
    renderControls({ busy: true, busyAction: 'stop', foldVoice: true, hasComposerPayload: false, minimal: true })

    expect(screen.getByLabelText('Stop')).toBeTruthy()
  })
})

// The primary slot is FIXED: Send (or Stop) is the only control that ever
// occupies it, in every state. An empty composer renders Send disabled rather
// than swapping in the voice button, so nothing reflows when the first
// character lands.
describe('fixed primary slot', () => {
  it('keeps Send mounted and disabled while the composer is empty', () => {
    renderControls({ canSubmit: false, hasComposerPayload: false })

    const send = screen.getByLabelText('Send') as HTMLButtonElement

    expect(send.type).toBe('submit')
    expect(send.disabled).toBe(true)
    // The voice conversation never takes the primary slot any more.
    expect(screen.queryByLabelText('Start voice conversation')?.getAttribute('type')).toBe('button')
  })

  it('enables the same Send button once there is a payload', () => {
    renderControls({ canSubmit: true, hasComposerPayload: true })

    expect((screen.getByLabelText('Send') as HTMLButtonElement).disabled).toBe(false)
  })

  it('offers the voice conversation from the voice cluster, not the primary slot', () => {
    renderControls({ canSubmit: false, hasComposerPayload: false })

    const start = screen.getByLabelText('Start voice conversation') as HTMLButtonElement

    expect(start.disabled).toBe(false)
    expect(start.type).toBe('button')
  })

  it('folds the voice conversation away with the rest of the voice cluster', () => {
    renderControls({ foldVoice: true })

    expect(screen.queryByLabelText('Start voice conversation')).toBeNull()
    expect(screen.getByLabelText('Voice')).toBeTruthy()
    // Send still stands, whatever the width.
    expect(screen.getByLabelText('Send')).toBeTruthy()
  })

  it('disables starting a conversation mid-turn but keeps Stop in the slot', () => {
    renderControls({ busy: true, busyAction: 'stop', hasComposerPayload: false })

    expect((screen.getByLabelText('Start voice conversation') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByLabelText('Stop')).toBeTruthy()
  })
})

describe('ComposerControls shortcut tooltips', () => {
  it('shows Enter for Send', async () => {
    renderControls()

    await expectShortcutTooltip('Send', '↵')
  })

  it('keeps Send (not Steer) while a turn is running if there is a payload', async () => {
    renderControls({ busy: true, busyAction: 'steer' })

    await expectShortcutTooltip('Send', '↵')
  })

  it('shows Stop only when the composer is empty mid-turn', async () => {
    renderControls({ busy: true, busyAction: 'stop', canSubmit: true, hasComposerPayload: false })

    await expectShortcutTooltip('Stop', '↵')
  })

  it('shows Ctrl+Enter for Queue as the secondary mid-turn action', async () => {
    renderControls({ busy: true, busyAction: 'queue' })

    await expectShortcutTooltip('Queue message', 'Ctrl+↵')
  })
})

describe('autonomous full access control', () => {
  beforeEach(() => setYoloAuthorityReady(true))

  it('toggles YOLO for only the current chat on a normal click', () => {
    renderControls()

    fireEvent.click(screen.getByRole('button', { name: /enable autonomous full access for this chat/i }))

    expect(yoloMocks.setYoloEnabled).toHaveBeenCalledWith(true)
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('toggles persistent global YOLO on shift-click after explicit confirmation', async () => {
    setGatewayApprovalMode('smart')
    renderControls()

    fireEvent.click(await screen.findByRole('button', { name: /enable autonomous full access for this chat/i }), {
      shiftKey: true
    })

    await waitFor(() => expect(yoloMocks.setGlobalYoloForTarget).toHaveBeenCalledWith(expect.any(Function), 'default', true))
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Enable global autonomous full access?' })
    )
    expect(yoloMocks.setYoloEnabled).not.toHaveBeenCalled()
  })

  it('does not enable persistent global YOLO when confirmation is cancelled', async () => {
    confirmMock.mockResolvedValue(false)
    setGatewayApprovalMode('smart')
    renderControls()

    fireEvent.click(await screen.findByRole('button', { name: /enable autonomous full access for this chat/i }), {
      shiftKey: true
    })

    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('aborts if gateway changes while global-enable confirmation is open', async () => {
    let resolveConfirm: ((value: boolean) => void) | undefined
    confirmMock.mockImplementation(
      () =>
        new Promise<boolean>(resolve => {
          resolveConfirm = resolve
        })
    )
    setGatewayApprovalMode('smart')
    renderControls()

    fireEvent.click(await screen.findByRole('button', { name: /enable autonomous full access for this chat/i }), {
      shiftKey: true
    })
    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    $gateway.set({ request: vi.fn(async () => ({ value: 'smart' })) } as never)
    resolveConfirm?.(true)

    await waitFor(() => expect(screen.getByRole('button', { name: /enable autonomous full access/i })).toBeTruthy())
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('keeps the control disabled until fresh-draft authority resolves', async () => {
    let resolveAuthorities: ((value: { process_yolo: boolean; yolo: boolean }) => void) | undefined

    const request = vi.fn(async (_method: string, params?: Record<string, unknown>) => {
      if (params?.key === 'yolo.authorities') {
        return new Promise<{ process_yolo: boolean; yolo: boolean }>(resolve => {
          resolveAuthorities = resolve
        })
      }

      return { value: 'off' }
    })

    $gateway.set({ request } as never)
    renderControls()

    const loading = await screen.findByRole('button', { name: /loading full-access authority/i })
    expect(loading.hasAttribute('disabled')).toBe(true)
    resolveAuthorities?.({ process_yolo: false, yolo: true })

    await waitFor(() => expect(screen.getByRole('button', { name: /global autonomous full access on/i })).toBeTruthy())
    expect(request).toHaveBeenCalledWith('config.get', { key: 'approvals.mode' })
  })

  it('enables global YOLO even when only the current session is already armed', async () => {
    setSessionYoloActive(true)
    $approvalModes.set({ default: 'smart' })
    setGatewayApprovalMode('smart')
    renderControls()

    fireEvent.click(await screen.findByRole('button', { name: /autonomous full access on/i }), { shiftKey: true })

    await waitFor(() => expect(yoloMocks.setGlobalYoloForTarget).toHaveBeenCalledWith(expect.any(Function), 'default', true))
  })

  it('does not claim chat-level disable while persistent global YOLO is active', () => {
    $approvalModes.set({ default: 'off' })
    renderControls()

    fireEvent.click(screen.getByRole('button', { name: /global autonomous full access on/i }))

    expect(yoloMocks.setYoloEnabled).not.toHaveBeenCalled()
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('shift-click disables the global authority independently of session state', async () => {
    $approvalModes.set({ default: 'off' })
    setGatewayApprovalMode('off')
    setSessionYoloActive(true)
    renderControls()

    fireEvent.click(await screen.findByRole('button', { name: /global autonomous full access on/i }), { shiftKey: true })

    await waitFor(() => expect(yoloMocks.setGlobalYoloForTarget).toHaveBeenCalledWith(expect.any(Function), 'default', false))
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('shows legacy effective YOLO as active but non-disableable', () => {
    setYoloActive(true)
    setYoloAuthorityKnown(false)
    renderControls()

    const button = screen.getByRole('button', { name: /legacy gateway; scope cannot be changed safely/i })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(yoloMocks.setYoloEnabled).not.toHaveBeenCalled()
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('shows frozen process YOLO as inherited and non-disableable', () => {
    setProcessYoloActive(true)
    renderControls()

    const button = screen.getByRole('button', { name: /process-wide full access is forced/i })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(yoloMocks.setYoloEnabled).not.toHaveBeenCalled()
    expect(yoloMocks.setGlobalYoloForTarget).not.toHaveBeenCalled()
  })

  it('renders an active pressed state from the authoritative session store', () => {
    setSessionYoloActive(true)
    renderControls()

    expect(screen.getByRole('button', { name: /autonomous full access on/i }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('wake-word ear visibility', () => {
  afterEach(() => {
    resetWakeWordState()
  })

  it('stays mounted during a busy agent turn', () => {
    applyWakeStatus({ available: true, enabled: true, listening: true, phrase: 'hey hermes' })
    renderControls({ busy: true, busyAction: 'stop' })

    expect(screen.getByLabelText('Wake word: "hey hermes" — listening')).toBeTruthy()
  })

  it('stays mounted (enabled in config) even when a start was refused', () => {
    applyWakeStatus({ available: true, enabled: true, listening: false, phrase: 'hey hermes' })
    // Transient refusal marks available false but enabled keeps it mounted.
    applyWakeStartResult({ hint: 'mic busy', reason: 'unavailable', started: false })
    renderControls()

    expect(screen.getByLabelText('Wake word: "hey hermes" — off')).toBeTruthy()
  })

  it('stays visible (never hides) even when unavailable and not enabled', () => {
    applyWakeStatus({ available: false, enabled: false, listening: false, phrase: 'hey hermes' })
    renderControls()

    // The ear ALWAYS shows so the user can click to enable; a failed start
    // surfaces its reason in the tooltip rather than hiding the control.
    expect(screen.getByLabelText('Wake word: "hey hermes" — off')).toBeTruthy()
  })

  it('surfaces the backend refusal reason in the tooltip, still visible', () => {
    applyWakeStatus({ available: false, enabled: false, listening: false, phrase: 'hey hermes' })
    applyWakeStartResult({ hint: 'run `hermes tools` (Voice section)', reason: 'unavailable', started: false })
    renderControls()

    const ear = screen.getByLabelText('Wake word: "hey hermes" — off')
    expect(ear).toBeTruthy()
  })

  it('shows a disabled paused ear inside the voice-conversation pill', () => {
    applyWakeStatus({ available: true, enabled: true, listening: true, phrase: 'hey hermes' })
    renderControls({
      conversation: {
        active: true,
        level: 0,
        muted: false,
        onEnd: vi.fn(),
        onStart: vi.fn(),
        onStopTurn: vi.fn(),
        onToggleMute: vi.fn(),
        status: 'listening'
      }
    })

    const ear = screen.getByLabelText('Wake word: "hey hermes" — paused during voice chat')
    expect((ear as HTMLButtonElement).disabled).toBe(true)
  })
})
