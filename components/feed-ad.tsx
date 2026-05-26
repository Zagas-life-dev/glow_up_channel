"use client"

import { useEffect, useId, useRef } from "react"
import { cn } from "@/lib/utils"

const INVOKE_BASE =
  process.env.NEXT_PUBLIC_ADSTERRA_INVOKE_BASE ||
  "https://www.highperformanceformat.com"

interface FeedAdProps {
  /**
   * Adsterra "key" (zone key) from the ad unit snippet.
   * Example snippet URL: https://www.highperformanceformat.com/<key>/invoke.js
   */
  slotId: string
  className?: string
  width?: number
  height?: number
}

type AdsterraWindow = Window & {
  atOptions?: unknown
  __adsterraQueue?: Promise<void>
}

function enqueueAdsterraWork(win: AdsterraWindow, work: () => Promise<void>) {
  const queue = win.__adsterraQueue ?? Promise.resolve()
  win.__adsterraQueue = queue
    .catch(() => {
      // swallow to keep queue moving
    })
    .then(work)
    .catch(() => {
      // swallow to keep queue moving
    })
}

export default function FeedAd({
  slotId,
  className,
  width = 320,
  height = 100,
}: FeedAdProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pushedRef = useRef(false)
  const reactId = useId()

  useEffect(() => {
    const key = slotId?.trim()
    const node = containerRef.current
    if (!key || !node || pushedRef.current) return

    pushedRef.current = true

    enqueueAdsterraWork(window as AdsterraWindow, async () => {
      // Clear anything previously injected into this container (e.g. remount)
      node.replaceChildren()

      ;(window as AdsterraWindow).atOptions = {
        key,
        format: "iframe",
        height,
        width,
        params: {},
      }

      await new Promise<void>((resolve) => {
        const script = document.createElement("script")
        script.type = "text/javascript"
        script.async = true
        script.src = `${INVOKE_BASE.replace(/\/$/, "")}/${encodeURIComponent(key)}/invoke.js`
        script.onload = () => resolve()
        script.onerror = () => resolve()
        node.appendChild(script)
      })
    })
  }, [slotId, width, height])

  if (!slotId) return null

  return (
    <div
      ref={containerRef}
      data-adsterra-key={slotId}
      data-adsterra-react-id={reactId}
      className={cn(
        "min-h-[120px] w-full flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{ minHeight: height }}
    />
  )
}
