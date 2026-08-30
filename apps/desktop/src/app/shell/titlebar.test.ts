import { describe, expect, it } from 'vitest'

import {
  MACOS_TAHOE_DARWIN_MAJOR,
  TITLEBAR_CONTROL_OFFSET_X,
  TITLEBAR_CONTROL_SIZE,
  TITLEBAR_EDGE_INSET,
  TITLEBAR_FALLBACK_WINDOW_BUTTON_X,
  TITLEBAR_ICON_SIZE,
  TITLEBAR_MAC_TRAFFIC_LIGHTS_Y_NUDGE,
  titlebarContentInsetCss,
  titlebarControlsPosition,
  titlebarControlsYNudge,
  titlebarIconSizeCss,
  titlebarToolsRightCss,
  titlebarToolsWidthCss
} from './titlebar'

describe('titlebar sizing', () => {
  it('uses 24×24 hit targets and 13.9px glyphs', () => {
    expect(TITLEBAR_CONTROL_SIZE).toBe(24)
    expect(TITLEBAR_ICON_SIZE).toBe(13.9)
    expect(titlebarIconSizeCss()).toBe('13.9px')
  })

  it('reserves width from abutting hit targets only', () => {
    expect(titlebarToolsWidthCss(4)).toBe('calc(4 * var(--titlebar-control-size))')
  })
})

describe('titlebarControlsPosition', () => {
  it('offsets controls from visible traffic lights', () => {
    expect(titlebarControlsPosition({ x: 24, y: 10 }).left).toBe(24 + TITLEBAR_CONTROL_OFFSET_X)
  })

  it('pins to the edge when macOS fullscreen hides traffic lights', () => {
    expect(titlebarControlsPosition({ x: 24, y: 10 }, true).left).toBe(TITLEBAR_EDGE_INSET)
  })

  it('pins to the edge on Windows/Linux where native controls render on the right', () => {
    expect(titlebarControlsPosition(null).left).toBe(TITLEBAR_EDGE_INSET)
  })

  it('uses the macOS fallback while the initial window state is unknown', () => {
    expect(titlebarControlsPosition(undefined).left).toBe(TITLEBAR_FALLBACK_WINDOW_BUTTON_X + TITLEBAR_CONTROL_OFFSET_X)
  })
})

describe('titlebarControlsYNudge', () => {
  it('nudges pre-Tahoe macOS when traffic lights are visible', () => {
    expect(titlebarControlsYNudge({ windowButtonPosition: { x: 24, y: 10 }, darwinMajor: 24 })).toBe(
      TITLEBAR_MAC_TRAFFIC_LIGHTS_Y_NUDGE
    )
  })

  it('stays flat on Tahoe, Windows/Linux, and macOS fullscreen', () => {
    expect(
      titlebarControlsYNudge({ windowButtonPosition: { x: 24, y: 10 }, darwinMajor: MACOS_TAHOE_DARWIN_MAJOR })
    ).toBe('0px')
    expect(titlebarControlsYNudge({ windowButtonPosition: null })).toBe('0px')
    expect(titlebarControlsYNudge({ windowButtonPosition: { x: 24, y: 10 }, isFullscreen: true })).toBe('0px')
  })

  it('nudges while macOS window-button position is still unknown on pre-Tahoe', () => {
    expect(titlebarControlsYNudge({ darwinMajor: 24 })).toBe(TITLEBAR_MAC_TRAFFIC_LIGHTS_Y_NUDGE)
  })
})

describe('titlebarToolsRightCss', () => {
  it('reserves the native overlay width when present', () => {
    expect(titlebarToolsRightCss(144)).toBe('144px')
  })

  it('matches the left edge inset on macOS fullscreen', () => {
    expect(titlebarToolsRightCss(0, { darwinMajor: 25, isFullscreen: true })).toBe(`${TITLEBAR_EDGE_INSET}px`)
  })

  it('keeps the default chrome inset otherwise', () => {
    expect(titlebarToolsRightCss(0)).toBe('0.75rem')
  })
})

// `--titlebar-content-inset` is what stops the session title being painted
// under the macOS traffic lights and the left tool cluster. It was declared in
// `titlebarHeaderBaseClass` and in the chat header's max-width for a long time
// while NOTHING ever set it, so both fell back to 0 and the header sat at its
// bare 0.75rem — directly on top of the chrome.
describe('titlebarContentInsetCss', () => {
  it('clears the fixed left cluster, counting the buttons it renders', () => {
    const inset = titlebarContentInsetCss(2)

    expect(inset).toContain('var(--titlebar-controls-left')
    expect(inset).toContain('calc(2 * var(--titlebar-control-size))')
  })

  it('grows with page-contributed left tools', () => {
    expect(titlebarContentInsetCss(4)).toContain('calc(4 * var(--titlebar-control-size))')
  })

  it('is measured per surface, discounting how far the pane already starts in', () => {
    expect(titlebarContentInsetCss(2)).toContain('var(--workspace-left, 0px)')
  })

  it('never pulls a pane that already cleared the chrome back to the left', () => {
    expect(titlebarContentInsetCss(2).startsWith('max(0px,')).toBe(true)
  })

  it('falls back to the plain edge inset before the cluster reports its position', () => {
    expect(titlebarContentInsetCss(2)).toContain(`var(--titlebar-controls-left, ${TITLEBAR_EDGE_INSET}px)`)
  })
})
