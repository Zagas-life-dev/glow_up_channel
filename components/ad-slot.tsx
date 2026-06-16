"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useShowAds } from "@/lib/use-show-ads"

const INVOKE_BASE =
  process.env.NEXT_PUBLIC_ADSTERRA_INVOKE_BASE ||
  "https://www.highperformanceformat.com"

const NATIVE_SRC = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC || ""
const NATIVE_CONTAINER = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER || ""

type AdVariant = "banner" | "native"

interface AdSlotProps {
  /** "banner" = fixed atOptions unit (e.g. 300x250); "native" = responsive native banner. */
  variant?: AdVariant
  /** Adsterra zone key for banner units. Defaults to NEXT_PUBLIC_ADSTERRA_FEED_KEY. */
  bannerKey?: string
  /** Banner dimensions; must match the unit configured in Adsterra. */
  width?: number
  height?: number
  className?: string
  /** Optional label override; pass "" to hide. */
  label?: string
  /** Caps for native units so they stay compact (~300x250) instead of full-bleed. */
  nativeMaxWidth?: number
  nativeMaxHeight?: number
}

/**
 * Renders a single Adsterra unit fully client-side, isolated inside its own
 * <iframe srcDoc>. Isolation gives every instance a private `window` (so the
 * shared `atOptions` global and the native banner's fixed container id never
 * collide), which is what lets the same unit repeat down a feed/page.
 *
 * Unfilled units collapse to zero height instead of leaving an empty box.
 */
export default function AdSlot({
  variant = "banner",
  bannerKey,
  width = 300,
  height = 250,
  className,
  label = "Advertisement",
  nativeMaxWidth = 300,
  nativeMaxHeight = 250,
}: AdSlotProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [filled, setFilled] = useState(false)
  const [measuredHeight, setMeasuredHeight] = useState(height)

  const showAds = useShowAds()
  const key = (bannerKey ?? process.env.NEXT_PUBLIC_ADSTERRA_FEED_KEY ?? "").trim()
  const isNative = variant === "native"
  // Premium subscribers and admins never load or see ads.
  const enabled = showAds && (isNative ? !!(NATIVE_SRC && NATIVE_CONTAINER) : !!key)

  const srcDoc = useMemo(() => {
    if (!enabled) return ""
    if (isNative) {
      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    </style>
  </head>
  <body>
    <script async data-cfasync="false" src="${NATIVE_SRC}"><\/script>
    <div id="${NATIVE_CONTAINER}"></div>
  </body>
</html>`
    }
    const invokeUrl = `${INVOKE_BASE.replace(/\/$/, "")}/${encodeURIComponent(
      key,
    )}/invoke.js`
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
      body { display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        key: ${JSON.stringify(key)},
        format: "iframe",
        height: ${height},
        width: ${width},
        params: {}
      };
    <\/script>
    <script type="text/javascript" src="${invokeUrl}"><\/script>
  </body>
</html>`
  }, [enabled, isNative, key, width, height])

  useEffect(() => {
    if (!enabled) return
    setFilled(false)
    setMeasuredHeight(height)

    // Adsterra injects its creative asynchronously after invoke.js loads, so we
    // poll the (same-origin srcDoc) iframe to detect a fill and, for native
    // units, track the rendered height so the slot sizes itself.
    let attempts = 0
    let isFilled = false
    const timer = window.setInterval(() => {
      attempts += 1
      const iframe = iframeRef.current
      try {
        const doc = iframe?.contentWindow?.document
        const body = doc?.body
        const hasContent =
          !!body && (body.childElementCount > 1 || body.scrollHeight > 1)
        if (hasContent) {
          isFilled = true
          setFilled(true)
          if (isNative && body) {
            const h = Math.max(body.scrollHeight, body.offsetHeight)
            if (h > 1) setMeasuredHeight(h)
          }
        }
      } catch {
        // Cross-origin read can throw; assume filled rather than hide a paying ad.
        setFilled(true)
        window.clearInterval(timer)
        return
      }
      // Banner is fixed-size: stop once filled. Native keeps measuring briefly
      // because rows load progressively and change the height.
      if (isFilled && !isNative) window.clearInterval(timer)
      if (attempts >= 16) window.clearInterval(timer) // ~8s total
    }, 500)

    return () => window.clearInterval(timer)
  }, [enabled, isNative, key, srcDoc, height])

  if (!enabled) return null

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center gap-1 transition-opacity duration-300",
        filled
          ? "opacity-100"
          : "opacity-0 h-0 overflow-hidden pointer-events-none",
        className,
      )}
      aria-hidden={!filled}
    >
      {label ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {label}
        </span>
      ) : null}
      <iframe
        ref={iframeRef}
        title={label || "Advertisement"}
        srcDoc={srcDoc}
        scrolling="no"
        frameBorder={0}
        style={
          isNative
            ? {
                width: "100%",
                maxWidth: nativeMaxWidth,
                height: Math.min(measuredHeight, nativeMaxHeight),
                border: "none",
                margin: "0 auto",
                display: "block",
              }
            : { width, height, border: "none", maxWidth: "100%" }
        }
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
