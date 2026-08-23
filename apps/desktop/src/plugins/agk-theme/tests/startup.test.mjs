import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const pluginPath = new URL('../plugin.js', import.meta.url)

async function loadPlugin({ enabled }) {
  const source = await readFile(pluginPath, 'utf8')
  const calls = []
  const storageWrites = []
  let storedEnabled = enabled
  const style = { id: '', remove() {}, textContent: '' }
  const sandbox = {
    PALETTE_AREA: 'palette',
    THEMES_AREA: 'themes',
    console,
    document: {
      createElement: () => style,
      getElementById: () => null,
      head: { appendChild() {} }
    },
    globalThis: null,
    host: { notify() {} },
    queueMicrotask: fn => fn(),
    requestTheme: name => {
      calls.push(name)
      return true
    }
  }
  sandbox.globalThis = sandbox
  const executable = source
    .replace(/^import .*?\n/, '')
    .replace('export default {', 'globalThis.plugin = {')
  vm.runInNewContext(executable, sandbox, { filename: pluginPath.pathname })
  const ctx = {
    onDispose() {},
    register() {},
    registerMany() {},
    storage: {
      get: (_key, fallback) => (storedEnabled === undefined ? fallback : storedEnabled),
      set: (key, value) => {
        storedEnabled = value
        storageWrites.push([key, value])
      }
    }
  }

  sandbox.plugin.register(ctx)

  return { calls, storageWrites }
}

test('AGK reclaims the active theme on every boot while its intent is enabled', async () => {
  const { calls } = await loadPlugin({ enabled: true })
  assert.deepEqual(calls, ['agk'])
})

test('AGK claims and persists theme intent on a fresh installation', async () => {
  const { calls, storageWrites } = await loadPlugin({ enabled: undefined })
  assert.deepEqual(calls, ['agk'])
  assert.deepEqual(storageWrites, [['enabled-v1', true]])
})

test('a stale restore-default flag is healed because AGK is the canonical product theme', async () => {
  const { calls, storageWrites } = await loadPlugin({ enabled: false })
  assert.deepEqual(calls, ['agk'])
  assert.deepEqual(storageWrites, [['enabled-v1', true]])
})
