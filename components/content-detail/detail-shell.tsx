"use client"

/**
 * The page frame shared by opportunity, event, job and resource detail pages.
 *
 * Two layouts in one component, which is the point: on phones the light panel
 * curls over the hero and the call to action sits in a bar pinned to the
 * bottom; from `lg` it becomes a two-column read with the action parked in a
 * sticky rail. Both keep the action reachable without hunting for it, which is
 * the only thing these pages exist to do.
 */

import type { ReactNode } from "react"

export interface ContentDetailShellProps {
  /** A `<DetailHero />`. */
  hero: ReactNode
  /** The article body. */
  children: ReactNode
  /**
   * The primary outbound button. Rendered twice — in the desktop rail and in
   * the phone bar — because a single element cannot be in both places, and
   * duplicating the node is cheaper than a portal.
   */
  action?: ReactNode
  /** Square button beside the action, e.g. add to playlist. */
  secondaryAction?: ReactNode
  /** Caption under the rail action, e.g. "Closes 12 Sep". */
  actionNote?: ReactNode
  /** Extra cards below the action in the desktop rail. */
  rail?: ReactNode
  /** Modals and overlays, rendered outside the layout flow. */
  overlays?: ReactNode
}

export function ContentDetailShell({
  hero,
  children,
  action,
  secondaryAction,
  actionNote,
  rail,
  overlays,
}: ContentDetailShellProps) {
  const hasActionBar = Boolean(action || secondaryAction)

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-12">
      <div className="mx-auto w-full lg:max-w-6xl lg:px-8 lg:pt-8">
        {hero}

        <div className="relative -mt-5 rounded-t-[1.75rem] bg-page pt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:rounded-none lg:bg-transparent lg:pt-0">
          <main className="mx-auto w-full max-w-[680px] space-y-7 px-5 lg:mx-0 lg:max-w-none lg:rounded-[1.5rem] lg:border lg:border-border/70 lg:bg-card/60 lg:p-8">
            {children}
          </main>

          {/* Desktop rail: the action stays in view while the body scrolls. */}
          {(hasActionBar || rail) && (
            <aside className="hidden lg:block">
              <div className="sticky top-8 space-y-6">
                {hasActionBar && (
                  <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
                    {action}
                    {secondaryAction && (
                      <div className="flex items-center gap-3">
                        {secondaryAction}
                        <p className="text-[13px] leading-snug text-muted-foreground">
                          Save it to a playlist to come back to it.
                        </p>
                      </div>
                    )}
                    {actionNote && (
                      <p className="pt-1 text-center text-[13px] text-muted-foreground">
                        {actionNote}
                      </p>
                    )}
                  </div>
                )}
                {rail}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Phone and tablet action bar */}
      {hasActionBar && (
        <div className="sticky bottom-0 z-30 mt-6 border-t border-border bg-page/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[680px] items-center gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {secondaryAction}
            <div className="min-w-0 flex-1">{action}</div>
          </div>
        </div>
      )}

      {overlays}
    </div>
  )
}

export default ContentDetailShell
