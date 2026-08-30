import { describe, expect, it, vi } from 'vitest'

import { purgeDesktopCaches } from './maintenance-purge'

describe('maintenance purge', () => {
  it('clears cache, requests GC and reports completion without invented memory totals', async () => {
    const clearCache = vi.fn(async () => undefined)
    const collectGarbage = vi.fn()

    const result = await purgeDesktopCaches({ clearCache, collectGarbage })

    expect(clearCache).toHaveBeenCalledOnce()
    expect(collectGarbage).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true })
    expect(result).not.toHaveProperty('freedKb')
  })

  it('still succeeds when explicit GC is unavailable', async () => {
    const clearCache = vi.fn(async () => undefined)

    await expect(purgeDesktopCaches({ clearCache })).resolves.toEqual({ ok: true })
    expect(clearCache).toHaveBeenCalledOnce()
  })
})
