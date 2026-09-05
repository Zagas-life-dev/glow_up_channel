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
  RiGiftLine,
  RiHeartLine,
  RiLoader4Line,
  RiSaveLine,
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
import { createGift, deleteGift, fetchGiftsAdmin, updateGift } from "@/lib/gifts/api"
import { formatGiftSize, GIFT_CATEGORIES, type Gift } from "@/lib/gifts/types"

type DeliveryMode = "file" | "link"

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "guide",
  tags: "",
  linkUrl: "",
}

/** What the gift currently holds, for the "leave blank to keep" hints. */
function currentFileLabel(gift: Gift): string {
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
  /** Off by default: a gift reads in the app unless someone opts it out. */
  const [allowDownload, setAllowDownload] = useState(false)

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

  const closeForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setFile(null)
    setCoverImage(null)
    setRemoveCover(false)
    setAllowDownload(false)
    setMode("file")
    setEditing(null)
    setShowForm(false)
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
    setShowForm(true)
  }, [])

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

    // File mode. A new gift must carry a file; an edit may keep its existing one,
    // but a gift being converted from a link has nothing to fall back on.
    if (!file) {
      if (!editing) return "Choose the file to give away."
      if (editing.giftType === "link") return "Upload a file, or switch back to External link."
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
      ...(mode === "link" ? { linkUrl: form.linkUrl.trim() } : { file }),
      // A link gift has no file of ours to give away, so the flag is always
      // sent as false there rather than left at whatever the switch happened to
      // be showing before the mode changed.
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

            {/* Delivery: an uploaded file that renders in-app, or an external link. */}
            <div className="sm:col-span-2">
              <Label>How is it delivered?</Label>
              <div className="mt-1.5 flex gap-2">
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
              </div>
              {isEdit && mode !== editing.giftType && (
                <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                  {mode === "link"
                    ? "Switching to a link deletes the uploaded file permanently."
                    : "Switching to a file replaces the link."}
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
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1.5"
                />
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
            ) : (
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
                disabled={removeCover}
                onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isEdit
                  ? "Optional. Leave blank to keep the current one."
                  : "Optional. Shown in the popup and on the gift card; a gift mark is used without one."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-xl">
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
                  <span>{gift.giftType === "link" ? "Link" : (gift.fileType ?? "file").toUpperCase()}</span>
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
