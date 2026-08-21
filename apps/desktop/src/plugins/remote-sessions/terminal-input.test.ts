import { describe, expect, it } from 'vitest'

import { muxInputForXtermData } from './terminal-input'

describe('muxInputForXtermData', () => {
  it('maps control and cursor sequences to allowlisted mux keys', () => {
    expect(muxInputForXtermData('\r')).toEqual({ key: 'Enter' })
    expect(muxInputForXtermData('\u007f')).toEqual({ key: 'BSpace' })
    expect(muxInputForXtermData('\u001b[A')).toEqual({ key: 'Up' })
    expect(muxInputForXtermData('\u0003')).toEqual({ key: 'C-c' })
  })

  it('keeps ordinary input literal', () => {
    expect(muxInputForXtermData('hello $(touch /tmp/nope)')).toEqual({ text: 'hello $(touch /tmp/nope)' })
  })
})
