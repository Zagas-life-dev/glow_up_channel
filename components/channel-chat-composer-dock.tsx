"use client"

import PostComposer from "@/components/post-composer"
import { cn } from "@/lib/utils"

export type ChannelChatComposerDockProps = {
  channelId: string
  typingLabel: string | null
  onPostCreated: (post: any) => void
  onTypingActivity: () => void
  onTypingEnd: () => void
  className?: string
  /**
   * `inline` — sits under the scrollable thread in a flex column (messages only use space above it).
   * `fixed` — overlays the bottom of the viewport (legacy).
   */
  variant?: "inline" | "fixed"
}

/**
 * Composer + typing line: use `inline` below `ChannelChatThread` so messages fill only the gap above.
 */
export function ChannelChatComposerDock({
  channelId,
  typingLabel,
  onPostCreated,
  onTypingActivity,
  onTypingEnd,
  className,
  variant = "inline",
}: ChannelChatComposerDockProps) {
  const isFixed = variant === "fixed"

  return (
    <div
      className={cn(
        "border-t border-border/60 bg-page/95 backdrop-blur-xl",
        isFixed
          ? "fixed inset-x-0 bottom-0 z-[100] shadow-[0_-12px_40px_-12px_hsl(222_47%_6%/0.25)] dark:shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.45)]"
          : "relative z-10 shrink-0 shadow-[0_-4px_24px_-12px_hsl(222_47%_6%/0.12)]",
        className,
      )}
      role="region"
      aria-label="Message composer"
    >
      <div
        className={cn(
          "pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5",
          isFixed ? "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8" : "w-full px-1 sm:px-0",
        )}
      >
        {typingLabel ? (
          <p className="mb-2 line-clamp-2 px-0.5 text-[13px] leading-snug text-muted-foreground">{typingLabel}</p>
        ) : null}
        <PostComposer
          onPostCreated={onPostCreated}
          channelId={channelId}
          placeholder="Message the channel…"
          compact
          onTypingActivity={onTypingActivity}
          onTypingEnd={onTypingEnd}
        />
      </div>
    </div>
  )
}
