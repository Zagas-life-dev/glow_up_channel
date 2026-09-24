"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PlaylistCover } from "@/components/playlists/playlist-cover"
import { IMAGE_TARGETS, prepareErrorMessage, prepareImageUpload } from "@/lib/images/compress-image"
import {
  RiCloseLine,
  RiGlobalLine,
  RiImageAddLine,
  RiLoader4Line,
  RiLockLine,
  RiDeleteBinLine,
} from "react-icons/ri"

interface PlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  editPlaylist?: Playlist
  onSuccess?: (playlist: Playlist) => void
}

/** The backend's limits (Playlist.validate), enforced here so they are never a server error. */
const NAME_MAX = 50
const DESCRIPTION_MAX = 200
const HASHTAG_MAX = 10
const COVER_TYPES = "image/jpeg,image/png,image/webp,image/avif,image/gif"

function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object" || !("status" in err)) return undefined
  const s = (err as { status: unknown }).status
  return typeof s === "number" ? s : undefined
}

function formatPlaylistSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const status = getErrorStatus(err)

  if (status === 403) {
    return `${msg} You may not have permission for this action.`
  }
  if (status === 502 || /cannot reach backend/i.test(msg)) {
    return "We couldn't reach the server. Check your connection and try again."
  }
  return msg
}

/** Normalise a typed tag: no `#`, no spaces, lower-case. */
function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase().slice(0, 30)
}

/**
 * Create or edit a playlist.
 *
 * The cover sits first because it is the first thing anyone sees of a playlist —
 * in Discover, on the page, in a share. It is optional: without one the list keeps
 * its generated art, which the preview shows live so the creator knows what they
 * get either way.
 *
 * A new cover is uploaded *after* the playlist is saved, against its id. The
 * server only accepts covers from someone who can edit the list and only stores
 * URLs it hosted itself, and an abandoned form never leaves an orphan image. If
 * the upload fails the playlist still exists; the creator is told and can add the
 * cover from Edit.
 */
export default function PlaylistModal({ isOpen, onClose, editPlaylist, onSuccess }: PlaylistModalProps) {
  const { createPlaylist, updatePlaylist, uploadPlaylistCover, removePlaylistCover } = usePlaylist()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<"idle" | "saving" | "uploading">("idle")
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset the form whenever it opens, or the playlist being edited changes.
  useEffect(() => {
    if (!isOpen) return
    setName(editPlaylist?.name ?? "")
    setDescription(editPlaylist?.description ?? "")
    setHashtags(editPlaylist?.hashtags ?? [])
    setIsPublic(editPlaylist?.isPublic ?? false)
    setTagDraft("")
    setCoverFile(null)
    setCoverPreview(null)
    setCoverRemoved(false)
    setError("")
    setPhase("idle")
  }, [isOpen, editPlaylist])

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    if (!coverPreview) return
    return () => URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  const existingCover = editPlaylist?.coverImage && !coverRemoved ? editPlaylist.coverImage : null
  const shownCover = coverPreview ?? existingCover
  const previewSeed = useMemo(() => editPlaylist?._id ?? (name.trim() || "new-playlist"), [editPlaylist?._id, name])
  const isSubmitting = phase !== "idle"

  const pickCover = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file — JPEG, PNG, WebP or GIF.")
      return
    }
    setError("")
    setCoverBusy(true)
    try {
      // Brought to the 1200px square the server keeps, so a phone photo uploads
      // in a fraction of the time instead of shipping megabytes it would discard.
      const outcome = await prepareImageUpload(file, IMAGE_TARGETS.playlistCover)
      if (!outcome.ok) {
        setError(prepareErrorMessage(outcome, file, IMAGE_TARGETS.playlistCover))
        return
      }
      setCoverFile(outcome.file)
      setCoverPreview(URL.createObjectURL(outcome.file))
      setCoverRemoved(false)
    } catch {
      setError("That image couldn't be read. Try a different file.")
    } finally {
      setCoverBusy(false)
    }
  }

  const clearCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (editPlaylist?.coverImage) setCoverRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const addTag = (raw: string) => {
    const tag = cleanTag(raw)
    if (!tag || hashtags.includes(tag) || hashtags.length >= HASHTAG_MAX) return
    setHashtags((prev) => [...prev, tag])
  }

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault()
      addTag(tagDraft)
      setTagDraft("")
    } else if (e.key === "Backspace" && !tagDraft && hashtags.length) {
      setHashtags((prev) => prev.slice(0, -1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Give your playlist a name.")
      return
    }
    // A tag still sitting in the input counts — people rarely press Enter on the last one.
    const tags = tagDraft.trim() && hashtags.length < HASHTAG_MAX
      ? Array.from(new Set([...hashtags, cleanTag(tagDraft)].filter(Boolean)))
      : hashtags

    setError("")
    setPhase("saving")
    try {
      const details = { name: name.trim(), description: description.trim(), hashtags: tags, isPublic }
      let saved = editPlaylist
        ? await updatePlaylist(editPlaylist._id, details)
        : await createPlaylist(details)

      if (coverFile || coverRemoved) {
        setPhase("uploading")
        try {
          if (coverFile) {
            const coverImage = await uploadPlaylistCover(saved._id, coverFile)
            saved = { ...saved, coverImage }
          } else {
            await removePlaylistCover(saved._id)
            saved = { ...saved, coverImage: null }
          }
        } catch (coverErr) {
          // The playlist itself is saved; don't lose that over the image.
          toast.error(
            editPlaylist
              ? "Details saved, but the cover didn't update. Try again from Edit."
              : "Playlist created, but the cover didn't upload. You can add it from Edit.",
          )
          console.error("Cover update failed:", coverErr)
        }
      }

      toast.success(editPlaylist ? "Playlist updated" : "Playlist created")
      onSuccess?.(saved)
      onClose()
    } catch (err: unknown) {
      setError(formatPlaylistSaveError(err) || "Failed to save playlist")
    } finally {
      setPhase("idle")
    }
  }

  const submitLabel =
    phase === "saving"
      ? editPlaylist ? "Saving…" : "Creating…"
      : phase === "uploading"
        ? "Uploading cover…"
        : editPlaylist ? "Save changes" : "Create playlist"

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-t-3xl border-border/70 bg-card p-0 [&>button]:hidden"
      >
        {/* Header */}
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6">
          <div className="min-w-0">
            <SheetTitle className="text-lg font-semibold tracking-tight text-foreground">
              {editPlaylist ? "Edit playlist" : "New playlist"}
            </SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground">
              {editPlaylist ? "Update the details people see." : "Group listings you want to keep together."}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-lg space-y-6 px-5 pb-6 pt-2 sm:px-6">
              {/* Cover */}
              <section className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    void pickCover(e.dataTransfer.files?.[0])
                  }}
                  disabled={isSubmitting || coverBusy}
                  aria-label={shownCover ? "Change cover image" : "Upload cover image"}
                  className={cn(
                    "group relative h-28 w-28 shrink-0 rounded-2xl outline-none ring-offset-2 ring-offset-card transition focus-visible:ring-2 focus-visible:ring-primary sm:h-32 sm:w-32",
                    isDragging && "ring-2 ring-primary",
                  )}
                >
                  <PlaylistCover seed={previewSeed} imageUrl={shownCover} className="h-full w-full shadow-md shadow-black/10" />
                  <span
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/45 text-xs font-medium text-white transition-opacity",
                      coverBusy || isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                  >
                    {coverBusy ? (
                      <RiLoader4Line className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <RiImageAddLine className="h-5 w-5" />
                        {isDragging ? "Drop image" : shownCover ? "Change" : "Add cover"}
                      </>
                    )}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Cover image</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    {shownCover
                      ? "Shown in Discover and when people share it."
                      : "Optional. Without one, your playlist gets its own generated art."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting || coverBusy}
                      className="h-9 rounded-xl"
                    >
                      <RiImageAddLine className="mr-1.5 h-4 w-4" />
                      {shownCover ? "Change" : "Upload"}
                    </Button>
                    {shownCover ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearCover}
                        disabled={isSubmitting || coverBusy}
                        className="h-9 rounded-xl text-muted-foreground hover:text-destructive"
                      >
                        <RiDeleteBinLine className="mr-1.5 h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={COVER_TYPES}
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => void pickCover(e.target.files?.[0])}
                />
              </section>

              {/* Name */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <Label htmlFor="playlist-name" className="text-sm font-medium text-foreground">
                    Name
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {name.length}/{NAME_MAX}
                  </span>
                </div>
                <Input
                  id="playlist-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                  placeholder="e.g. Tech internships for summer"
                  maxLength={NAME_MAX}
                  autoFocus={!editPlaylist}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <Label htmlFor="playlist-description" className="text-sm font-medium text-foreground">
                    Description <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
                <Textarea
                  id="playlist-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                  placeholder="What's this playlist for?"
                  maxLength={DESCRIPTION_MAX}
                  rows={3}
                  className="resize-none rounded-xl"
                />
              </div>

              {/* Hashtags — chips live inside the field, like a tag input people already know. */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <Label htmlFor="playlist-tags" className="text-sm font-medium text-foreground">
                    Hashtags <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {hashtags.length}/{HASHTAG_MAX}
                  </span>
                </div>
                <div
                  className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                  onClick={() => document.getElementById("playlist-tags")?.focus()}
                >
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-[13px] font-medium text-foreground"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setHashtags((prev) => prev.filter((t) => t !== tag))}
                        aria-label={`Remove #${tag}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                      >
                        <RiCloseLine className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="playlist-tags"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={handleTagKey}
                    onBlur={() => {
                      addTag(tagDraft)
                      setTagDraft("")
                    }}
                    disabled={hashtags.length >= HASHTAG_MAX}
                    placeholder={hashtags.length ? "" : "scholarships, remote…"}
                    className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Press Enter or comma after each one. They help people find it in Discover.</p>
              </div>

              {/* Visibility — two real choices, so two options rather than a switch. */}
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-foreground">Who can see it</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: true, icon: RiGlobalLine, title: "Public", body: "Anyone, and it can appear in Discover" },
                    { value: false, icon: RiLockLine, title: "Private", body: "Only you and people you invite" },
                  ] as const).map((option) => {
                    const selected = isPublic === option.value
                    const Icon = option.icon
                    return (
                      <button
                        key={option.title}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setIsPublic(option.value)}
                        className={cn(
                          "rounded-2xl border p-3 text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                          {option.title}
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.body}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {error ? (
                <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {/* Actions stay reachable above the keyboard however long the form gets. */}
          <div className="border-t border-border/60 bg-card pb-safe">
            <div className="mx-auto flex w-full max-w-lg gap-2 px-5 py-3 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-2xl sm:flex-none sm:px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || coverBusy || !name.trim()}
                className="h-11 flex-[2] rounded-2xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:flex-1"
              >
                {isSubmitting ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
