"use client"

/**
 * Pieces of the group view on the playlist page: the status row under each item,
 * the activity feed, and the invite-link box in the members sheet.
 */

import { useState } from "react"
import { RiFileCopyLine, RiLinkM, RiLoader4Line, RiArrowDownSLine } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  MY_STATUS_LABEL,
  createInviteLink,
  inviteUrl,
  revokeInviteLink,
  type DirectStatus,
  type GroupActivity,
  type GroupTrackingItem,
} from "@/lib/groups"

const DIRECT: { value: DirectStatus; label: string }[] = [
  { value: "started", label: "Started" },
  { value: "submitted", label: "Submitted" },
  { value: "not_for_me", label: "Not for me" },
]

/** Own status badge (any playlist), plus members' statuses and quick set (groups). */
export function ItemStatusRow({
  myStatus,
  group,
  onSet,
  selfId,
}: {
  myStatus: string | null | undefined
  /** The viewer: their own status is the "You:" badge, not a member chip. */
  selfId?: string
  group?: GroupTrackingItem | null
  onSet?: (status: DirectStatus) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const others = (group?.members || []).filter((m) => m.label && m.userId !== selfId)
  if (!myStatus && !group && !onSet) return null

  return (
    <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1.5">
      {myStatus ? (
        <span className="rounded-md bg-up-orange-tint px-1.5 py-0.5 text-[11px] font-semibold text-up-orange-ink">
          You: {MY_STATUS_LABEL[myStatus] || myStatus}
        </span>
      ) : null}
      {others.slice(0, 4).map((m) => (
        <span key={m.userId} className="rounded-md bg-up-fill px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {(m.firstName || "Member").split(" ")[0]} · {m.label}
        </span>
      ))}
      {others.length > 4 ? <span className="text-[11px] text-muted-foreground">+{others.length - 4}</span> : null}
      {onSet ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className="inline-flex min-h-7 items-center gap-0.5 rounded-md border border-border px-1.5 text-[11px] font-semibold text-foreground hover:bg-up-fill"
            >
              {busy ? <RiLoader4Line className="h-3 w-3 animate-spin" /> : null}
              Set my status
              <RiArrowDownSLine className="h-3.5 w-3.5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-1">
            {DIRECT.map((d) => (
              <DropdownMenuItem
                key={d.value}
                className="cursor-pointer rounded-lg"
                onClick={async () => {
                  setBusy(true)
                  try {
                    await onSet(d.value)
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function activityText(a: GroupActivity) {
  const who = a.actor?.firstName?.split(" ")[0] || "Someone"
  switch (a.type) {
    case "member_joined":
      return `${who} joined`
    case "member_left":
      return `${who} left`
    case "item_added":
      return `${who} added ${a.title || "a listing"}`
    case "item_removed":
      return `${who} removed ${a.title || "a listing"}`
    case "status_changed":
      return `${who}: ${a.status} on ${a.title || "a listing"}`
    case "deadline_soon":
      return `Deadline in 2 days: ${a.title || "a listing"}`
    default:
      return "Activity"
  }
}

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function GroupActivityFeed({ items }: { items: GroupActivity[] | null }) {
  if (items === null) return <RiLoader4Line className="mx-auto my-10 h-5 w-5 animate-spin text-muted-foreground" />
  if (items.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No activity yet.</p>
  return (
    <ul className="divide-y divide-up-hairline overflow-hidden rounded-up-xl border border-border bg-card">
      {items.map((a) => (
        <li key={a._id} className="flex items-start gap-3 px-4 py-3">
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.type === "deadline_soon" ? "bg-up-orange" : "bg-border")} aria-hidden />
          <span className="min-w-0 flex-1 text-sm text-foreground">{activityText(a)}</span>
          <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{ago(a.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Owner/editor: make, copy and turn off the 7-day invite link. */
export function InviteLinkBox({
  playlistId,
  link,
  onChange,
}: {
  playlistId: string
  link: { token: string; expiresAt: string } | undefined
  onChange: (link: { token: string; expiresAt: string } | undefined) => void
}) {
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token))
      toast.success("Invite link copied")
    } catch {
      toast.message(inviteUrl(token))
    }
  }

  return (
    <div className="mt-4 rounded-up-lg border border-border p-3">
      <p className="text-sm font-semibold text-foreground">Invite link</p>
      <p className="text-[12px] text-muted-foreground">Anyone signed in who opens it joins as a member. Lasts 7 days.</p>
      {link ? (
        <>
          <p className="mt-2 truncate rounded-md bg-up-fill px-2 py-1.5 text-[12px] text-foreground">{inviteUrl(link.token)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Expires {new Date(link.expiresAt).toLocaleDateString()}</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" className="h-10 flex-1" onClick={() => copy(link.token)}>
              <RiFileCopyLine className="mr-1.5 h-4 w-4" /> Copy link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={busy}
              onClick={() => run(async () => {
                await revokeInviteLink(playlistId)
                onChange(undefined)
                toast.success("Link turned off")
              })}
            >
              Turn off
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-10 w-full"
          disabled={busy}
          onClick={() => run(async () => {
            const { inviteLink } = await createInviteLink(playlistId)
            onChange(inviteLink)
            await copy(inviteLink.token)
          })}
        >
          {busy ? <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" /> : <RiLinkM className="mr-1.5 h-4 w-4" />}
          Create invite link
        </Button>
      )}
    </div>
  )
}
