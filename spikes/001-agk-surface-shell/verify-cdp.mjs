import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { CDP, sleep } from '../../apps/desktop/scripts/perf/lib/cdp.mjs'

const port = Number(process.argv[2] ?? 9335)
const outDir = resolve('spikes/001-agk-surface-shell/screenshots')
await mkdir(outDir, { recursive: true })
const cdp = await CDP.connect({ port, timeoutMs: 30000 })
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')
await cdp.send('Page.bringToFront')

async function waitFor(expression, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await cdp.eval(expression)) return
    await sleep(200)
  }
  throw new Error(`timed out waiting for ${label}`)
}

await waitFor(
  `!![...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'AGK Prototype')`,
  'AGK Prototype navigation'
)

const opened = await cdp.eval(`(() => {
  const button = [...document.querySelectorAll('button')].find(candidate => candidate.textContent?.trim() === 'AGK Prototype')
  if (!button) return false
  button.click()
  return true
})()`)

if (!opened) throw new Error('AGK Prototype navigation was not clickable')
await waitFor(`!!document.querySelector('[data-agk-active-surface]')`, 'AGK prototype route')

const results = []
for (const id of ['collective', 'learn', 'build', 'deals', 'evolve']) {
  const selected = await cdp.eval(`(() => {
    const button = document.querySelector('button[data-agk-surface="${id}"]')
    if (!button) return false
    button.click()
    return true
  })()`)
  if (!selected) throw new Error(`surface button missing: ${id}`)

  await waitFor(
    `document.querySelector('[data-agk-active-surface]')?.getAttribute('data-agk-active-surface') === '${id}'`,
    `${id} surface`
  )
  await sleep(150)

  const state = await cdp.eval(`(() => {
    const root = document.querySelector('[data-agk-active-surface]')
    return {
      active: root?.getAttribute('data-agk-active-surface'),
      layout: root?.getAttribute('data-agk-layout'),
      title: root?.querySelector('h1')?.textContent,
      nav: [...(root?.querySelectorAll('.agk-prototype-nav-item') ?? [])].map(item => item.textContent?.trim()),
      metricCount: root?.querySelectorAll('.agk-prototype-metric').length ?? 0,
      cardCount: root?.querySelectorAll('.agk-prototype-card').length ?? 0,
      buildModes: [...document.querySelectorAll('button[data-agk-build-mode]')].map(item => item.textContent?.trim())
    }
  })()`)

  if (id === 'build') {
    for (const mode of ['operate', 'design', 'code', 'inspect']) {
      const modeSelected = await cdp.eval(`(() => {
        const button = document.querySelector('button[data-agk-build-mode="${mode}"]')
        if (!button) return false
        button.click()
        return true
      })()`)
      if (!modeSelected) throw new Error(`Build mode missing: ${mode}`)
    }
  }

  const clip = await cdp.eval(`(() => {
    const root = document.querySelector('[data-agk-active-surface]')
    const rect = root.getBoundingClientRect()
    const x = Math.max(0, rect.x - 24)
    return { x, y: 0, width: window.innerWidth - x, height: window.innerHeight, scale: 1 }
  })()`)
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip })
  const path = resolve(outDir, `${id}.png`)
  await writeFile(path, Buffer.from(screenshot.data, 'base64'))
  results.push({ ...state, screenshot: path })
}

console.log(JSON.stringify({ status: 'PASS', surfaces: results }, null, 2))
cdp.close()
