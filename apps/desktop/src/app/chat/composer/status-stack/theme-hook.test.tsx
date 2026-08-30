import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { $todosBySession } from '@/store/todos'

import { ComposerStatusStack } from './index'

/**
 * The status card is a THEMING SURFACE, so the handle themes reach for is part
 * of its contract, not an implementation detail.
 *
 * `rounded-b-none` is worn by exactly two elements: this card and the
 * coding/cwd/git-branch strip inside the composer surface (coding-row.tsx). A
 * theme that told them apart by joining utility classes (`rounded-b-none` +
 * `mx-2`) restyled the git strip the moment either utility moved, and that is
 * what clipped the branch name and the +/- diff counts. The named slot is what
 * makes that impossible.
 */
describe('status card theming handle', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect() {}
        observe() {}
      }
    )
  })

  afterEach(() => {
    cleanup()
    $todosBySession.set({})
  })

  const renderStack = () =>
    render(
      <MemoryRouter>
        <ComposerStatusStack queue={null} sessionId="session-1" />
      </MemoryRouter>
    )

  it('names the card so a theme never has to match utility classes', () => {
    $todosBySession.set({ 'session-1': [{ content: 'Ship it', id: '1', status: 'in_progress' }] })

    const { container } = renderStack()
    const card = container.querySelector('[data-slot="composer-status-card"]')

    expect(card).not.toBeNull()
    // The slot is on the CARD itself — the thing that paints fill, border and
    // radius — not on the scroll wrapper around it.
    expect(card?.className).toContain('rounded-b-none')
  })

  it('renders exactly one card, inside the stack wrapper', () => {
    $todosBySession.set({ 'session-1': [{ content: 'Ship it', id: '1', status: 'in_progress' }] })

    const { container } = renderStack()
    const cards = container.querySelectorAll('[data-slot="composer-status-card"]')
    const stack = container.querySelector('[data-slot="composer-status-stack"]')

    expect(cards).toHaveLength(1)
    expect(stack?.contains(cards[0])).toBe(true)
  })

  it('publishes nothing at all when every status is empty', () => {
    const { container } = renderStack()

    expect(container.querySelector('[data-slot="composer-status-card"]')).toBeNull()
  })
})
