"use client"

import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { RiChat3Line, RiHeartLine, RiMore2Line, RiPlayList2Fill, RiExternalLinkLine } from "react-icons/ri"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export interface ChannelChatPost {
  _id: string
  author: {
    _id: string
    email: string
    firstName?: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string; publicId?: string }[]
    playlist?: { _id: string; name: string; itemCount?: number }
    contentReference?: { type: string; title: string }
    poll?: { question?: string }
  }
  likeCount: number
  replyCount: number
  createdAt: string
  isEdited: boolean
}

export type ReadReceiptState = "sent" | "read" | null

interface ChannelChatMessageProps {
  post: ChannelChatPost
  isOwn: boolean
  /** Shown only when `isOwn` and `showReadReceipt` */
  readReceipt?: ReadReceiptState
  showReadReceipt?: boolean
  onDelete?: (postId: string) => void
}

export default function ChannelChatMessage({
  post,
  isOwn,
  readReceipt = null,
  showReadReceipt = false,
  onDelete,
}: ChannelChatMessageProps) {
  const name = post.author.firstName || post.author.email?.split("@")[0] || "Member"
  const timeLabel = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
  const text = (post.content?.text || "").trim()
  const images = post.content?.images || []
  const playlist = post.content?.playlist
  const refBlock = post.content?.contentReference
  const poll = post.content?.poll

  return (
    <div
      className={cn(
        "flex w-full gap-2.5 px-1 py-1.5 sm:gap-3",
        isOwn ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Link
        href={`/profile/${post.author._id}`}
        className={cn(
          "relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-border/60 bg-muted",
          isOwn && "ring-primary/25",
        )}
        aria-label={`${name} profile`}
      >
        {post.author.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author.profileImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className={cn("min-w-0 max-w-[min(100%,28rem)] flex-1", isOwn && "flex flex-col items-end")}>
        <div className={cn("mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0", isOwn && "flex-row-reverse")}>
          <span className="text-xs font-semibold text-foreground">{name}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground">{timeLabel}</span>
          {post.isEdited ? (
            <span className="text-[10px] text-muted-foreground">(edited)</span>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm",
            isOwn
              ? "rounded-tr-md bg-primary/18 text-foreground border border-primary/20"
              : "rounded-tl-md bg-muted/90 text-foreground border border-border/60",
          )}
        >
          {text ? <p className="whitespace-pre-wrap break-words">{text}</p> : null}

          {images.length > 0 ? (
            <div
              className={cn(
                "mt-2 grid gap-1.5",
                images.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {images.slice(0, 4).map((img, i) => (
                <div
                  key={img.publicId || `${post._id}-img-${i}`}
                  className="relative aspect-square w-full overflow-hidden rounded-xl bg-background/40"
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="(max-width: 28rem) 100vw, 280px" />
                </div>
              ))}
            </div>
          ) : null}

          {(playlist || refBlock || poll) && (
            <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
              {playlist ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RiPlayList2Fill className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate font-medium text-foreground">{playlist.name}</span>
                  {typeof playlist.itemCount === "number" ? (
                    <span className="tabular-nums">· {playlist.itemCount} items</span>
                  ) : null}
                </div>
              ) : null}
              {refBlock ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{refBlock.title}</span>
                  {refBlock.type ? ` · ${refBlock.type}` : ""}
                </p>
              ) : null}
              {poll?.question ? (
                <p className="text-xs font-medium text-foreground">Poll: {poll.question}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className={cn("mt-1 flex flex-wrap items-center gap-1", isOwn && "justify-end")}>
          <Button variant="ghost" size="sm" className="h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground" asChild>
            <Link href={`/posts/${post._id}`}>
              <RiHeartLine className="h-3.5 w-3.5" />
              {post.likeCount > 0 ? <span className="tabular-nums">{post.likeCount}</span> : null}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground" asChild>
            <Link href={`/posts/${post._id}`}>
              <RiChat3Line className="h-3.5 w-3.5" />
              {post.replyCount > 0 ? <span className="tabular-nums">{post.replyCount}</span> : null}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground" asChild>
            <Link href={`/posts/${post._id}`}>
              <RiExternalLinkLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View</span>
            </Link>
          </Button>

          {onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 min-h-8 min-w-8 p-0 text-muted-foreground"
                  aria-label="More"
                >
                  <RiMore2Line className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(post._id)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {isOwn && showReadReceipt && readReceipt ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {readReceipt === "read" ? "Read" : "Delivered"}
          </p>
        ) : null}
      </div>
    </div>
  )
}
