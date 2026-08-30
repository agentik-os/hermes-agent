import assert from 'node:assert/strict'
import { copyFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const spikeRoot = dirname(fileURLToPath(import.meta.url))
const pluginPath = join(spikeRoot, 'plugin.js')

async function loadPlugin() {
  const root = await mkdtemp(join(tmpdir(), 'agk-surface-plugin-'))
  await writeFile(join(root, 'package.json'), '{"type":"module"}\n')

  const sdkRoot = join(root, 'node_modules', '@hermes', 'plugin-sdk')
  await mkdir(sdkRoot, { recursive: true })
  await writeFile(
    join(sdkRoot, 'package.json'),
    JSON.stringify({ name: '@hermes/plugin-sdk', type: 'module', exports: './index.js' })
  )
  await writeFile(
    join(sdkRoot, 'index.js'),
    `
export const ROUTES_AREA = 'routes'
export const SIDEBAR_NAV_AREA = 'sidebar.nav'
export const PALETTE_AREA = 'palette'
export const TITLEBAR_AREAS = { center: 'titleBar.center' }
export const host = { navigate() {}, notify() {} }
export function atom(initial) {
  let value = initial
  return { get: () => value, set: next => { value = next } }
}
export const useValue = store => store.get()
export const Contribute = () => null
export const Codicon = () => null
export const Badge = () => null
`
  )

  const reactRoot = join(root, 'node_modules', 'react')
  await mkdir(reactRoot, { recursive: true })
  await writeFile(
    join(reactRoot, 'package.json'),
    JSON.stringify({ name: 'react', type: 'module', exports: { './jsx-runtime': './jsx-runtime.js' } })
  )
  await writeFile(
    join(reactRoot, 'jsx-runtime.js'),
    `
export const Fragment = Symbol.for('react.fragment')
export const jsx = (type, props) => ({ type, props })
export const jsxs = jsx
`
  )

  const copiedPlugin = join(root, 'plugin.js')
  await copyFile(pluginPath, copiedPlugin)
  return import(`${pathToFileURL(copiedPlugin).href}?test=${Date.now()}`)
}

test('registers one AGK route, sidebar entry, and palette command', async () => {
  const module = await loadPlugin()
  const registrations = []
  const ctx = {
    i18n: { register() {}, t: key => key },
    onDispose() {},
    register(entry) { registrations.push(entry) },
    registerMany(entries) { registrations.push(...entries) }
  }

  module.default.register(ctx)

  const route = registrations.find(entry => entry.area === 'routes')
  const nav = registrations.find(entry => entry.area === 'sidebar.nav')
  const command = registrations.find(entry => entry.area === 'palette')

  assert.equal(module.default.id, 'agk-surface-prototype')
  assert.equal(route.data.path, '/agk-prototype')
  assert.equal(nav.data.path, '/agk-prototype')
  assert.equal(nav.data.label, 'AGK Prototype')
  assert.equal(command.data.id, 'agk.prototype.open')
})

test('defines five ratified universes with genuinely different layouts', async () => {
  const { surfaceSpecs } = await loadPlugin()
  assert.deepEqual(Object.keys(surfaceSpecs), ['collective', 'learn', 'build', 'deals', 'evolve'])

  for (const [id, spec] of Object.entries(surfaceSpecs)) {
    assert.equal(spec.id, id)
    assert.ok(spec.title.length > 4)
    assert.ok(spec.nav.length >= 4)
    assert.ok(spec.metrics.length >= 3)
    assert.ok(spec.primary.length >= 2)
    assert.ok(spec.context.length >= 2)
  }

  assert.equal(new Set(Object.values(surfaceSpecs).map(spec => spec.layout)).size, 5)
  assert.deepEqual(surfaceSpecs.build.modes, ['Operate', 'Design', 'Code', 'Inspect'])
})

test('switches only to canonical surfaces and rejects unknown ids', async () => {
  const { prototypeSurface, selectSurface } = await loadPlugin()

  assert.equal(prototypeSurface.get(), 'build')
  assert.equal(selectSurface('collective'), true)
  assert.equal(prototypeSurface.get(), 'collective')
  assert.equal(selectSurface('unknown'), false)
  assert.equal(prototypeSurface.get(), 'collective')
})

test('switches Build only among Operate, Design, Code, and Inspect modes', async () => {
  const { prototypeBuildMode, selectBuildMode } = await loadPlugin()

  assert.equal(prototypeBuildMode.get(), 'Operate')
  assert.equal(selectBuildMode('Code'), true)
  assert.equal(prototypeBuildMode.get(), 'Code')
  assert.equal(selectBuildMode('Unknown'), false)
  assert.equal(prototypeBuildMode.get(), 'Code')
})
