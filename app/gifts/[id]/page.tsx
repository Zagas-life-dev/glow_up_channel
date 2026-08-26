"use client"

/**
 * A gift's detail page.
 *
 * Deliberately not built on the shared content-detail shell: that shell carries
 * ranking explanations, similar-content rails, and share affordances, all of
 * which assume the item is public feed content. A gift is none of those things,
 * so this page shows the gift, renders it, and offers only the actions a gift
 * supports — like, save, add to a list. There is no download: file gifts stream
 * through the content proxy and render in place.
 */

import { use, useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  RiArrowLeftLine,
  RiBookmarkFill,
  RiBookmarkLine,
  RiExternalLinkLine,
  RiEyeOffLine,
  RiGiftFill,
  RiHeartFill,
  RiHeartLine,
  RiPlayListAddLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/layout/page-shell"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import AddToPlaylistModal from "@/components/add-to-playlist-modal"
import { useAuth } from "@/lib/auth-context"
import { useLocale } from "@/lib/i18n/context"
import { giftsHref } from "@/lib/gifts/routes"
import {
  fetchGift,
  fetchGiftContentBlob,
  markGiftOpened,
  setGiftLiked,
  setGiftSaved,
} from "@/lib/gifts/api"
import { formatGiftSize, type Gift } from "@/lib/gifts/types"

// The viewer depends on browser-only pdf.js APIs; load it client-side only.
const ResourceViewer = dynamic(() => import("@/components/resource/ResourceViewer"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
      Loading viewer…
    </div>
  ),
})

type GiftPageProps = { params: Promise<{ id: string }> }

export default function GiftDetailPage({ params }: GiftPageProps) {
  const { id } = use(params)
  const { t } = useLocale()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()

  const [gift, setGift] = useState<Gift | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState<"like" | "save" | null>(null)
  const [playlistOpen, setPlaylistOpen] = useState(false)

  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    let cancelled = false
    setLoading(true)
    fetchGift(id)
      .then((result) => {
        if (cancelled) return
        if (!result) setNotFound(true)
        else setGift(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, authLoading, isAuthenticated])

  // Opening the page is what clears the NEW badge and counts the view.
  useEffect(() => {
    if (!gift) return
    void markGiftOpened(gift._id)
  }, [gift])

  const toggleLike = useCallback(async () => {
    if (!gift || busy) return
    const next = !gift.liked
    setBusy("like")
    // Optimistic: the counter and the icon move together, and roll back as one.
    setGift((g) =>
      g ? { ...g, liked: next, metrics: { ...g.metrics, likeCount: g.metrics.likeCount + (next ? 1 : -1) } } : g,
    )
    try {
      await setGiftLiked(gift._id, next)
    } catch {
      setGift((g) =>
        g ? { ...g, liked: !next, metrics: { ...g.metrics, likeCount: g.metrics.likeCount + (next ? -1 : 1) } } : g,
      )
      toast.error("Couldn't update that. Try again.")
    } finally {
      setBusy(null)
    }
  }, [gift, busy])

  const toggleSave = useCallback(async () => {
    if (!gift || busy) return
    const next = !gift.saved
    setBusy("save")
    setGift((g) =>
      g ? { ...g, saved: next, metrics: { ...g.metrics, saveCount: g.metrics.saveCount + (next ? 1 : -1) } } : g,
    )
    try {
      await setGiftSaved(gift._id, next)
    } catch {
      setGift((g) =>
        g ? { ...g, saved: !next, metrics: { ...g.metrics, saveCount: g.metrics.saveCount + (next ? -1 : 1) } } : g,
      )
      toast.error("Couldn't update that. Try again.")
    } finally {
      setBusy(null)
    }
  }, [gift, busy])

  const listHrefForUser = giftsHref(user?._id)

  if (authLoading || loading) return <PageSkeleton />

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <RiGiftFill className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
          <p className="text-body-sm font-semibold text-foreground">{t("gifts.signedInOnly")}</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link href="/login">{t("common.next")}</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  if (notFound || !gift) {
    return (
      <PageShell>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <RiGiftFill className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-body-sm font-semibold text-foreground">Gift not found</p>
          <p className="mt-1 text-xs text-muted-foreground">This gift may have been removed.</p>
          {listHrefForUser && (
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href={listHrefForUser}>{t("gifts.backToGifts")}</Link>
            </Button>
          )}
        </div>
      </PageShell>
    )
  }

  const listHref = listHrefForUser
  const size = formatGiftSize(gift.fileSize)

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        {listHref && (
          <Link
            href={listHref}
            className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiArrowLeftLine className="h-4 w-4" aria-hidden />
            {t("gifts.backToGifts")}
          </Link>
        )}

        {/* Header */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/25 via-brand-orange/20 to-violet-500/25 sm:h-56">
            {gift.image ? (
              <img src={gift.image} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <RiGiftFill className="h-20 w-20 text-primary drop-shadow" aria-hidden />
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                <RiGiftFill className="h-3.5 w-3.5" aria-hidden />
                {t("gifts.badge")}
              </span>
              {gift.category && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {gift.category}
                </span>
              )}
              {gift.pageCount ? (
                <span className="text-xs text-muted-foreground">
                  {gift.pageCount} {gift.pageCount === 1 ? "page" : "pages"}
                </span>
              ) : null}
              {size && <span className="text-xs text-muted-foreground">{size}</span>}
            </div>

            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{gift.title}</h1>
            <p className="mt-3 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
              {gift.description}
            </p>

            {gift.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {gift.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions. No download button — gifts render in the app only. */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={gift.liked ? "default" : "outline"}
                onClick={toggleLike}
                disabled={busy === "like"}
                className="h-10 rounded-xl text-sm"
              >
                {gift.liked ? (
                  <RiHeartFill className="mr-1.5 h-4 w-4" aria-hidden />
                ) : (
                  <RiHeartLine className="mr-1.5 h-4 w-4" aria-hidden />
                )}
                {gift.liked ? t("gifts.liked") : t("gifts.like")}
              </Button>

              <Button
                type="button"
                variant={gift.saved ? "default" : "outline"}
                onClick={toggleSave}
                disabled={busy === "save"}
                className="h-10 rounded-xl text-sm"
              >
                {gift.saved ? (
                  <RiBookmarkFill className="mr-1.5 h-4 w-4" aria-hidden />
                ) : (
                  <RiBookmarkLine className="mr-1.5 h-4 w-4" aria-hidden />
                )}
                {gift.saved ? t("gifts.saved") : t("gifts.save")}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setPlaylistOpen(true)}
                className="h-10 rounded-xl text-sm"
              >
                <RiPlayListAddLine className="mr-1.5 h-4 w-4" aria-hidden />
                {t("gifts.addToPlaylist")}
              </Button>

              {gift.giftType === "link" && gift.linkUrl && (
                <Button asChild className="h-10 rounded-xl text-sm">
                  <a href={gift.linkUrl} target="_blank" rel="noopener noreferrer">
                    <RiExternalLinkLine className="mr-1.5 h-4 w-4" aria-hidden />
                    {t("gifts.openLink")}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* The gift itself, rendered in place. */}
        {gift.giftType === "file" && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RiEyeOffLine className="h-3.5 w-3.5" aria-hidden />
              {t("gifts.viewOnly")}
            </p>
            <ResourceViewer
              source={{
                id: gift._id,
                loadContent: () => fetchGiftContentBlob(gift._id),
              }}
              fileType={gift.fileType}
              initialPageCount={gift.pageCount}
            />
          </div>
        )}
      </div>

      <AddToPlaylistModal
        isOpen={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        item={{
          _id: gift._id,
          title: gift.title,
          type: "gift",
          description: gift.description,
        }}
        onItemAddedToPlaylist={() => toast.success("Added to your list")}
      />
    </PageShell>
  )
}
