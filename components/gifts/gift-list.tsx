"use client"

/**
 * The shared gift list.
 *
 * Every user sees the same gifts in the same order — there is no per-user
 * assignment. What differs per viewer is only the NEW badge and like/save
 * state, which the backend folds into each item.
 *
 * Rendered inside the Gifts tab on the profile page; kept as its own component
 * so the tab stays a thin call site.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { RiGiftFill, RiLoader4Line } from "react-icons/ri"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/i18n/context"
import { fetchGifts } from "@/lib/gifts/api"
import type { Gift } from "@/lib/gifts/types"
import GiftCard from "@/components/gifts/gift-card"

const PAGE_SIZE = 20

export default function GiftList() {
  const { t } = useLocale()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const loadedPages = useRef(new Set<number>())

  const load = useCallback(async (target: number) => {
    if (loadedPages.current.has(target)) return
    loadedPages.current.add(target)
    setLoading(true)
    const result = await fetchGifts(target, PAGE_SIZE)
    if (!result) {
      // Let a failed page be retried rather than permanently marked as loaded.
      loadedPages.current.delete(target)
      setFailed(true)
      setLoading(false)
      return
    }
    setFailed(false)
    setGifts((prev) => (target === 1 ? result.gifts : [...prev, ...result.gifts]))
    setHasMore(result.pagination.hasMore)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  const retry = useCallback(() => {
    setFailed(false)
    void load(page)
  }, [load, page])

  if (loading && gifts.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/50" />
        ))}
      </div>
    )
  }

  if (failed && gifts.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-border/60 bg-card/50 py-12 text-center">
        <p className="text-body-sm text-muted-foreground">{t("gifts.loadError")}</p>
        <Button type="button" variant="outline" onClick={retry} className="mt-4 rounded-xl">
          {t("common.retry")}
        </Button>
      </div>
    )
  }

  if (gifts.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-border/60 bg-card/50 py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/50">
          <RiGiftFill className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-body-sm font-semibold text-foreground">{t("gifts.empty")}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{t("gifts.emptyHint")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("gifts.listSubtitle")}</p>

      {gifts.map((gift) => (
        <GiftCard key={gift._id} gift={gift} />
      ))}

      {hasMore && (
        <div className="pt-2 text-center">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl"
          >
            {loading ? <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden /> : t("common.next")}
          </Button>
        </div>
      )}
    </div>
  )
}
