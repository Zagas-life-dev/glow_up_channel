"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import ApiClient from '@/lib/api-client'
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiAspectRatioLine,
  RiClockwise2Line,
} from 'react-icons/ri'

// Configure the pdf.js worker. The `new URL(..., import.meta.url)` form lets the
// bundler (Turbopack/webpack) emit the worker as a local asset — no external CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const IMAGE_FILE_TYPES = new Set(['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'])

// Padding (px, both sides) around a rendered page. Kept tight so pages are as
// large as possible on small screens; matches the `p-2` content padding below.
const PAGE_GUTTER = 16

/**
 * Smallest width a page is allowed to render at under fit-width.
 *
 * Plain fit-width is wrong on a phone: squeezing an A4 page into a 360px column
 * renders body text at roughly 5px, which is unreadable — the document is
 * "visible" and useless. Below this width we stop shrinking and let the page
 * overflow horizontally instead, so text stays legible and the reader pans. At
 * 640px an A4 page lands near 10-11px body text.
 *
 * Only fit-width is floored. Fit-page is an explicit "show me the whole sheet"
 * request, and zoom still scales freely in both directions from the floored
 * base, so nothing here prevents deliberately zooming out.
 */
const MIN_LEGIBLE_WIDTH = 640

const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 0.2

/** Zoom level a double-tap jumps to, and back from. */
const DOUBLE_TAP_ZOOM = 2
const DOUBLE_TAP_MS = 300

type FitMode = 'width' | 'page'

/**
 * Where the viewer gets its bytes and (optionally) its reading position.
 *
 * Abstracted so resources and gifts share one viewer: they are the same kind of
 * document behind different collections and different content proxies, and
 * forking the viewer would have meant fixing the mobile scaling problem twice.
 */
export type ViewerSource = {
  /** Stable identity for the document; state resets when it changes. */
  id: string
  /** Fetch the document bytes through whichever authenticated proxy owns it. */
  loadContent: () => Promise<Blob>
  /** Restore the last page read, if this source tracks progress. */
  loadProgress?: () => Promise<number | null>
  /** Persist the current page. Called debounced; failures are the caller's to swallow. */
  saveProgress?: (page: number, pageCount: number | null) => void
}

type ResourceViewerProps = {
  /**
   * Resource-backed shorthand. Supply this or `source`; `source` wins when both
   * are given.
   */
  resourceId?: string
  /** Generic document source — used by gifts, which are not resources. */
  source?: ViewerSource
  fileType?: string | null
  /** Total pages/slides if known up front (from the document's metadata). */
  initialPageCount?: number | null
}

/** The default source: a resource, read through the resource content proxy. */
function resourceSource(resourceId: string): ViewerSource {
  return {
    id: resourceId,
    loadContent: () => ApiClient.getResourceContentBlob(resourceId),
    loadProgress: async () => {
      const progress = await ApiClient.getResourceProgress(resourceId)
      return progress?.page ?? null
    },
    saveProgress: (page, pageCount) => {
      ApiClient.saveResourceProgress(resourceId, page, pageCount ?? undefined).catch(() => {})
    },
  }
}

export default function ResourceViewer({
  resourceId,
  source,
  fileType,
  initialPageCount = null,
}: ResourceViewerProps) {
  const isImage = IMAGE_FILE_TYPES.has(fileType ?? '')

  // Memoised so the effects below key off a stable object across renders.
  const activeSource = useMemo<ViewerSource | null>(() => {
    if (source) return source
    if (resourceId) return resourceSource(resourceId)
    return null
  }, [source, resourceId])

  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(initialPageCount)
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [loadError, setLoadError] = useState(false)
  const [progressRestored, setProgressRestored] = useState(false)
  const [contentWidth, setContentWidth] = useState<number>(800)
  const [contentHeight, setContentHeight] = useState<number>(600)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Chrome-style view controls.
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<FitMode>('width')
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<number | null>(null) // originalWidth / originalHeight

  const contentRef = useRef<HTMLDivElement | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sourceId = activeSource?.id ?? null

  // Fetch the document bytes through the authenticated proxy (asset URL never exposed).
  useEffect(() => {
    if (!activeSource) return
    let cancelled = false
    let createdUrl: string | null = null
    setLoadError(false)
    setObjectUrl(null)
    activeSource
      .loadContent()
      .then((b) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(b)
        setObjectUrl(createdUrl)
      })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [activeSource])

  // Restore last reading position (PDF/doc only — images have no page concept,
  // and not every source tracks progress).
  useEffect(() => {
    if (!activeSource) return
    if (isImage || !activeSource.loadProgress) { setProgressRestored(true); return }
    let cancelled = false
    activeSource
      .loadProgress()
      .then((restored) => {
        if (cancelled) return
        if (restored && restored > 0) setPage(restored)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProgressRestored(true) })
    return () => { cancelled = true }
  }, [activeSource, isImage])

  // Keep the editable page box in sync with the actual page.
  useEffect(() => { setPageInput(String(page)) }, [page])

  // Track the content area's size so pages render crisply at the available width
  // and fit-to-page can use the available height. Observing the inner scroll area
  // means pages automatically resize when fullscreen toggles.
  useEffect(() => {
    if (isImage) return
    const el = contentRef.current
    if (!el) return
    const update = () => {
      setContentWidth(Math.min(el.clientWidth, isFullscreen ? 1600 : 1000))
      setContentHeight(el.clientHeight)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isImage, isFullscreen])

  // Lock background scroll + allow Escape to exit while fullscreen.
  useEffect(() => {
    if (!isFullscreen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isFullscreen])

  // Persist reading progress (debounced, PDF/doc only).
  useEffect(() => {
    if (isImage || !progressRestored) return
    const save = activeSource?.saveProgress
    if (!save) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(page, numPages), 600)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [page, numPages, progressRestored, activeSource, isImage])

  // Memoize so Document only reloads when the URL changes, not on page navigation.
  const fileProp = useMemo(
    () => (objectUrl && !isImage ? { url: objectUrl } : null),
    [objectUrl, isImage]
  )

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setPage((p) => Math.min(Math.max(1, p), n))
  }, [])

  const onPageLoadSuccess = useCallback((p: { originalWidth?: number; originalHeight?: number; width: number; height: number }) => {
    const w = p.originalWidth ?? p.width
    const h = p.originalHeight ?? p.height
    if (w && h) setAspect(w / h)
  }, [])

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), [])
  const goNext = useCallback(() => setPage((p) => (numPages ? Math.min(numPages, p + 1) : p + 1)), [numPages])
  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), [])
  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100)), [])
  const toggleFit = useCallback(() => {
    setZoom(1)
    setFitMode((m) => (m === 'width' ? 'page' : 'width'))
  }, [])
  const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), [])

  /**
   * Touch gestures: two-finger pinch, and double-tap to toggle zoom.
   *
   * Attached natively rather than through React props because the pinch handler
   * has to call preventDefault to stop the browser zooming the whole page, and
   * React's touch listeners are registered passive.
   */
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    let pinchStartDistance = 0
    let pinchStartZoom = 1
    let lastTapAt = 0

    const distanceBetween = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDistance = distanceBetween(e.touches)
        pinchStartZoom = zoom
        return
      }
      if (e.touches.length === 1) {
        const now = Date.now()
        if (now - lastTapAt < DOUBLE_TAP_MS) {
          // Snap between the fitted view and a readable close-up.
          setZoom((z) => (z > 1.05 ? 1 : DOUBLE_TAP_ZOOM))
          lastTapAt = 0
        } else {
          lastTapAt = now
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistance === 0) return
      e.preventDefault()
      const ratio = distanceBetween(e.touches) / pinchStartDistance
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartZoom * ratio))
      setZoom(Math.round(next * 100) / 100)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDistance = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [zoom])

  const commitPageInput = useCallback(() => {
    const n = parseInt(pageInput, 10)
    if (!Number.isNaN(n)) {
      const clamped = Math.min(Math.max(1, n), numPages ?? n)
      setPage(clamped)
    } else {
      setPageInput(String(page))
    }
  }, [pageInput, numPages, page])

  // Scoped keyboard shortcuts (mirrors Chrome's PDF viewer); ignored while typing
  // in the page-number box.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault(); goNext(); break
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); goPrev(); break
      case '+':
      case '=':
        e.preventDefault(); zoomIn(); break
      case '-':
        e.preventDefault(); zoomOut(); break
      case '0':
        e.preventDefault(); setZoom(1); break
      case 'f':
      case 'F':
        e.preventDefault(); toggleFullscreen(); break
    }
  }, [goNext, goPrev, zoomIn, zoomOut, toggleFullscreen])

  if (!activeSource) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
        <RiErrorWarningLine className="h-8 w-8 text-red-500" />
        <p className="text-sm text-muted-foreground">No document to display.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
        <RiErrorWarningLine className="h-8 w-8 text-red-500" />
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this document. Please try again.</p>
      </div>
    )
  }

  // Compute the rendered page width from fit mode + zoom + rotation.
  const effectiveAspect = aspect == null ? null : rotation % 180 === 0 ? aspect : 1 / aspect
  const available = contentWidth - PAGE_GUTTER
  // The legibility floor: never let fit-width shrink a page below readable size,
  // and never let the floor inflate a page on a screen that is already wide
  // enough (max, not a bare constant).
  const fitWidthBase = Math.max(available, MIN_LEGIBLE_WIDTH)
  const availHeight = Math.max(240, contentHeight - PAGE_GUTTER)
  const fitPageBase = effectiveAspect ? Math.min(available, effectiveAspect * availHeight) : available
  const base = fitMode === 'page' ? fitPageBase : fitWidthBase
  const pageWidth = Math.max(120, base * zoom)

  const iconBtn = 'h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40'

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={
        (isFullscreen
          ? 'fixed inset-0 z-[70] flex flex-col bg-page select-none'
          : 'rounded-2xl border border-border bg-muted/40 overflow-hidden select-none') + ' outline-none'
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Toolbar — wraps on small screens. Page nav (left) + view controls (right). */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border bg-page/95 px-2 py-2 backdrop-blur sm:px-3">
        <div className="flex items-center gap-1">
          {!isImage && (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={goPrev} disabled={page <= 1} aria-label="Previous page" className={iconBtn}>
                <RiArrowLeftSLine className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1 text-sm text-foreground">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={commitPageInput}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitPageInput(); (e.target as HTMLInputElement).blur() } }}
                  aria-label="Page number"
                  className="h-9 w-10 rounded-lg border border-border bg-card text-center text-sm tabular-nums outline-none focus:border-violet-500"
                />
                <span className="text-muted-foreground">/ {numPages ?? '—'}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={goNext} disabled={numPages != null && page >= numPages} aria-label="Next page" className={iconBtn}>
                <RiArrowRightSLine className="h-5 w-5" />
              </Button>
            </>
          )}
          {isImage && <span className="px-1 text-sm font-medium text-foreground">Image</span>}
        </div>

        <div className="flex items-center gap-1">
          {!isImage && (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" className={iconBtn}>
                <RiZoomOutLine className="h-5 w-5" />
              </Button>
              <span className="w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button type="button" variant="ghost" size="icon" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" className={iconBtn}>
                <RiZoomInLine className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleFit}
                aria-label={fitMode === 'width' ? 'Fit page' : 'Fit width'}
                title={fitMode === 'width' ? 'Fit page' : 'Fit width'}
                className={iconBtn + (fitMode === 'page' ? ' text-violet-500' : '')}
              >
                <RiAspectRatioLine className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={rotate} aria-label="Rotate" className={iconBtn}>
                <RiClockwise2Line className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className={iconBtn}
          >
            {isFullscreen ? <RiFullscreenExitLine className="h-5 w-5" /> : <RiFullscreenLine className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Content — overflow-auto scrolls both axes, which is what makes the
          legibility floor usable: below MIN_LEGIBLE_WIDTH the page is wider than
          the screen on purpose and the reader pans across it. The inner
          `mx-auto w-fit` centers the page when it's smaller than the viewport,
          but auto margins collapse to 0 when it's larger, keeping it left-anchored
          and fully scrollable (flex `justify-center` would clip the left overflow).
          `touch-action: pan-x pan-y` leaves one-finger panning to the browser
          while the pinch handler claims two-finger gestures. */}
      <div
        ref={contentRef}
        className={`overflow-auto overscroll-contain ${isFullscreen ? 'flex-1' : ''}`}
        style={{
          touchAction: 'pan-x pan-y',
          ...(isFullscreen ? {} : { maxHeight: '85vh' }),
        }}
      >
        <div className="mx-auto w-fit p-2">
          {!objectUrl ? (
            <div className="flex items-center justify-center py-24">
              <RiLoader4Line className="h-7 w-7 animate-spin text-violet-500" />
            </div>
          ) : isImage ? (
            <img
              src={objectUrl}
              alt="Document"
              className="h-auto max-w-full rounded-lg object-contain"
              style={{ maxHeight: isFullscreen ? 'calc(100vh - 64px)' : '78vh' }}
              draggable={false}
            />
          ) : (
            <Document
              file={fileProp}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setLoadError(true)}
              loading={
                <div className="flex items-center justify-center py-24">
                  <RiLoader4Line className="h-7 w-7 animate-spin text-violet-500" />
                </div>
              }
            >
              <Page
                pageNumber={page}
                width={pageWidth}
                rotate={rotation}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center py-24">
                    <RiLoader4Line className="h-7 w-7 animate-spin text-violet-500" />
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  )
}
