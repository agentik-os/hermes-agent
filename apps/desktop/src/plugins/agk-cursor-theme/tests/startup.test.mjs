import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const pluginPath = new URL('../plugin.js', import.meta.url)

async function loadPlugin() {
  const source = await readFile(pluginPath, 'utf8')
  const registered = []
  const style = { id: '', remove() {}, textContent: '' }
  const requests = []
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
      requests.push(name)
      return true
    }
  }
  sandbox.globalThis = sandbox
  const executable = source
    .replace(/^import .*?\n/gm, '')
    .replace('export default {', 'globalThis.plugin = {')
  vm.runInNewContext(executable, sandbox, { filename: pluginPath.pathname })
  const ctx = {
    onDispose() {},
    register(contribution) {
      registered.push(contribution)
    },
    registerMany(list) {
      registered.push(...list)
    },
    storage: {
      get: (_key, fallback) => fallback,
      set: () => {
        throw new Error('a peer theme must never write storage')
      }
    }
  }

  sandbox.plugin.register(ctx)

  return { registered, requests }
}

test('registration lists the theme and both palette rollback commands, and activates nothing', async () => {
  const { registered, requests } = await loadPlugin()

  const theme = registered.find(entry => entry.area === 'themes')
  assert.ok(theme, 'theme contribution registered')
  assert.equal(theme.data.name, 'agk-cursor')

  const labels = registered
    .filter(entry => entry.area === 'palette')
    .map(entry => entry.data.label)
  assert.ok(labels.some(label => label.includes('AGK Cursor')), 'activation command present')
  assert.ok(labels.some(label => label.includes('canonical AGK')), 'rollback command present')

  assert.deepEqual(requests, [], 'registration must not request any theme')
})
