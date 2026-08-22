export interface DesktopPurgeResult {
  ok: boolean
}

/**
 * Clear the Chromium session cache, then ask the current main-process runtime
 * to collect unreachable objects when GC is exposed. Memory reclamation is
 * intentionally not quantified: process metrics are noisy and cannot prove
 * that a delta was caused by this operation.
 */
export async function purgeDesktopCaches({
  clearCache,
  collectGarbage
}: {
  clearCache: () => Promise<void>
  collectGarbage?: () => void
}): Promise<DesktopPurgeResult> {
  await clearCache()
  collectGarbage?.()

  return { ok: true }
}
