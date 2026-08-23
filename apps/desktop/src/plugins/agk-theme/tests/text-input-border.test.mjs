import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pluginUrl = new URL('../plugin.js', import.meta.url)

const cssRules = source => [
  ...source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(?<selectors>[^{}]+)\{(?<body>[^{}]*)\}/g)
].map(match => match.groups)

const textSelectors = [
  'input:not([type])',
  "input[type='text']",
  "input[type='search']",
  "input[type='email']",
  "input[type='password']",
  "input[type='url']",
  "input[type='tel']",
  "input[type='number']",
  'textarea',
  "[data-slot='input']:not([type])",
  "[data-slot='input'][type='text']",
  "[data-slot='input'][type='search']",
  "[data-slot='input'][type='email']",
  "[data-slot='input'][type='password']",
  "[data-slot='input'][type='url']",
  "[data-slot='input'][type='tel']",
  "[data-slot='input'][type='number']",
  "[data-slot='textarea']",
  "[data-slot='input-group']:has("
]

test('AGK text-entry controls never draw border or focus chrome', async () => {
  const source = await readFile(pluginUrl, 'utf8')
  const rules = cssRules(source)
  const noChromeRule = rules.find(rule =>
    rule.selectors.includes("input[type='text']") &&
    /border:\s*0\s*!important/.test(rule.body) &&
    /outline:\s*0\s*!important/.test(rule.body) &&
    /box-shadow:\s*none\s*!important/.test(rule.body)
  )

  assert.ok(noChromeRule, 'a theme-scoped no-chrome rule must exist for text-entry controls')
  for (const selector of textSelectors) {
    assert.ok(noChromeRule.selectors.includes(selector), `${selector} must be covered by the no-chrome rule`)
  }
  assert.match(noChromeRule.selectors, /:is\(:hover,\s*:focus,\s*:focus-visible,\s*:focus-within\)/)
  assert.doesNotMatch(noChromeRule.selectors, /\[data-slot='input'\](?!\[|:)/)
  assert.doesNotMatch(noChromeRule.selectors, /checkbox|radio|select-trigger|color|range/)

  const focusMarker = rules.find(rule =>
    rule.selectors.includes('*:focus-visible') && /box-shadow:/.test(rule.body)
  )
  assert.ok(focusMarker, 'the global keyboard focus marker must remain for non-text controls')
  assert.match(focusMarker.selectors, /:not\(:is\([\s\S]*input\[type='text'\][\s\S]*textarea[\s\S]*\)\)/)
})
