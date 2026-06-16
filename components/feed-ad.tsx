"use client"

import AdSlot from "@/components/ad-slot"

interface FeedAdProps {
  /**
   * Adsterra "key" (zone key) from the ad unit snippet.
   * Example snippet URL: https://www.highperformanceformat.com/<key>/invoke.js
   */
  slotId: string
  className?: string
  /** Must match the dimensions configured for this unit in the Adsterra dashboard. */
  width?: number
  height?: number
}

/**
 * In-feed 300x250 Adsterra banner. Thin wrapper around {@link AdSlot} so feeds
 * keep their existing API while sharing one isolated-iframe implementation.
 */
export default function FeedAd({
  slotId,
  className,
  width = 300,
  height = 250,
}: FeedAdProps) {
  if (!slotId) return null
  return (
    <AdSlot
      variant="banner"
      bannerKey={slotId}
      width={width}
      height={height}
      className={className}
    />
  )
}
