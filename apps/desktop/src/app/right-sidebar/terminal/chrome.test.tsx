import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TerminalToolbar } from './chrome'
import { $activeTerminalId, $terminals } from './terminals'

describe('TerminalToolbar', () => {
  beforeEach(() => {
    $terminals.set([{ auto: true, cwd: '/repo', id: 'term-1', kind: 'user', title: 'zsh' }])
    $activeTerminalId.set('term-1')
  })

  afterEach(() => {
    cleanup()
    $terminals.set([])
    $activeTerminalId.set(null)
  })

  it('creates another terminal from the plus button', () => {
    render(<TerminalToolbar />)

    fireEvent.click(screen.getByRole('button', { name: /new terminal/i }))

    expect($terminals.get()).toHaveLength(2)
    expect($activeTerminalId.get()).not.toBe('term-1')
  })

  it('closes every terminal from the adjacent clear button', () => {
    render(<TerminalToolbar />)

    fireEvent.click(screen.getByRole('button', { name: /close all/i }))

    expect($terminals.get()).toEqual([])
    expect($activeTerminalId.get()).toBeNull()
  })
})
