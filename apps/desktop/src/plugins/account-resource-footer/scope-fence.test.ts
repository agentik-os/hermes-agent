import { describe, expect, it } from 'vitest'

// Bundled SDK-consumer plugins intentionally remain plain JS for disk-door compatibility.
// @ts-expect-error The adjacent plugin.js has no standalone declaration file.
import { createScopeFence } from './plugin.js'

describe('account footer scope fence', () => {
  it('invalidates responses captured before a gateway/profile transition', () => {
    const fence = createScopeFence()
    const stale = fence.capture()

    fence.bump()

    expect(fence.isCurrent(stale)).toBe(false)
    expect(fence.isCurrent(fence.capture())).toBe(true)
  })

  it('invalidates every older generation after repeated transitions', () => {
    const fence = createScopeFence()
    const first = fence.capture()
    fence.bump()
    const second = fence.capture()
    fence.bump()

    expect(fence.isCurrent(first)).toBe(false)
    expect(fence.isCurrent(second)).toBe(false)
  })
})
