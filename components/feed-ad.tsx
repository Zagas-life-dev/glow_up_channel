"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-4275585712096268"

interface FeedAdProps {
  slotId: string
  className?: string
}

export default function FeedAd({ slotId, className }: FeedAdProps) {
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!slotId || pushedRef.current) return
    pushedRef.current = true
    try {
      ;(window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []
      ;(window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({})
    } catch {
      // ignore
    }
  }, [slotId])

  if (!slotId) return null

  return (
    <div className={cn("min-h-[120px] w-full flex items-center justify-center", className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
