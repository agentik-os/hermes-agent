import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/plugins/agk-theme/plugin.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = [...source.matchAll(/(?<selectors>[^{}]+)\{(?<body>[^{}]*)\}/g)].map(match => match.groups!)

const noChromeRule = rules.find(rule =>
  rule.selectors.includes("input[type='text']") &&
  /border:\s*0\s*!important/.test(rule.body)
)

if (!noChromeRule) {throw new Error('AGK text-input no-chrome rule missing')}

const baseSelectorMatch = noChromeRule.selectors.match(
  /(?<selector>:root\[data-hermes-theme='agk'\]\s+:is\([\s\S]*?\))\s*,\s*:root\[data-hermes-theme='agk'\]/
)

if (!baseSelectorMatch?.groups?.selector) {throw new Error('AGK text-input base selector missing')}

const baseSelector = baseSelectorMatch.groups.selector

const mountInput = (type: string, slot = true) => {
  const input = document.createElement('input')
  input.type = type

  if (slot) {input.dataset.slot = 'input'}
  document.body.appendChild(input)

  return input
}

describe('AGK text-entry selector matching', () => {
  beforeEach(() => {
    document.documentElement.dataset.hermesTheme = 'agk'
  })

  afterEach(() => {
    document.body.replaceChildren()
    delete document.documentElement.dataset.hermesTheme
  })

  it.each(['text', 'search', 'email', 'password', 'url', 'tel', 'number'])(
    'matches slot-marked %s text-entry controls',
    type => {
      expect(mountInput(type).matches(baseSelector)).toBe(true)
    }
  )

  it.each(['checkbox', 'radio', 'range', 'color'])(
    'keeps slot-marked %s controls outside the text rule',
    type => {
      expect(mountInput(type).matches(baseSelector)).toBe(false)
    }
  )

  it('matches an InputGroup only when its child is a text-entry control', () => {
    const textGroup = document.createElement('div')
    textGroup.dataset.slot = 'input-group'
    textGroup.appendChild(mountInput('text'))
    document.body.appendChild(textGroup)

    const checkboxGroup = document.createElement('div')
    checkboxGroup.dataset.slot = 'input-group'
    checkboxGroup.appendChild(mountInput('checkbox'))
    document.body.appendChild(checkboxGroup)

    expect(textGroup.matches(baseSelector)).toBe(true)
    expect(checkboxGroup.matches(baseSelector)).toBe(false)
  })
})
