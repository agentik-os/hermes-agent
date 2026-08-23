import { afterEach, describe, expect, it, vi } from 'vitest'

import { createClientSessionState } from '@/lib/chat-runtime'
import { setGlobalYoloEnabled, setSessionYolo, setYoloEnabled } from '@/lib/yolo-session'
import { $approvalModes, approvalModeForProfile } from '@/store/approval-mode'
import { $gateway } from '@/store/gateway'
import { $activeGatewayProfile } from '@/store/profile'
import { $sessionYoloActive, $yoloActive, setActiveSessionId, setYoloActive } from '@/store/session'
import { $sessionStates } from '@/store/session-states'

describe('setGlobalYoloEnabled', () => {
  afterEach(() => {
    $gateway.set(null)
    $approvalModes.set({})
    $activeGatewayProfile.set('default')
    setActiveSessionId(null)
    $sessionStates.set({})
    setYoloActive(false)
  })

  it('persists global bypass and reconciles the active profile mode', async () => {
    const request = vi.fn(async () => ({ value: 'off' }))
    $gateway.set({ request } as never)
    $activeGatewayProfile.set('night')

    await expect(setGlobalYoloEnabled(true)).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith('config.set', { key: 'approvals.mode', value: 'off' })
    expect(approvalModeForProfile('night')).toBe('off')
  })

  it('reconciles the profile captured before an in-flight gateway switch', async () => {
    let resolveRequest: ((value: { value: string }) => void) | undefined

    const request = vi.fn(
      () =>
        new Promise<{ value: string }>(resolve => {
          resolveRequest = resolve
        })
    )

    $gateway.set({ request } as never)
    $activeGatewayProfile.set('night')

    const pending = setGlobalYoloEnabled(true)
    $activeGatewayProfile.set('day')
    resolveRequest?.({ value: 'off' })
    await pending

    expect(approvalModeForProfile('night')).toBe('off')
    expect(approvalModeForProfile('day')).toBe('smart')
  })

  it('updates session authority and cache even when a lazy backend emits no session.info', async () => {
    setActiveSessionId('lazy')
    $sessionStates.set({ lazy: createClientSessionState() })
    $gateway.set({ request: vi.fn(async () => ({ value: '1' })) } as never)

    await expect(setYoloEnabled(true)).resolves.toBe(true)
    expect($sessionYoloActive.get()).toBe(true)
    expect($sessionStates.get().lazy?.sessionYolo).toBe(true)
  })

  it('ignores an out-of-order stale session toggle response', async () => {
    let resolveFirst: ((value: { value: string }) => void) | undefined
    let resolveSecond: ((value: { value: string }) => void) | undefined

    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve
          })
      )

    setActiveSessionId('race')
    $sessionStates.set({ race: createClientSessionState() })
    $gateway.set({ request } as never)

    const stale = setYoloEnabled(true)
    const current = setYoloEnabled(false)
    resolveSecond?.({ value: '0' })
    await current
    resolveFirst?.({ value: '1' })
    await stale

    expect($sessionYoloActive.get()).toBe(false)
    expect($sessionStates.get().race?.sessionYolo).toBe(false)
  })

  it('does not overwrite effective process/global truth with a session-only response', async () => {
    setYoloActive(true)
    const request = vi.fn(async () => ({ value: '0' }))

    await expect(setSessionYolo(request as never, 'session-1', false)).resolves.toBe(false)
    expect($yoloActive.get()).toBe(true)
  })

  it('fails closed when no gateway is available', async () => {
    await expect(setGlobalYoloEnabled(true)).rejects.toThrow('Hermes gateway unavailable')
  })
})
