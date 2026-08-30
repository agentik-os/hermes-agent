/**
 * after-pack.mjs — electron-builder afterPack hook.
 *
 * Stamps the Hermes icon + identity onto the packed Windows Hermes.exe via
 * rcedit (delegated to set-exe-identity.mjs). This runs for EVERY packed build
 * — first install, `hermes desktop`, the installer's --update rebuild, and a
 * dev's manual `npm run pack` — so the branded exe can never silently revert
 * to the stock "Electron" icon/name (the bug when the stamp lived only in
 * install.ps1, which the update path doesn't use).
 *
 * Windows-only: rcedit edits PE resources, irrelevant on macOS/Linux where the
 * app identity comes from the bundle Info.plist / desktop entry. Best-effort:
 * a stamp failure must never fail an otherwise-good build (worst case is the
 * stock icon, not a broken app), so we log and resolve rather than throw.
 *
 * electron-builder passes a context with:
 *   - electronPlatformName: 'win32' | 'darwin' | 'linux'
 *   - appOutDir:            the unpacked app directory for this target
 *   - packager.appInfo.productFilename: the exe basename (e.g. 'Hermes')
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { stampExeIdentity } from './set-exe-identity.mjs'

export function resolveMacBundleEnvironment(env = process.env) {
  const root = String(env.HERMES_DESKTOP_HERMES_ROOT || '').trim()

  if (!root) {
    return null
  }

  const bundleEnv = {
    HERMES_DESKTOP_HERMES_ROOT: path.resolve(root)
  }
  const home = String(env.HERMES_HOME || '').trim()
  const disableGpu = String(env.HERMES_DESKTOP_DISABLE_GPU || '').trim()

  if (home) {
    bundleEnv.HERMES_HOME = path.resolve(home)
  }
  if (disableGpu === '0' || disableGpu === '1') {
    bundleEnv.HERMES_DESKTOP_DISABLE_GPU = disableGpu
  }

  return bundleEnv
}

function stampMacBundleEnvironment(context) {
  const bundleEnv = resolveMacBundleEnvironment()

  if (!bundleEnv) {
    return
  }

  const productName = context.packager?.appInfo?.productFilename || 'Hermes'
  const plist = path.join(context.appOutDir, `${productName}.app`, 'Contents', 'Info.plist')
  const result = spawnSync('/usr/bin/plutil', ['-replace', 'LSEnvironment', '-json', JSON.stringify(bundleEnv), plist], {
    encoding: 'utf8'
  })

  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr?.trim() || `plutil exited ${result.status}`)
  }

  console.log(`[after-pack] pinned macOS Hermes runtime to ${bundleEnv.HERMES_DESKTOP_HERMES_ROOT}`)
}

export default async function afterPack(context) {
  if (context.electronPlatformName === 'darwin') {
    stampMacBundleEnvironment(context)

    return
  }

  if (context.electronPlatformName !== 'win32') {
    return
  }

  const productName = context.packager?.appInfo?.productFilename || 'Hermes'
  const exe = path.join(context.appOutDir, `${productName}.exe`)
  const desktopRoot = path.resolve(import.meta.dirname, '..')

  try {
    await stampExeIdentity(exe, desktopRoot)
  } catch (err) {
    // Never fail the build over a cosmetic stamp.
    console.warn(`[after-pack] exe identity stamp failed (${err.message}); Hermes.exe keeps the stock Electron icon`)
  }
}
