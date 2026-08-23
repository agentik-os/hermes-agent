import { act, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $approvalModes, approvalModeForProfile } from '@/store/approval-mode'
import { $activeGatewayProfile } from '@/store/profile'
import { $processYoloActive, $sessionYoloActive, $yoloActive, $yoloAuthorityKnown } from '@/store/session'

import { type MessageStreamHarness, renderMessageStream } from './test-harness'

const ACTIVE_SID = 'session-active'
let stream: MessageStreamHarness

function mountStream() {
  stream = renderMessageStream(ACTIVE_SID)
}

describe('live session.info approval mode reconciliation', () => {
  beforeEach(() => {
    $approvalModes.set({})
    $activeGatewayProfile.set('work')
    $processYoloActive.set(false)
    $sessionYoloActive.set(false)
    $yoloActive.set(false)
    $yoloAuthorityKnown.set(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('reconciles an active-session event under its source gateway profile', () => {
    mountStream()

    act(() =>
      stream.handleEvent({
        payload: { approval_mode: 'off' },
        profile: 'work',
        session_id: ACTIVE_SID,
        type: 'session.info'
      })
    )

    expect(approvalModeForProfile('work')).toBe('off')
    expect(approvalModeForProfile('default')).toBe('smart')
  })

  it('reconciles separate session and process YOLO authorities', () => {
    mountStream()

    act(() =>
      stream.handleEvent({
        payload: { approval_mode: 'smart', process_yolo: true, session_yolo: false, yolo: true },
        profile: 'work',
        session_id: ACTIVE_SID,
        type: 'session.info'
      })
    )

    expect($processYoloActive.get()).toBe(true)
    expect($sessionYoloActive.get()).toBe(false)
  })

  it('preserves legacy effective YOLO without inventing a disableable scope', () => {
    mountStream()

    act(() =>
      stream.handleEvent({
        payload: { yolo: true },
        profile: 'work',
        session_id: ACTIVE_SID,
        type: 'session.info'
      })
    )

    expect($yoloActive.get()).toBe(true)
    expect($yoloAuthorityKnown.get()).toBe(false)
    expect($processYoloActive.get()).toBe(false)
    expect($sessionYoloActive.get()).toBe(false)
  })

  it('ignores stale session.info from a non-active session on the active gateway', () => {
    mountStream()

    act(() =>
      stream.handleEvent({
        payload: { approval_mode: 'off' },
        profile: 'work',
        session_id: 'session-stale',
        type: 'session.info'
      })
    )

    expect(approvalModeForProfile('work')).toBe('smart')
  })

  it('does not cache an event under a different active profile when its source profile is absent', () => {
    mountStream()
    $activeGatewayProfile.set('personal')

    act(() => stream.handleEvent({ payload: { approval_mode: 'off' }, session_id: ACTIVE_SID, type: 'session.info' }))

    expect(approvalModeForProfile('personal')).toBe('smart')
    expect(approvalModeForProfile('work')).toBe('smart')
  })
})
