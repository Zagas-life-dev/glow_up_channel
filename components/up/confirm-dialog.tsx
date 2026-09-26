"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * The one destructive confirmation. It names the thing and what goes with it,
 * carries the only red button in the product, and closes on Esc or Cancel —
 * never on a scrim click. Cancel takes focus first.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  busyLabel,
  busy = false,
  confirmPhrase,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  busyLabel?: string
  busy?: boolean
  /** When set, the red button stays disabled until this exact text is typed. */
  confirmPhrase?: string
  onConfirm: () => void | Promise<void>
}) {
  const [typed, setTyped] = React.useState("")
  React.useEffect(() => {
    if (!open) setTyped("")
  }, [open])
  const locked = Boolean(confirmPhrase) && typed.trim() !== confirmPhrase

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {confirmPhrase ? (
          <label className="block text-sm font-semibold text-foreground">
            Type <span className="font-bold">{confirmPhrase}</span> to confirm
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-2 h-[46px]"
            />
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} className="h-11">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || locked}
            onClick={(e) => {
              // Stay open until the work finishes, so a failure can be read.
              e.preventDefault()
              void onConfirm()
            }}
            className={cn(buttonVariants({ variant: "destructive" }), "h-11 px-5")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
