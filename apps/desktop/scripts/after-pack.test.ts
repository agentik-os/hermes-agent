import { describe, expect, it } from 'vitest'

import { resolveMacBundleEnvironment } from './after-pack.mjs'

describe('macOS pinned bundle environment', () => {
  it('embeds the exact Hermes home and product root for an explicit local AGK build', () => {
    expect(
      resolveMacBundleEnvironment({
        HERMES_DESKTOP_DISABLE_GPU: '0',
        HERMES_DESKTOP_HERMES_ROOT: '/Users/test/.hermes/worktrees/agk-integration',
        HERMES_HOME: '/Users/test/.hermes'
      })
    ).toEqual({
      HERMES_DESKTOP_DISABLE_GPU: '0',
      HERMES_DESKTOP_HERMES_ROOT: '/Users/test/.hermes/worktrees/agk-integration',
      HERMES_HOME: '/Users/test/.hermes'
    })
  })

  it('leaves portable release builds free of a machine-specific LSEnvironment', () => {
    expect(resolveMacBundleEnvironment({})).toBeNull()
  })
})
