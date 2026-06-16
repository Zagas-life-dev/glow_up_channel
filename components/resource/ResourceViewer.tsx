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

const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 0.2

type FitMode = 'width' | 'page'

type ResourceViewerProps = {
  resourceId: string
  fileType?: string | null
  /** Total pages/slides if known up front (from resource metadata). */
  initialPageCount?: number | null
}

export default function ResourceViewer({ resourceId, fileType, initialPageCount = null }: ResourceViewerProps) {
  const isImage = IMAGE_FILE_TYPES.has(fileType ?? '')

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

  // Fetch the file bytes through the authenticated backend proxy (Cloudinary URL never exposed).
  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null
    setLoadError(false)
    setObjectUrl(null)
    ApiClient.getResourceContentBlob(resourceId)
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
  }, [resourceId])

  // Restore last reading position (PDF/doc only — images have no page concept).
  useEffect(() => {
    if (isImage) { setProgressRestored(true); return }
    let cancelled = false
    ApiClient.getResourceProgress(resourceId)
      .then((p) => {
        if (cancelled) return
        if (p?.page && p.page > 0) setPage(p.page)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProgressRestored(true) })
    return () => { cancelled = true }
  }, [resourceId, isImage])

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
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      ApiClient.saveResourceProgress(resourceId, page, numPages ?? undefined).catch(() => {})
    }, 600)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [page, numPages, progressRestored, resourceId, isImage])

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

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
        <RiErrorWarningLine className="h-8 w-8 text-red-500" />
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this resource. Please try again.</p>
      </div>
    )
  }

  // Compute the rendered page width from fit mode + zoom + rotation.
  const effectiveAspect = aspect == null ? null : rotation % 180 === 0 ? aspect : 1 / aspect
  const fitWidthBase = contentWidth - PAGE_GUTTER
  const availHeight = Math.max(240, contentHeight - PAGE_GUTTER)
  const fitPageBase = effectiveAspect ? Math.min(fitWidthBase, effectiveAspect * availHeight) : fitWidthBase
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

      {/* Content — overflow-auto scrolls both axes when zoomed. The inner
          `mx-auto w-fit` centers the page when it's smaller than the viewport,
          but auto margins collapse to 0 when it's larger, keeping it left-anchored
          and fully scrollable (flex `justify-center` would clip the left overflow). */}
      <div
        ref={contentRef}
        className={`overflow-auto ${isFullscreen ? 'flex-1' : ''}`}
        style={isFullscreen ? undefined : { maxHeight: '85vh' }}
      >
        <div className="mx-auto w-fit p-2">
          {!objectUrl ? (
            <div className="flex items-center justify-center py-24">
              <RiLoader4Line className="h-7 w-7 animate-spin text-violet-500" />
            </div>
          ) : isImage ? (
            <img
              src={objectUrl}
              alt="Resource"
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
