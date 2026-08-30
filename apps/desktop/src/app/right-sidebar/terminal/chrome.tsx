import { useStore } from '@nanostores/react'

import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import { TerminalSlot } from './persistent'
import { TerminalRail } from './rail'
import { $terminals, closeAllTerminals, createTerminal } from './terminals'

const TOOLBAR_ACTION =
  'grid size-6 place-items-center rounded-md text-(--ui-text-tertiary) transition-colors hover:bg-(--chrome-action-hover) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'

export function TerminalToolbar() {
  const { t } = useI18n()
  const terminals = useStore($terminals)

  return (
    <div
      aria-label={t.rightSidebar.terminalsAria}
      className="flex h-8 shrink-0 items-center justify-end gap-1 px-2"
      data-terminal-toolbar=""
    >
      <Tip label={t.rightSidebar.terminalNew}>
        <button
          aria-label={t.rightSidebar.terminalNew}
          className={cn(TOOLBAR_ACTION, 'bg-transparent')}
          onClick={() => createTerminal()}
          type="button"
        >
          <Codicon name="add" size="0.8125rem" />
        </button>
      </Tip>
      <Tip label={t.rightSidebar.terminalCloseAll}>
        <button
          aria-label={t.rightSidebar.terminalCloseAll}
          className={cn(TOOLBAR_ACTION, 'bg-transparent disabled:cursor-default disabled:opacity-35')}
          disabled={terminals.length === 0}
          onClick={closeAllTerminals}
          type="button"
        >
          <Codicon name="clear-all" size="0.8125rem" />
        </button>
      </Tip>
    </div>
  )
}

/** Pane-side terminal chrome: the body slot (which the persistent overlay chases)
 *  plus the always-on tab rail. Lives in the real pane DOM — NOT the z-4 terminal
 *  overlay — so the rail sits above the collapsed sidebars' z-30 hover-reveal
 *  triggers (z-40, like the thread timeline) and suppresses them while hovered.
 *  The rail is always shown when a terminal exists (even one), so every tab keeps
 *  its close affordance; closing the last one hides the pane (reopen re-creates). */
export function TerminalPaneChrome() {
  const terminals = useStore($terminals)

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <TerminalToolbar />
        <TerminalSlot />
      </div>
      {terminals.length > 0 && <TerminalRail />}
    </div>
  )
}
