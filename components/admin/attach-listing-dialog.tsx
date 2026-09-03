"use client"

/**
 * Point a listing at the accounts that should see it.
 *
 * Two different things live here, deliberately kept apart:
 *
 *  - **Provider** is ownership. Most listings were scraped or entered by an
 *    admin, so nobody owns them and no provider dashboard shows them. Attaching
 *    writes the provider's id into the listing's own ownership field, which is
 *    what makes it appear in their content list and analytics. One listing has
 *    exactly one provider, so this is a single choice and picking a different
 *    account moves the listing.
 *
 *  - **Monitors** is oversight. Assigning records a row beside the listing and
 *    changes nothing about the listing itself. Any number of monitors can watch
 *    one listing, and they never become its owner.
 *
 * They are separate tabs rather than one combined list because a monitor must
 * never end up in the provider field: that field means "the organisation this
 * belongs to", it is what the public sees on the listing, and a monitor cannot
 * publish at all. One list of accounts would make that mistake a mis-click away.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  attachListingToProvider,
  detachListingFromProvider,
  fetchAttachableProviders,
  type AttachableProvider,
} from "@/lib/analytics/provider-attachment"
import {
  assignListings,
  fetchListingMonitors,
  fetchMonitors,
  unassignListing,
  type MonitorAccount,
} from "@/lib/analytics/monitor"
import { ROLES, roleLabel } from "@/lib/roles"
import type { ListingContentType } from "@/lib/analytics/listing-analytics"
import {
  RiCheckLine,
  RiEyeLine,
  RiLoader4Line,
  RiSearchLine,
  RiLinkUnlinkM,
} from "react-icons/ri"

export interface AttachTargetListing {
  _id: string
  title: string
  type: ListingContentType
  /** Set when the listing already belongs to a provider. */
  providerId?: string | null
  /** The organisation name currently shown on the listing. */
  providerName?: string | null
}

export function AttachListingDialog({
  open,
  onOpenChange,
  listing,
  onAttached,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: AttachTargetListing | null
  /** Called after a successful attach, detach or monitor change. */
  onAttached?: () => void
}) {
  const [tab, setTab] = useState<"provider" | "monitors">("provider")
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Provider (ownership)
  const [providers, setProviders] = useState<AttachableProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")

  // Monitors (oversight)
  const [monitors, setMonitors] = useState<MonitorAccount[]>([])
  const [loadingMonitors, setLoadingMonitors] = useState(false)
  const [watching, setWatching] = useState<Set<string>>(new Set())
  // What each account watched when the dialog opened, so the per-row total can
  // be adjusted for changes made here rather than going stale against them.
  const [baseWatching, setBaseWatching] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadProviders = useCallback(async () => {
    setLoadingProviders(true)
    try {
      setProviders(await fetchAttachableProviders())
    } catch (error: any) {
      toast.error(error?.message || "Could not load providers")
      setProviders([])
    } finally {
      setLoadingProviders(false)
    }
  }, [])

  /** Every assignable account, plus which of them already watch this listing. */
  const loadMonitors = useCallback(async () => {
    if (!listing) return
    setLoadingMonitors(true)
    try {
      const [all, current] = await Promise.all([
        fetchMonitors({ limit: 200 }),
        fetchListingMonitors(listing.type, listing._id),
      ])
      const currentIds = new Set(current.monitors.map((monitor) => monitor._id))
      setMonitors(all.monitors)
      setWatching(currentIds)
      setBaseWatching(currentIds)
    } catch (error: any) {
      toast.error(error?.message || "Could not load monitors")
      setMonitors([])
      setWatching(new Set())
      setBaseWatching(new Set())
    } finally {
      setLoadingMonitors(false)
    }
  }, [listing])

  useEffect(() => {
    if (!open) return
    setTab("provider")
    setSearch("")
    setSubmitting(false)
    setSelectedId(listing?.providerId ?? null)
    // The listing's current name is the default, so attaching does not silently
    // rewrite what the public sees — an admin has to type over it to change it.
    setDisplayName(listing?.providerName ?? "")
    loadProviders()
    loadMonitors()
  }, [open, listing, loadProviders, loadMonitors])

  // Filtering locally keeps typing responsive; both lists are capped server-side.
  const filteredProviders = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return providers
    return providers.filter(
      (provider) =>
        provider.displayName.toLowerCase().includes(needle) ||
        (provider.email || "").toLowerCase().includes(needle),
    )
  }, [providers, search])

  const filteredMonitors = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return monitors
    return monitors.filter(
      (monitor) =>
        monitor.displayName.toLowerCase().includes(needle) ||
        (monitor.email || "").toLowerCase().includes(needle),
    )
  }, [monitors, search])

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

  /**
   * Monitor changes apply immediately rather than on a save button.
   *
   * Assignment is additive and reversible — there is no draft state worth
   * holding, and batching it behind a save would only invite closing the dialog
   * on unsaved rows.
   */
  const toggleMonitor = async (monitor: MonitorAccount) => {
    if (!listing) return
    const isWatching = watching.has(monitor._id)
    setTogglingId(monitor._id)
    try {
      if (isWatching) {
        await unassignListing(monitor._id, listing.type, listing._id)
        setWatching((prev) => {
          const next = new Set(prev)
          next.delete(monitor._id)
          return next
        })
        toast.success(`${monitor.displayName} no longer watches this`)
      } else {
        await assignListings(monitor._id, [{ contentType: listing.type, contentId: listing._id }])
        setWatching((prev) => new Set(prev).add(monitor._id))
        toast.success(`${monitor.displayName} now watches this listing`)
      }
      onAttached?.()
    } catch (error: any) {
      toast.error(error?.message || "Could not update the monitor")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle>Attach listing</DialogTitle>
          <DialogDescription>
            {listing ? (
              <>
                Who should see <span className="font-medium text-foreground">{listing.title}</span> and its
                views, saves and application funnel.
              </>
            ) : (
              "Choose an account."
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="monitors">
              Monitors
              {watching.size > 0 ? (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] tabular-nums">
                  {watching.size}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-3">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === "provider" ? "Search providers by name or email" : "Search monitors by name or email"
              }
              className="h-10 rounded-xl pl-9"
            />
          </div>

          {/* ------------------------------------------------------- provider */}
          <TabsContent value="provider" className="mt-3 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            {listing?.providerId ? (
              <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Already attached to{" "}
                <span className="font-medium text-foreground">{listing.providerName || "a provider"}</span>. Picking
                a different account moves it.
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
              {loadingProviders ? (
                <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Loading providers…
                </p>
              ) : filteredProviders.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {providers.length === 0
                    ? "No accounts can publish content yet. Upgrade an account to Founder Batch first."
                    : "No provider matches that search."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredProviders.map((provider) => {
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
          </TabsContent>

          {/* ------------------------------------------------------- monitors */}
          <TabsContent value="monitors" className="mt-3 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Monitors read this listing and its analytics. They do not own it, cannot edit or promote it, and
              the public never sees them. Changes here save straight away.
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
              {loadingMonitors ? (
                <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Loading monitors…
                </p>
              ) : filteredMonitors.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {monitors.length === 0
                    ? "No monitor accounts yet. Change an account's role to Monitor first."
                    : "No monitor matches that search."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredMonitors.map((monitor) => {
                    const isWatching = watching.has(monitor._id)
                    const busy = togglingId === monitor._id
                    const total =
                      monitor.assignmentCount +
                      (isWatching ? 1 : 0) -
                      (baseWatching.has(monitor._id) ? 1 : 0)
                    return (
                      <li key={monitor._id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleMonitor(monitor)}
                          aria-pressed={isWatching}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                            isWatching ? "bg-violet-500/10" : "hover:bg-muted/60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              isWatching
                                ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400"
                                : "border-border bg-muted text-muted-foreground",
                            )}
                          >
                            <RiEyeLine className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                              {monitor.displayName}
                              {monitor.role !== ROLES.MONITOR ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {roleLabel(monitor.role)}
                                </Badge>
                              ) : null}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {monitor.email} · watching {total}
                            </span>
                          </span>
                          {busy ? (
                            <RiLoader4Line className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                          ) : isWatching ? (
                            <RiCheckLine className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          {tab === "provider" ? (
            <>
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
            </>
          ) : (
            // Monitor changes are already saved, so there is nothing to confirm.
            <Button onClick={() => onOpenChange(false)} className="rounded-2xl bg-primary hover:bg-primary/90">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
