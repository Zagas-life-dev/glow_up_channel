"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ChannelChatThreadProps = {
  children: React.ReactNode
  className?: string
  /** Extra bottom space so the last messages clear a fixed composer */
  reserveBottomForComposer?: boolean
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">

/**
 * Scrollable message list only. Parent must be a flex column with `min-h-0` so this region gets a bounded height.
 */
export const ChannelChatThread = React.forwardRef<HTMLDivElement, ChannelChatThreadProps>(
  function ChannelChatThread(
    { children, className, reserveBottomForComposer, onScroll, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={cn(
          "min-h-0 w-full flex-1 basis-0 overflow-x-hidden overflow-y-auto",
          "touch-pan-y [-webkit-overflow-scrolling:touch]",
          reserveBottomForComposer &&
            "pb-[calc(20rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(28rem+env(safe-area-inset-bottom,0px))]",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    )
  },
)

ChannelChatThread.displayName = "ChannelChatThread"
