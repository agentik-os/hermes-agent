/**
 * When a lone pane must keep its tab strip (name card + close).
 *
 * Default: a single pane isn't a "tab", so the header auto-hides. Exceptions
 * force it on so a closeable surface never becomes an unclosable dead zone:
 *  - a closeable `placement: 'main'` pane — every mirrored TILE (a session, a
 *    page, a preview) is one, so dragging a tile into a zone of its own keeps
 *    its tab and its ✕
 *  - a collapse tool panel dragged into its own zone
 */

export interface LoneHeaderChrome {
  placement?: string
  uncloseable?: boolean
}

export function forceLoneHeaderForPanes(
  shown: readonly string[],
  chromeOf: (id: string) => LoneHeaderChrome,
  isCollapsePane: (id: string) => boolean
): boolean {
  // Every main workspace is a session-navigation surface, including the
  // uncloseable root workspace. Its header carries the active session tabs and
  // the trailing + button, so hiding it on a lone workspace removes the only
  // direct way to add another session to the stack.
  if (
    shown.some(id => {
      const chrome = chromeOf(id)

      return chrome.placement === 'main'
    })
  ) {
    return true
  }

  return shown.length === 1 && isCollapsePane(shown[0])
}
