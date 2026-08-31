"use client"

/**
 * Attach a listing to a provider account.
 *
 * Most listings were scraped or entered by an admin, so nobody owns them and no
 * provider dashboard shows them. This dialog points one at a provider, which is
 * what makes it appear in that provider's content list and analytics.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  attachListingToProvider,
  detachListingFromProvider,
  fetchAttachableProviders,
  type AttachableProvider,
} from "@/lib/analytics/provider-attachment"
import type { ListingContentType } from "@/lib/analytics/listing-analytics"
import { RiCheckLine, RiLoader4Line, RiSearchLine, RiLinkUnlinkM } from "react-icons/ri"

export interface AttachTargetListing {
  _id: string
  title: string
  type: ListingContentType
  /** Set when the listing already belongs to a provider. */
  providerId?: string | null
  /** The organisation name currently shown on the listing. */
  providerName?: string | null
}

export function AttachProviderDialog({
  open,
  onOpenChange,
  listing,
  onAttached,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: AttachTargetListing | null
  /** Called after a successful attach or detach so the caller can refresh. */
  onAttached?: () => void
}) {
  const [providers, setProviders] = useState<AttachableProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadProviders = useCallback(async () => {
    setLoading(true)
    try {
      setProviders(await fetchAttachableProviders())
    } catch (error: any) {
      toast.error(error?.message || "Could not load providers")
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    loadProviders()
    setSearch("")
    setSubmitting(false)
    setSelectedId(listing?.providerId ?? null)
    // The listing's current name is the default, so attaching does not silently
    // rewrite what the public sees — an admin has to type over it to change it.
    setDisplayName(listing?.providerName ?? "")
  }, [open, listing, loadProviders])

  // Filtering locally keeps typing responsive; the list is capped server-side.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return providers
    return providers.filter(
      (provider) =>
        provider.displayName.toLowerCase().includes(needle) ||
        (provider.email || "").toLowerCase().includes(needle),
    )
  }, [providers, search])

  const selected = providers.find((provider) => provider._id === selectedId) || null

  const handleAttach = async () => {
    if (!listing || !selectedId) return
    setSubmitting(true)
    try {
      await attachListingToProvider(listing.type, listing._id, selectedId, displayName.trim() || undefined)
      toast.success(`"${listing.title}" is now in ${selected?.displayName ?? "the provider"}'s dashboard`)
      onOpenChange(false)
      onAttached?.()
    } catch (error: any) {
      toast.error(error?.message || "Could not attach the listing")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDetach = async () => {
    if (!listing) return
    setSubmitting(true)
    try {
      await detachListingFromProvider(listing.type, listing._id)
      toast.success("Listing detached")
      onOpenChange(false)
      onAttached?.()
    } catch (error: any) {
      toast.error(error?.message || "Could not detach the listing")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle>Attach to a provider</DialogTitle>
          <DialogDescription>
            {listing ? (
              <>
                <span className="font-medium text-foreground">{listing.title}</span> will appear in the chosen
                provider&apos;s dashboard, with its views, saves and application funnel.
              </>
            ) : (
              "Choose a provider."
            )}
          </DialogDescription>
        </DialogHeader>

        {listing?.providerId ? (
          <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Already attached to{" "}
            <span className="font-medium text-foreground">{listing.providerName || "a provider"}</span>. Picking a
            different account moves it.
          </p>
        ) : null}

        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search providers by name or email"
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          {loading ? (
            <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <RiLoader4Line className="h-4 w-4 animate-spin" />
              Loading providers…
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {providers.length === 0
                ? "No accounts can publish content yet. Upgrade an account to Founder Batch first."
                : "No provider matches that search."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((provider) => {
                const isSelected = provider._id === selectedId
                return (
                  <li key={provider._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(provider._id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold uppercase",
                          isSelected
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {provider.displayName.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {provider.displayName}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {provider.email}
                          {provider.onboardingCompleted ? "" : " · onboarding incomplete"}
                        </span>
                      </span>
                      {isSelected ? <RiCheckLine className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <Label htmlFor="attach-display-name" className="text-xs text-muted-foreground">
            Organisation name shown on the listing
          </Label>
          <Input
            id="attach-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={selected?.displayName || "Leave blank to keep the current name"}
            className="mt-1.5 h-10 rounded-xl"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Attaching does not change what the public sees unless you edit this.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {listing?.providerId ? (
            <Button
              variant="outline"
              onClick={handleDetach}
              disabled={submitting}
              className="mr-auto rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <RiLinkUnlinkM className="mr-1.5 h-4 w-4" />
              Detach
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
            Cancel
          </Button>
          <Button
            onClick={handleAttach}
            disabled={submitting || !selectedId || selectedId === listing?.providerId}
            className="rounded-2xl bg-primary hover:bg-primary/90"
          >
            {submitting ? "Attaching…" : "Attach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
