"use client"

import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  /** Use true for network/fetch failures, false for generic error */
  isNetworkError?: boolean
  onRetry?: () => void
  className?: string
}

/** Errors use a neutral tile and a ghost "Try again", never red: nothing was destroyed. */
export default function ErrorState({
  isNetworkError = true,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const Icon = isNetworkError ? WifiOff : TriangleAlert
  const title = isNetworkError ? "We couldn't load this" : "Something went wrong"
  const message = isNetworkError ? "Check your connection and try again." : "Please try again."

  return (
    <div className={cn("flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-up-fill text-muted-foreground">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5 h-11 px-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}
