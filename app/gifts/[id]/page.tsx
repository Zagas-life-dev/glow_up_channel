"use client"

/**
 * A gift's detail page.
 *
 * Built on the same shell as the opportunity, event, job and resource pages, so
 * a gift reads like the rest of the app rather than a one-off: hero with stat
 * tiles, a labelled body, and the primary action parked in the desktop rail /
 * phone bottom bar instead of stacked in with the content.
 *
 * What it deliberately does not borrow from those pages: ranking explanations,
 * "similar items", and the share composer. All three assume public feed content,
 * and a gift is members-only and unranked. The action slot carries a reader or a
 * link instead of an Apply button, and there is no download anywhere — file
 * gifts stream through the content proxy and render in place.
 */

import { use, useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  RiBookOpenLine,
  RiBookmarkFill,
  RiBookmarkLine,
  RiCalendarLine,
  RiExternalLinkLine,
  RiEyeOffLine,
  RiFileTextLine,
  RiGiftFill,
  RiGiftLine,
  RiHeartFill,
  RiHeartLine,
  RiPlayListAddLine,
  RiPriceTag3Line,
} from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import AddToPlaylistModal from "@/components/add-to-playlist-modal"
import { DetailHero } from "@/components/content-detail/detail-hero"
import { ContentDetailShell } from "@/components/content-detail/detail-shell"
import {
  DetailProse,
  DetailSection,
  Fact,
  FactList,
  TagRow,
} from "@/components/content-detail/sections"
import { composeTiles, formatDate, type StatTile } from "@/lib/content-detail/format"
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

/**
 * The few numbers worth reading before anything else.
 *
 * A gift has no deadline — nothing to count down to — so unlike the other detail
 * pages this one never passes an urgent tile. Tiles are only built from what the
 * gift actually carries, so a link gift simply renders fewer of them.
 */
function buildStatTiles(gift: Gift): StatTile[] {
  const optional: StatTile[] = []

  optional.push({
    label: "Format",
    value: gift.giftType === "link" ? "Link" : (gift.fileType ?? "File").toUpperCase(),
  })

  if (gift.pageCount) {
    optional.push({ label: "Length", value: `${gift.pageCount} ${gift.pageCount === 1 ? "page" : "pages"}` })
  }

  const size = formatGiftSize(gift.fileSize)
  if (size) optional.push({ label: "Size", value: size })

  return composeTiles(optional, null)
}

export default function GiftDetailPage({ params }: GiftPageProps) {
  const { id } = use(params)
  const { t } = useLocale()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()

  const [gift, setGift] = useState<Gift | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState<"like" | "save" | null>(null)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const readerRef = useRef<HTMLDivElement | null>(null)

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

  const scrollToReader = useCallback(() => {
    readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const listHref = giftsHref(user?._id)

  if (authLoading || loading) return <PageSkeleton />

  if (!isAuthenticated) {
    return (
      <div className="mx-auto mt-10 max-w-md px-5">
        <div className="rounded-[1.5rem] border border-border bg-card p-8 text-center">
          <RiGiftFill className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
          <p className="text-body-sm font-semibold text-foreground">{t("gifts.signedInOnly")}</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link href="/login">{t("common.next")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (notFound || !gift) {
    return (
      <div className="mx-auto mt-10 max-w-md px-5">
        <div className="rounded-[1.5rem] border border-border bg-card p-8 text-center">
          <RiGiftLine className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-body-sm font-semibold text-foreground">Gift not found</p>
          <p className="mt-1 text-xs text-muted-foreground">This gift may have been removed.</p>
          {listHref && (
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href={listHref}>{t("gifts.backToGifts")}</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const isFile = gift.giftType === "file"
  const eyebrow = [t("gifts.badge"), gift.category].filter(Boolean).join(" · ")

  /**
   * Cover art placement adapts to the gift.
   *
   * A link gift has nothing else to look at, so its cover earns a full banner.
   * A file gift already shows its own first page in the reader below, so the
   * cover shrinks to a jacket thumbnail beside the facts rather than repeating
   * the same artwork twice at full width.
   */
  const coverBanner = gift.image && !isFile
  const coverThumb = gift.image && isFile

  const primaryAction = isFile ? (
    <Button
      type="button"
      size="lg"
      onClick={scrollToReader}
      className="h-14 w-full rounded-full text-[15px] font-semibold"
    >
      <RiBookOpenLine className="h-4 w-4" aria-hidden />
      <span className="truncate">{t("gifts.openGift")}</span>
    </Button>
  ) : gift.linkUrl ? (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <a href={gift.linkUrl} target="_blank" rel="noopener noreferrer">
        <span className="truncate">{t("gifts.openLink")}</span>
        <RiExternalLinkLine className="h-4 w-4 flex-shrink-0" aria-hidden />
      </a>
    </Button>
  ) : null

  const addToPlaylistButton = (
    <button
      type="button"
      onClick={() => setPlaylistOpen(true)}
      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      aria-label={t("gifts.addToPlaylist")}
    >
      <RiPlayListAddLine className="h-5 w-5" aria-hidden />
    </button>
  )

  return (
    <ContentDetailShell
      hero={
        <DetailHero
          eyebrow={eyebrow}
          title={gift.title}
          subtitle={t("gifts.fromTeam")}
          tiles={buildStatTiles(gift)}
          accent="violet"
        />
      }
      action={primaryAction}
      secondaryAction={addToPlaylistButton}
      actionNote={`${t("gifts.added")} ${formatDate(gift.createdAt)}`}
      rail={
        <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("gifts.badge")}
          </p>
          <p className="text-[13px] leading-snug text-muted-foreground">{t("gifts.railNote")}</p>
          {listHref && (
            <Link
              href={listHref}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              <RiGiftLine className="h-3.5 w-3.5" aria-hidden />
              {t("gifts.listTitle")}
            </Link>
          )}
        </div>
      }
      overlays={
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
      }
    >
      {coverBanner && (
        <img
          src={gift.image as string}
          alt=""
          className="aspect-[16/9] w-full rounded-[1.25rem] border border-border/60 object-cover"
          draggable={false}
        />
      )}

      <DetailSection label="About">
        <div className="flex gap-4">
          {coverThumb && (
            <img
              src={gift.image as string}
              alt=""
              className="h-24 w-24 flex-shrink-0 rounded-xl border border-border/60 object-cover"
              draggable={false}
            />
          )}
          <DetailProse>{gift.description}</DetailProse>
        </div>
      </DetailSection>

      <DetailSection label="Details">
        <FactList>
          <Fact icon={RiGiftLine} label="Type">
            <span className="capitalize">{gift.category}</span>
          </Fact>
          <Fact icon={RiFileTextLine} label="Format">
            {isFile ? `${(gift.fileType ?? "file").toUpperCase()} — read in the app` : "External link"}
          </Fact>
          {gift.pageCount ? (
            <Fact icon={RiBookOpenLine} label="Length">
              {gift.pageCount} {gift.pageCount === 1 ? "page" : "pages"}
            </Fact>
          ) : null}
          <Fact icon={RiCalendarLine} label="Added">
            {formatDate(gift.createdAt)}
          </Fact>
          {gift.tags.length > 0 && (
            <Fact icon={RiPriceTag3Line} label="Tags">
              <TagRow tags={gift.tags} className="mt-1" />
            </Fact>
          )}
        </FactList>
      </DetailSection>

      {/* The gift itself. The reader is the body of the page for a file gift,
          which is why the primary action scrolls here rather than navigating. */}
      {isFile && (
        <DetailSection label="Read it here">
          <div ref={readerRef} className="scroll-mt-20">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <RiEyeOffLine className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
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
        </DetailSection>
      )}

      {/* Engagement sits at the foot of the article, matching where the other
          detail pages put EngagementActions. Gifts have their own endpoints, so
          this is the gift-shaped equivalent rather than that shared component. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
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
          {gift.metrics.likeCount > 0 && (
            <span className="ml-1.5 tabular-nums opacity-70">{gift.metrics.likeCount}</span>
          )}
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
      </div>
    </ContentDetailShell>
  )
}
