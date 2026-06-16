"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RiVipCrownLine, RiArrowLeftLine } from "react-icons/ri"

interface PremiumGuardProps {
  /**
   * Whether the user has premium access.
   * Frontend check - should be combined with backend validation.
   */
  isPremium: boolean

  /**
   * Whether the user is an admin.
   * Admins always bypass premium checks.
   */
  isAdmin: boolean

  /**
   * The content to render if user has access.
   */
  children: ReactNode

  /**
   * Optional callback URL to redirect after upgrade.
   * Defaults to current page.
   */
  callbackUrl?: string

  /**
   * Title for the paywall dialog.
   * Defaults to "Premium Playlist"
   */
  title?: string

  /**
   * Description for the paywall dialog.
   * Defaults to standard premium message.
   */
  description?: string

  /**
   * Redirect delay in milliseconds before going to premium page.
   * Set to 0 or false to disable auto-redirect.
   * Defaults to 3000ms.
   */
  redirectDelay?: number | false

  /**
   * Custom action component to show instead of default back button.
   * Useful for custom navigation behavior.
   */
  customActions?: ReactNode

  /**
   * Show a fallback UI while checking premium status.
   * Defaults to null (no loading state).
   */
  isLoading?: boolean
}

/**
 * Reusable premium content guard component.
 *
 * Usage:
 * ```tsx
 * <PremiumGuard
 *   isPremium={user.isPremium}
 *   isAdmin={user.role === "admin"}
 *   title="Premium Playlist"
 *   description="This playlist is available exclusively to Premium members."
 * >
 *   <PremiumContentPage />
 * </PremiumGuard>
 * ```
 *
 * Backend Security Notes:
 * - This component provides frontend UX only.
 * - Always validate premium access on backend/API level.
 * - Use this with server-side checks (getServerSideProps, server actions, API routes).
 * - Backend should return 403 Forbidden for unauthorized premium access.
 */
export default function PremiumGuard({
  isPremium,
  isAdmin,
  children,
  callbackUrl,
  title = "Premium Playlist",
  description = "This playlist is available exclusively to Premium members. Upgrade your account to unlock full access to this playlist and all other premium content.",
  redirectDelay = 3000,
  customActions,
  isLoading,
}: PremiumGuardProps) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // User has access if they're premium or admin
  const hasAccess = isPremium || isAdmin

  // Initialize dialog visibility
  useEffect(() => {
    if (!hasAccess && !isLoading) {
      setShowDialog(true)
    }
  }, [hasAccess, isLoading])

  // Handle redirect to premium page after delay
  useEffect(() => {
    if (!showDialog || redirectDelay === false || isLoading) {
      return
    }

    const timer = setTimeout(() => {
      setRedirecting(true)
      const upgradeUrl = callbackUrl ? `/premium?from=${encodeURIComponent(callbackUrl)}` : "/premium"
      router.push(upgradeUrl)
    }, redirectDelay)

    return () => clearTimeout(timer)
  }, [showDialog, redirectDelay, router, callbackUrl, isLoading])

  // Show children if user has access
  if (hasAccess) {
    return <>{children}</>
  }

  // Show loading state if provided
  if (isLoading) {
    return null
  }

  // Show premium paywall dialog
  return (
    <Dialog open={showDialog} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <RiVipCrownLine className="h-5 w-5 text-amber-500" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left mt-3">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-4">
          {customActions ? (
            customActions
          ) : (
            <>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-border"
                onClick={() => router.back()}
              >
                <button className="flex items-center gap-2">
                  <RiArrowLeftLine className="w-4 h-4" />
                  Go Back
                </button>
              </Button>
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-full"
                disabled={redirecting}
              >
                <Link href={callbackUrl ? `/premium?from=${encodeURIComponent(callbackUrl)}` : "/premium"}>
                  <RiVipCrownLine className="w-4 h-4 mr-2" />
                  {redirecting ? "Redirecting..." : "Upgrade to Premium"}
                </Link>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
