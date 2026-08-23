import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pluginUrl = new URL('../plugin.js', import.meta.url)

const composerRule = source => {
  const match = source.match(
    /:root\[data-hermes-theme='agk'\] \[data-slot='composer-surface'\] \{(?<body>[\s\S]*?)\n\}/
  )

  assert.ok(match?.groups?.body, 'canonical composer surface rule must exist')

  return match.groups.body
}

test('the AGK composer keeps its full radius when Background Tasks are present', async () => {
  const source = await readFile(pluginUrl, 'utf8')

  assert.match(composerRule(source), /border-radius:\s*22px;/)
  assert.doesNotMatch(
    source,
    /composer-dock'\]:has\(\[data-slot='composer-status-card'\]\)[\s\S]{0,220}border-top-(?:left|right)-radius:\s*0/
  )
})
