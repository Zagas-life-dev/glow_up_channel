"use client"

/**
 * Admin: gifts.
 *
 * Publishing is the notification. The moment a gift is created, every member's
 * next announcement check finds a gift newer than their last acknowledged one
 * and the popup fires — which is why creating confirms first.
 *
 * Editing deliberately does not re-announce. The popup keys off `createdAt`,
 * which an edit leaves alone, so fixing a typo or swapping a file is silent and
 * members who already dismissed the announcement stay dismissed.
 */

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
  RiGiftLine,
  RiHeartLine,
  RiLoader4Line,
  RiSaveLine,
  RiSearchLine,
  RiUploadCloud2Line,
} from "react-icons/ri"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminCard, AdminEmpty, AdminSkeletonRows } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  createGift,
  deleteGift,
  fetchGiftsAdmin,
  searchGiftListings,
  updateGift,
} from "@/lib/gifts/api"
import { compressImage, formatBytes, MAX_COVER_BYTES } from "@/lib/images/compress-image"
import {
  formatGiftSize,
  giftListingDate,
  GIFT_CATEGORIES,
  GIFT_LISTING_LABELS,
  type Gift,
  type GiftListingRef,
  type GiftListingType,
} from "@/lib/gifts/types"
import { GIFT_LISTING_ICONS } from "@/components/gifts/listing-icons"

type DeliveryMode = "file" | "link" | "listing"

/** Type filters offered above the listing picker. */
const LISTING_FILTERS: Array<{ value: GiftListingType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "opportunity", label: "Opportunities" },
  { value: "event", label: "Events" },
  { value: "job", label: "Jobs" },
  { value: "resource", label: "Resources" },
]

/** How long to sit on keystrokes before searching listings. */
const LISTING_SEARCH_DEBOUNCE_MS = 300

/** One line of context under a listing's title in the picker. */
function listingSummary(listing: GiftListingRef): string {
  const date = giftListingDate(listing)
  return [
    GIFT_LISTING_LABELS[listing.type],
    listing.provider,
    listing.location,
    date ? `${date.label} ${new Date(date.value).toLocaleDateString()}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "guide",
  tags: "",
  linkUrl: "",
}

/** What the gift currently holds, for the "leave blank to keep" hints. */
function currentFileLabel(gift: Gift): string {
  if (gift.giftType === "listing") {
    return gift.listing
      ? `${GIFT_LISTING_LABELS[gift.listing.type]} — ${gift.listing.title ?? "untitled"}${
          gift.listing.isLive ? "" : " (closed)"
        }`
      : "a listing"
  }
  if (gift.giftType === "link") return gift.linkUrl ?? "external link"
  const parts = [
    (gift.fileType ?? "file").toUpperCase(),
    gift.pageCount ? `${gift.pageCount} ${gift.pageCount === 1 ? "page" : "pages"}` : null,
    formatGiftSize(gift.fileSize),
  ].filter(Boolean)
  return parts.join(" · ")
}

export default function AdminGiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  /** Null while creating; the gift being changed while editing. */
  const [editing, setEditing] = useState<Gift | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Gift | null>(null)

  const [mode, setMode] = useState<DeliveryMode>("file")
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  /** An oversized cover is re-encoded before it becomes the selection. */
  const [compressingCover, setCompressingCover] = useState(false)
  /** Object URL for the chosen cover, so the admin can see what they picked. */
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  /** Same, for an image uploaded as the gift itself rather than as its cover. */
  const [filePreview, setFilePreview] = useState<string | null>(null)
  /** Off by default: a gift reads in the app unless someone opts it out. */
  const [allowDownload, setAllowDownload] = useState(false)

  // The listing picker.
  const [selectedListing, setSelectedListing] = useState<GiftListingRef | null>(null)
  const [listingQuery, setListingQuery] = useState("")
  const [listingFilter, setListingFilter] = useState<GiftListingType | "all">("all")
  const [listingResults, setListingResults] = useState<GiftListingRef[]>([])
  const [listingSearching, setListingSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setGifts(await fetchGiftsAdmin())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load gifts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Keep a preview URL alive for the chosen cover.
   *
   * The file input is cleared on every pick so the same file can be re-selected
   * after a failure — which also wipes the browser's own "file chosen" label, so
   * without this the form looks untouched after a successful pick. Revoked on
   * every change and on unmount rather than left to the page lifetime.
   */
  useEffect(() => {
    if (!coverImage) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverImage)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverImage])

  /**
   * Preview an image gift.
   *
   * Only images get one — a PDF or .docx has no thumbnail to show here, and the
   * filename the input keeps is confirmation enough for those.
   */
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  /** Clear the picker back to "nothing chosen, nothing searched". */
  const resetListingPicker = useCallback(() => {
    setSelectedListing(null)
    setListingQuery("")
    setListingFilter("all")
    setListingResults([])
  }, [])

  const closeForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setFile(null)
    setCoverImage(null)
    setRemoveCover(false)
    setAllowDownload(false)
    setMode("file")
    setEditing(null)
    setShowForm(false)
    resetListingPicker()
  }, [resetListingPicker])

  /**
   * Debounced listing search.
   *
   * Runs only while the picker is on screen, so the file and link modes cost
   * nothing. An empty query is a valid search — it returns the newest listings
   * of each type, which is what an admin giving away something they just
   * published is looking for.
   */
  useEffect(() => {
    if (!showForm || mode !== "listing") return
    let cancelled = false
    setListingSearching(true)
    const timer = setTimeout(() => {
      void searchGiftListings(listingQuery.trim(), listingFilter).then((results) => {
        if (cancelled) return
        setListingResults(results)
        setListingSearching(false)
      })
    }, LISTING_SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [showForm, mode, listingQuery, listingFilter])

  /**
   * Pick a listing, and borrow its words for any field still blank.
   *
   * Prefilling here rather than leaving the backend to fall back puts what
   * members will actually see in front of the admin before they publish, and
   * still lets them reword the popup afterwards.
   */
  const chooseListing = useCallback((listing: GiftListingRef) => {
    setSelectedListing(listing)
    setForm((f) => ({
      ...f,
      title: f.title.trim() || (listing.title ?? "").slice(0, 200),
      description: f.description.trim() || (listing.description ?? "").slice(0, 2000),
    }))
  }, [])

  /** Open the form prefilled with an existing gift. */
  const startEdit = useCallback((gift: Gift) => {
    setEditing(gift)
    setForm({
      title: gift.title,
      description: gift.description,
      category: gift.category || "guide",
      tags: gift.tags.join(", "),
      linkUrl: gift.linkUrl ?? "",
    })
    setMode(gift.giftType)
    setFile(null)
    setCoverImage(null)
    setRemoveCover(false)
    setAllowDownload(gift.allowDownload)
    // Start the picker on whatever this gift already points at, so opening the
    // form and saving changes nothing.
    setSelectedListing(gift.listing)
    setListingQuery("")
    setListingFilter("all")
    setListingResults([])
    setShowForm(true)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const startCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setCoverImage(null)
    setRemoveCover(false)
    setAllowDownload(false)
    setMode("file")
    resetListingPicker()
    setShowForm(true)
  }, [resetListingPicker])

  /**
   * What's wrong with the draft, or null when it's ready.
   *
   * The file and link rules differ between create and edit: on an edit the gift
   * already has content, so leaving both blank means "keep what's there".
   */
  const validationError = (): string | null => {
    if (!form.title.trim()) return "Give the gift a title."
    if (!form.description.trim()) return "Add a description — it shows in the popup."

    if (mode === "link") {
      const url = form.linkUrl.trim()
      // A link gift always needs a URL; switching a file gift to a link needs one too.
      if (!/^https?:\/\//i.test(url)) return "The link must start with http:// or https://"
      return null
    }

    if (mode === "listing") {
      if (!selectedListing) return "Search for the listing you want to give away, then pick it."
      return null
    }

    // File mode. A new gift must carry a file; an edit may keep its existing one,
    // but a gift being converted from a link or a listing has nothing to fall
    // back on — without this the form submits a change the API reads as "leave
    // the delivery alone", and the gift silently stays what it was.
    if (!file) {
      if (!editing) return "Choose the file to give away."
      if (editing.giftType === "link") return "Upload a file, or switch back to External link."
      if (editing.giftType === "listing") return "Upload a file, or switch back to Existing listing."
    }
    return null
  }

  const handleSubmit = () => {
    const error = validationError()
    if (error) {
      toast.error(error)
      return
    }
    // Creating notifies everybody, so it confirms. Editing is silent — no gate.
    if (editing) void save()
    else setConfirmPublish(true)
  }

  const save = async () => {
    setConfirmPublish(false)
    setSubmitting(true)

    // Exactly one delivery reaches the API; the other two are left out
    // entirely, which is what the backend reads as "leave that alone".
    //
    // A listing that has not changed is deliberately not re-sent: the backend
    // re-reads whatever it is given from the live collection, which fails once
    // that listing has closed — and an admin fixing a typo on an old listing
    // gift should not be blocked by the listing having since expired.
    const listingChanged =
      mode === "listing" &&
      selectedListing !== null &&
      (editing?.giftType !== "listing" ||
        editing.listing?.id !== selectedListing.id ||
        editing.listing?.type !== selectedListing.type)

    const delivery =
      mode === "link"
        ? { linkUrl: form.linkUrl.trim() }
        : mode === "file"
          ? { file }
          : listingChanged && selectedListing
            ? { listingType: selectedListing.type, listingId: selectedListing.id }
            : {}

    // Shared between create and edit. In file mode `file` may be null on an
    // edit, which the API reads as "keep the existing document".
    const draft = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...delivery,
      // Only an uploaded file is ours to hand over, so the flag is always sent
      // as false in the other modes rather than left at whatever the switch
      // happened to be showing before the mode changed.
      allowDownload: mode === "file" && allowDownload,
      coverImage,
    }

    try {
      if (editing) {
        await updateGift(editing._id, { ...draft, removeCoverImage: removeCover })
        toast.success("Gift updated — members were not re-notified")
      } else {
        await createGift(draft)
        toast.success("Gift published — every member will be notified")
      }
      closeForm()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that gift")
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Toggling a gift off hides it everywhere and stops it being announced; it
   * does not re-announce when switched back on, because members who already
   * acknowledged a newer gift have moved past it.
   */
  const toggleActive = async (gift: Gift) => {
    const next = !gift.isActive
    setGifts((prev) => prev.map((g) => (g._id === gift._id ? { ...g, isActive: next } : g)))
    try {
      await updateGift(gift._id, { isActive: next })
    } catch (error) {
      setGifts((prev) => prev.map((g) => (g._id === gift._id ? { ...g, isActive: !next } : g)))
      toast.error(error instanceof Error ? error.message : "Couldn't update that gift")
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    try {
      await deleteGift(target._id)
      setGifts((prev) => prev.filter((g) => g._id !== target._id))
      if (editing?._id === target._id) closeForm()
      toast.success("Gift deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that gift")
    }
  }

  const isEdit = editing !== null

  return (
    <AdminShell
      title="Gifts"
      description="Free resources handed to every member. Publishing one notifies everybody; editing one does not."
      width="wide"
      onRefresh={load}
      refreshing={loading}
      actions={
        <Button
          type="button"
          onClick={() => (showForm ? closeForm() : startCreate())}
          className="rounded-xl"
        >
          {showForm ? (
            <RiCloseLine className="mr-1.5 h-4 w-4" aria-hidden />
          ) : (
            <RiAddLine className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          {showForm ? "Close" : "Add gift"}
        </Button>
      }
    >
      {showForm && (
        <AdminCard className="mb-6 p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            {isEdit ? `Edit "${editing.title}"` : "New gift"}
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">
            {isEdit
              ? "Changes go live immediately. Nobody is notified again — the announcement already went out when this gift was published."
              : "Every member gets a popup with the title, description, and cover art below."}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="gift-title">Title *</Label>
              <Input
                id="gift-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="CV Templates Pack 2026"
                className="mt-1.5"
                maxLength={200}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="gift-description">Description *</Label>
              <Textarea
                id="gift-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="A 40-page starter kit with templates for every career stage."
                className="mt-1.5 min-h-24"
                maxLength={2000}
              />
            </div>

            <div>
              <Label htmlFor="gift-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((f) => ({ ...f, category: value }))}
              >
                <SelectTrigger id="gift-category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GIFT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gift-tags">Tags</Label>
              <Input
                id="gift-tags"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="cv, templates, careers"
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Comma separated, up to 10.</p>
            </div>

            {/* Delivery: an upload that renders in-app, an external link, or
                something this platform already carries. */}
            <div className="sm:col-span-2">
              <Label>How is it delivered?</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mode === "file" ? "default" : "outline"}
                  onClick={() => setMode("file")}
                  className="rounded-xl"
                  size="sm"
                >
                  Uploaded file
                </Button>
                <Button
                  type="button"
                  variant={mode === "link" ? "default" : "outline"}
                  onClick={() => setMode("link")}
                  className="rounded-xl"
                  size="sm"
                >
                  External link
                </Button>
                <Button
                  type="button"
                  variant={mode === "listing" ? "default" : "outline"}
                  onClick={() => setMode("listing")}
                  className="rounded-xl"
                  size="sm"
                >
                  Existing listing
                </Button>
              </div>
              {isEdit && mode !== editing.giftType && (
                <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                  {editing.giftType === "file"
                    ? "Switching away from a file deletes the uploaded file permanently."
                    : mode === "file"
                      ? "Switching to a file replaces what this gift currently points at."
                      : mode === "link"
                        ? "Switching to a link replaces what this gift currently points at."
                        : "Switching to a listing replaces what this gift currently points at."}
                </p>
              )}
            </div>

            {mode === "file" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="gift-file">
                  File {isEdit && editing.giftType === "file" ? "" : "*"}
                </Label>
                {isEdit && editing.giftType === "file" && (
                  <p className="mb-1.5 mt-1 text-[11px] text-muted-foreground">
                    Currently: <span className="font-medium text-foreground">{currentFileLabel(editing)}</span>.
                    Leave blank to keep it.
                  </p>
                )}
                <Input
                  id="gift-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,image/jpeg,image/png,image/gif,image/webp,image/avif"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null
                    setFile(picked)
                    if (picked) {
                      toast.success(`File ready — ${picked.name} (${formatBytes(picked.size)})`)
                    }
                  }}
                  className="mt-1.5"
                />
                {/* An image gift is worth seeing before it goes out to everyone. */}
                {filePreview && file && (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                    <img
                      src={filePreview}
                      alt="Selected gift image"
                      className="h-14 w-14 flex-shrink-0 rounded-lg border border-border/60 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <RiCheckLine className="h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
                        {isEdit && editing.giftType === "file" ? "New file ready" : "File ready"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {file.name} · {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                )}

                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF, Word (.doc/.docx), PowerPoint, or an image. Up to 25MB. PDFs, images and
                  .docx render in the app as-is; .doc, .ppt and .pptx are converted to a PDF
                  first, which needs LibreOffice on the server.
                </p>

                {/* Reading happens in the app either way; this only decides
                    whether members can also keep the file. */}
                <label className="mt-3 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                  <Switch
                    checked={allowDownload}
                    onCheckedChange={(checked) => setAllowDownload(checked === true)}
                    aria-label="Allow members to download this gift"
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <RiDownload2Line className="h-3.5 w-3.5" aria-hidden />
                      Let members download it
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {allowDownload
                        ? "Members get a Download button and keep the original file — the Word document as you uploaded it, not the converted PDF."
                        : "Off: members read this gift in the app only. There is no download button and no file URL to pass around."}
                    </span>
                  </span>
                </label>
              </div>
            ) : mode === "link" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="gift-link">Link *</Label>
                <Input
                  id="gift-link"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="https://example.com/the-gift"
                  className="mt-1.5"
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <Label htmlFor="gift-listing-search">Listing *</Label>
                <p className="mb-1.5 mt-1 text-[11px] text-muted-foreground">
                  Only live listings can be given away. Search by title, or paste a listing
                  link. Picking one fills in any blank title and description above.
                </p>

                {selectedListing && (
                  <div className="mb-3 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                    <RiCheckLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {selectedListing.title ?? "Untitled listing"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {listingSummary(selectedListing)}
                      </p>
                      {!selectedListing.isLive && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-500">
                          This listing has closed since the gift was published. Members still see
                          it, without a link. Pick another to replace it.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedListing(null)}
                      className="h-7 rounded-lg px-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <RiSearchLine
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="gift-listing-search"
                    value={listingQuery}
                    onChange={(e) => setListingQuery(e.target.value)}
                    placeholder="Search live listings, or paste a listing link"
                    className="pl-9"
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LISTING_FILTERS.map((filter) => (
                    <Button
                      key={filter.value}
                      type="button"
                      variant={listingFilter === filter.value ? "default" : "outline"}
                      onClick={() => setListingFilter(filter.value)}
                      className="h-7 rounded-lg px-2.5 text-xs"
                      size="sm"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border/70">
                  {listingSearching ? (
                    <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <RiLoader4Line className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Searching...
                    </p>
                  ) : listingResults.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      {listingQuery.trim()
                        ? "Nothing live matches that. An expired listing cannot be gifted."
                        : "No live listings to give away yet."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {listingResults.map((listing) => {
                        const Icon = GIFT_LISTING_ICONS[listing.type]
                        const picked = selectedListing?.id === listing.id
                        return (
                          <li key={`${listing.type}:${listing.id}`}>
                            <button
                              type="button"
                              onClick={() => chooseListing(listing)}
                              className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                                picked ? "bg-primary/5" : ""
                              }`}
                            >
                              <Icon
                                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-foreground">
                                  {listing.title ?? "Untitled listing"}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {listingSummary(listing)}
                                </span>
                              </span>
                              {picked && (
                                <RiCheckLine
                                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                                  aria-hidden
                                />
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <Label htmlFor="gift-cover">Cover image</Label>
              {isEdit && editing.image && (
                <div className="mb-2 mt-1.5 flex items-center gap-3">
                  <img
                    src={editing.image}
                    alt="Current cover"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={removeCover}
                      onCheckedChange={(checked) => {
                        const next = checked === true
                        setRemoveCover(next)
                        // Removing and replacing are mutually exclusive.
                        if (next) setCoverImage(null)
                      }}
                    />
                    Remove current cover
                  </label>
                </div>
              )}
              <Input
                id="gift-cover"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                disabled={removeCover || compressingCover}
                onChange={async (e) => {
                  const picked = e.target.files?.[0] ?? null
                  // Let the same file be re-picked after a failure. This also
                  // clears the browser's own filename label, so the toast and
                  // the preview below are the only confirmation there is — both
                  // fire on every successful pick, never just the compressed one.
                  e.target.value = ""
                  if (!picked) {
                    setCoverImage(null)
                    return
                  }

                  if (picked.size <= MAX_COVER_BYTES) {
                    setCoverImage(picked)
                    toast.success(`Cover image ready — ${picked.name} (${formatBytes(picked.size)})`)
                    return
                  }

                  setCompressingCover(true)
                  const result = await compressImage(picked)
                  setCompressingCover(false)

                  if (!result.ok) {
                    toast.error(
                      result.animated
                        ? `That GIF is ${formatBytes(picked.size)}. Animated GIFs can't be compressed without losing the animation — please use one under 10MB.`
                        : `Image too large. This one is ${formatBytes(picked.size)} and can't be compressed below 10MB without ruining it — please use one under 10MB.`,
                    )
                    return
                  }

                  setCoverImage(result.file)
                  toast.success(
                    result.compressedFrom
                      ? `Cover image ready — compressed from ${formatBytes(result.compressedFrom)} to ${formatBytes(result.file.size)}.`
                      : `Cover image ready — ${result.file.name} (${formatBytes(result.file.size)})`,
                  )
                }}
                className="mt-1.5"
              />
              {/* What was actually picked. Nothing else on the form changes
                  when a cover lands, so this is the confirmation. */}
              {coverPreview && coverImage && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                  <img
                    src={coverPreview}
                    alt="Selected cover"
                    className="h-14 w-14 flex-shrink-0 rounded-lg border border-border/60 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <RiCheckLine className="h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
                      {isEdit && editing.image ? "New cover ready" : "Cover ready"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {coverImage.name} · {formatBytes(coverImage.size)}
                    </p>
                    {isEdit && editing.image && (
                      <p className="text-[11px] text-muted-foreground">
                        Replaces the current cover when you save.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverImage(null)}
                    className="h-7 rounded-lg px-2 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <p className="mt-1 text-[11px] text-muted-foreground">
                {compressingCover
                  ? "Compressing image…"
                  : isEdit
                    ? "Optional. Leave blank to keep the current one. Over 10MB is compressed for you."
                    : mode === "listing"
                      ? "Optional. Without one the listing's own artwork is used. Over 10MB is compressed for you."
                      : "Optional. Shown in the popup and on the gift card; a gift mark is used without one. Over 10MB is compressed for you."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || compressingCover}
              className="rounded-xl"
            >
              {submitting ? (
                <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : isEdit ? (
                <RiSaveLine className="mr-1.5 h-4 w-4" aria-hidden />
              ) : (
                <RiUploadCloud2Line className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {isEdit ? "Save changes" : "Publish and notify everyone"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
              disabled={submitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </AdminCard>
      )}

      {loading ? (
        <AdminSkeletonRows rows={4} />
      ) : gifts.length === 0 ? (
        <AdminEmpty
          icon={RiGiftLine}
          title="No gifts yet"
          description="Publish one and every member gets a popup announcing it."
          action={
            <Button type="button" onClick={startCreate} className="rounded-xl">
              <RiAddLine className="mr-1.5 h-4 w-4" aria-hidden />
              Add gift
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {gifts.map((gift) => (
            <AdminCard
              key={gift._id}
              className={`flex flex-wrap items-center gap-4 p-4 ${
                editing?._id === gift._id ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {gift.image ? (
                  <img src={gift.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <RiGiftLine className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{gift.title}</p>
                <p className="truncate text-xs text-muted-foreground">{gift.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="capitalize">{gift.category}</span>
                  {gift.listing ? (
                    <span className="inline-flex items-center gap-1">
                      {GIFT_LISTING_LABELS[gift.listing.type]}
                      {!gift.listing.isLive && (
                        <span className="text-amber-600 dark:text-amber-500">· closed</span>
                      )}
                    </span>
                  ) : (
                    <span>
                      {gift.giftType === "link" ? "Link" : (gift.fileType ?? "file").toUpperCase()}
                    </span>
                  )}
                  {formatGiftSize(gift.fileSize) && <span>{formatGiftSize(gift.fileSize)}</span>}
                  {gift.giftType === "file" && (
                    <span
                      className={`inline-flex items-center gap-1 ${
                        gift.allowDownload ? "text-primary" : ""
                      }`}
                      title={
                        gift.allowDownload
                          ? "Members can download this gift"
                          : "Members can only read this gift in the app"
                      }
                    >
                      {gift.allowDownload ? (
                        <>
                          <RiDownload2Line className="h-3.5 w-3.5" aria-hidden />
                          Downloadable
                          {gift.metrics.downloadCount > 0 && (
                            <span className="tabular-nums opacity-70">{gift.metrics.downloadCount}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <RiEyeOffLine className="h-3.5 w-3.5" aria-hidden />
                          Read-only
                        </>
                      )}
                    </span>
                  )}
                  <span>{new Date(gift.createdAt).toLocaleDateString()}</span>
                  {gift.updatedAt !== gift.createdAt && (
                    <span>edited {new Date(gift.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1" title="Members who opened it">
                  <RiEyeLine className="h-3.5 w-3.5" aria-hidden />
                  {gift.metrics.openCount}
                </span>
                <span className="inline-flex items-center gap-1" title="Likes">
                  <RiHeartLine className="h-3.5 w-3.5" aria-hidden />
                  {gift.metrics.likeCount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={gift.isActive} onCheckedChange={() => toggleActive(gift)} />
                  {gift.isActive ? "Live" : "Hidden"}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${gift.title}`}
                  onClick={() => startEdit(gift)}
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <RiEditLine className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${gift.title}`}
                  onClick={() => setPendingDelete(gift)}
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notify every member?</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing &ldquo;{form.title.trim() || "this gift"}&rdquo; shows a popup to every
              signed-in member the next time they open the app. This cannot be un-sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this gift?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; and its uploaded files are removed permanently,
              along with everyone&apos;s like and save state for it. To take it out of circulation
              without losing it, switch it to Hidden instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  )
}
