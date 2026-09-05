"use client"

/**
 * Read-only Word (.docx) viewer.
 *
 * The sibling of ResourceViewer for documents the browser can render itself.
 * A .docx is OOXML — a zip of XML — so docx-preview parses it on the client and
 * paints it as styled HTML. Nothing is converted server-side, which is what
 * lets a Word gift be published on a machine with no LibreOffice installed.
 *
 * What it deliberately does not do, and why:
 *   - No page navigation. docx-preview reflows into page-like sections, but
 *     those are a layout artefact, not fixed pages, so a page box that jumped
 *     around as the window resized would be lying. Sections are counted for the
 *     toolbar and the whole document scrolls.
 *   - No reading-position tracking, for the same reason: there is no stable
 *     page number to store.
 *
 * Read-only is a property of the output, not a mode: the generated HTML carries
 * no contenteditable and no form controls, so there is nothing to type into.
 * Selection and the context menu are suppressed to match ResourceViewer.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  RiErrorWarningLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiLoader4Line,
  RiZoomInLine,
  RiZoomOutLine,
} from "react-icons/ri"
import { Button } from "@/components/ui/button"
import type { ViewerSource } from "@/components/resource/ResourceViewer"

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.2

/**
 * Below this, a page-width Word document renders at unreadable text sizes.
 *
 * Same reasoning as ResourceViewer's floor: on a phone we would rather the
 * document overflow horizontally and pan than shrink body text to 5px. The
 * difference is that docx-preview lays out at a fixed page width in CSS pixels,
 * so the floor is applied as a minimum scale rather than a render width.
 */
const MIN_LEGIBLE_WIDTH = 640

type DocxViewerProps = {
  source: ViewerSource
  /** Shown in the toolbar so the reader knows what they are looking at. */
  label?: string
}

export default function DocxViewer({ source, label = "Word document" }: DocxViewerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sectionCount, setSectionCount] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  /** Unscaled height of the rendered document, so the scroll area can track zoom. */
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const renderRef = useRef<HTMLDivElement | null>(null)

  // Fetch and render. `source` must be referentially stable — the caller
  // memoises it — or this refetches the whole document on every parent render.
  useEffect(() => {
    const container = renderRef.current
    if (!container) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSectionCount(null)
    setNaturalHeight(null)
    container.replaceChildren()

    const run = async () => {
      try {
        const blob = await source.loadContent()
        if (cancelled) return
        // Imported here rather than at module scope: docx-preview pulls in
        // JSZip, and there is no reason to ship either to a reader who never
        // opens a Word gift.
        const { renderAsync } = await import("docx-preview")
        if (cancelled) return

        await renderAsync(blob, container, container, {
          className: "docx",
          inWrapper: true,
          // Page-like sections read far closer to the original than one
          // continuous column, and give us something to count.
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          // Tracked changes and comments are working artefacts of the author's
          // copy, not part of the gift.
          renderChanges: false,
          renderComments: false,
          experimental: true,
        })
        if (cancelled) return

        setSectionCount(container.querySelectorAll("section.docx").length || null)
        setLoading(false)
      } catch (error) {
        if (cancelled) return
        console.error("DOCX render failed:", error)
        setLoadError(
          error instanceof Error && /fetch|network|HTTP/i.test(error.message)
            ? "Couldn't load this document. Please try again."
            : "This Word file couldn't be displayed. It may be corrupted or password-protected.",
        )
        setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [source])

  // Track the rendered document's unscaled height so the scroll area grows and
  // shrinks with zoom. Measured rather than assumed: the height depends on the
  // document's own content.
  useEffect(() => {
    const el = renderRef.current
    if (!el || loading || loadError) return
    const update = () => setNaturalHeight(el.scrollHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, loadError])

  /**
   * On a narrow screen, scale the document up to a legible size rather than
   * letting it render tiny. The result overflows horizontally and pans, which
   * is the readable trade — the same call ResourceViewer makes for PDFs.
   */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const apply = () => {
      const width = el.clientWidth
      if (width > 0 && width < MIN_LEGIBLE_WIDTH) {
        // Only ever nudges the starting zoom; the user's own zoom wins after.
        setZoom((z) => (z === 1 ? Math.round((MIN_LEGIBLE_WIDTH / width) * 10) / 10 : z))
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Escape leaves fullscreen, and the page behind it stays put.
  useEffect(() => {
    if (!isFullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [isFullscreen])

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100)),
    [],
  )
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100)),
    [],
  )
  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault()
          zoomIn()
          break
        case "-":
          e.preventDefault()
          zoomOut()
          break
        case "0":
          e.preventDefault()
          setZoom(1)
          break
        case "f":
        case "F":
          e.preventDefault()
          toggleFullscreen()
          break
      }
    },
    [zoomIn, zoomOut, toggleFullscreen],
  )

  const iconBtn = "h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={
        (isFullscreen
          ? "fixed inset-0 z-[70] flex flex-col bg-page select-none"
          : "rounded-2xl border border-border bg-muted/40 overflow-hidden select-none") + " outline-none"
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border bg-page/95 px-2 py-2 backdrop-blur sm:px-3">
        <div className="flex items-center gap-2 px-1 text-sm text-foreground">
          <span className="font-medium">{label}</span>
          {sectionCount != null && (
            <span className="text-xs text-muted-foreground">
              {sectionCount} {sectionCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
            className={iconBtn}
          >
            <RiZoomOutLine className="h-5 w-5" />
          </Button>
          <span className="w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
            className={iconBtn}
          >
            <RiZoomInLine className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={iconBtn}
          >
            {isFullscreen ? (
              <RiFullscreenExitLine className="h-5 w-5" />
            ) : (
              <RiFullscreenLine className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={
          isFullscreen
            ? "flex-1 overflow-auto p-2"
            : "max-h-[75vh] overflow-auto p-2"
        }
      >
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <RiLoader4Line className="h-5 w-5 animate-spin" aria-hidden />
            Rendering document…
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <RiErrorWarningLine className="h-8 w-8 text-red-500" aria-hidden />
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
        )}

        {/* Scaling with a transform keeps docx-preview's own layout intact; the
            outer height is scaled to match so the scrollbar stays honest. */}
        <div
          style={naturalHeight != null ? { height: naturalHeight * zoom } : undefined}
          className={loading || loadError ? "hidden" : undefined}
        >
          <div
            ref={renderRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            className="[&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_section.docx]:mx-auto [&_section.docx]:mb-4 [&_section.docx]:shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}
