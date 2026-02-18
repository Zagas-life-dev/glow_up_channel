"use client"

import { Button } from "@/components/ui/button"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"

type ErrorStateProps = {
  /** Use true for network/fetch failures, false for generic error */
  isNetworkError?: boolean
  onRetry?: () => void
  className?: string
}

export default function ErrorState({
  isNetworkError = true,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const iconName = isNetworkError ? "wifi" : "exclamation"
  const title = isNetworkError ? "Network error" : "An error occurred"
  const message = isNetworkError
    ? "We couldn't load this. Check your connection and try again."
    : "Something went wrong. Please try again."

  return (
    <div
      className={
        "min-h-[50vh] flex flex-col items-center justify-center px-4 py-12 " +
        className
      }
    >
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <FlaticonIcon name={iconName} className="w-7 h-7 text-foreground/50" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
      <p className="text-sm text-foreground/50 text-center max-w-sm mb-6">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          className="border-border text-foreground hover:bg-accent"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}
