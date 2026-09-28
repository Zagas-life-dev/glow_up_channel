"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DuplicateMatchList } from "@/components/posting/DuplicateTitleWarning"
import type { ListingDuplicate } from "@/lib/api-client"

export interface PendingDuplicateApproval {
  item: { _id: string; title: string; type: string }
  duplicates: ListingDuplicate[]
}

/**
 * Shown when an approve came back DUPLICATE_LISTING: the listing would be a
 * second live one with this title in this country. The admin decides.
 */
export function DuplicateApprovalDialog({
  pending,
  busy,
  onApproveAnyway,
  onDeleteThis,
  onClose,
}: {
  pending: PendingDuplicateApproval | null
  busy: boolean
  onApproveAnyway: () => void
  onDeleteThis: () => void
  onClose: () => void
}) {
  const count = pending?.duplicates.length ?? 0
  return (
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="rounded-3xl border-border bg-card dark:bg-card shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">This looks like a duplicate</DialogTitle>
          <DialogDescription>
            {count === 1 ? "A live listing" : `${count} live listings`} in this country already{" "}
            {count === 1 ? "uses" : "use"} the title &ldquo;{pending?.item.title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        {pending && <DuplicateMatchList matches={pending.duplicates} />}
        <p className="text-xs text-muted-foreground">
          Review every duplicate on the{" "}
          <Link href="/dashboard/admin/duplicates" className="underline underline-offset-2">
            Duplicates
          </Link>{" "}
          page.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            Cancel
          </Button>
          <Button variant="outline" onClick={onDeleteThis} disabled={busy} className="rounded-2xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
            Delete this one
          </Button>
          <Button onClick={onApproveAnyway} disabled={busy} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600">
            Approve anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
