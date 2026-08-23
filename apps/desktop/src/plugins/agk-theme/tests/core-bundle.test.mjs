import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const corePlugins = [
  ['agk-theme', "id: ID"],
  ['account-resource-footer', "id: ID"],
  ['agk-surface-prototype', "id: ID"],
  ['bot-sessions', 'id: PLUGIN_ID']
]

test('every AGK product plugin is bundled and required', async () => {
  for (const [folder, idMarker] of corePlugins) {
    const url = new URL(`../../${folder}/plugin.js`, import.meta.url)
    const source = await readFile(url, 'utf8')

    assert.match(source, new RegExp(idMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${folder} keeps its stable id`)
    assert.match(source, /required:\s*true/, `${folder} is required product chrome`)
  }
})

test('bundled AGK plugins expose product names rather than prototype labels', async () => {
  const surface = await readFile(new URL('../../agk-surface-prototype/plugin.js', import.meta.url), 'utf8')
  const sessions = await readFile(new URL('../../bot-sessions/plugin.js', import.meta.url), 'utf8')

  assert.doesNotMatch(surface, /AGK Prototype|visual prototype/i)
  assert.match(surface, /AGK OS/)
  assert.doesNotMatch(sessions, /Fleet Sessions/)
  assert.match(sessions, /AGK Sessions/)
})

test('bundled account footer never duplicates core terminal or theme controls', async () => {
  const footer = await readFile(new URL('../../account-resource-footer/plugin.js', import.meta.url), 'utf8')

  assert.doesNotMatch(footer, /account-resource-footer\.(?:terminal|theme-mode)/)
  assert.match(footer, /STATUSBAR_AREAS\.right/)
})

test('the alternative OpenAI theme is not bundled into the AGK product', async () => {
  await assert.rejects(readFile(new URL('../../openai-shadcn/plugin.js', import.meta.url), 'utf8'), /ENOENT/)
})
