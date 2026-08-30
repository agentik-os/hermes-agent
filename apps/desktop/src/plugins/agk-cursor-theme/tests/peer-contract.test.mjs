import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pluginPath = new URL('../plugin.js', import.meta.url)

test('AGK Cursor is an opt-in peer theme, never a replacement', async () => {
  const source = await readFile(pluginPath, 'utf8')

  assert.match(source, /const ID = 'agk-cursor'/, 'keeps its stable id')
  assert.doesNotMatch(source, /required:\s*true/, 'is opt-in, not required product chrome')
  assert.doesNotMatch(source, /storage\.(get|set)\('enabled-v1'/, 'never reads or writes the canonical theme intent storage')
  // Rollback path must stay discoverable.
  assert.match(source, /requestTheme\('agk'\)/, 'can restore the canonical AGK theme')
  assert.doesNotMatch(source, /data-hermes-theme='agk'/, 'never reaches into the AGK theme selectors')
  // Peer persistence rides its own chosen-v1 flag, not the canonical intent.
  assert.match(source, /chosen-v1/, 'persists its own activation intent')
})

test('the Cursor structural contract is present', async () => {
  const source = await readFile(pluginPath, 'utf8')

  // Sidebar darker than canvas (Cursor inversion), warm charcoal values.
  assert.match(source, /--cursor-rail: #141413/, 'dark rail is darker than the canvas')
  assert.match(source, /--cursor-shell: #1a1a18/, 'warm charcoal canvas')
  // Violet is a state, never a fill: it must not paint a button or surface
  // background. The leading-edge marker (::before) is the one allowed use.
  assert.match(source, /--cursor-accent: #7c6ff0/, 'violet state accent declared')
  assert.doesNotMatch(source, /background:\s*var\(--cursor-accent\)\s*!important/, 'accent never forced as a fill')
  // Pill composer + chip user turns.
  assert.match(source, /border-radius: 26px/, 'pill composer radius')
  assert.match(source, /aui_user-message-root[\s\S]{0,220}border-radius: 14px/, 'rounded user chips')
})
