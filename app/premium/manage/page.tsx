"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, ArrowLeft, Calendar, CreditCard, XCircle, Loader2, Star, Mail, Hash, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/layout/page-shell"

export default function ManagePremiumPage() {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState<{
    isPremium: boolean
    premiumExpiresAt: string | null
    canCancel?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (!user || !ApiClient.isAuthenticated()) {
      setLoading(false)
      return
    }
    ApiClient.getPremiumStatus()
      .then((data) => setStatus(data))
      .catch(() => setStatus({ isPremium: false, premiumExpiresAt: null, canCancel: false }))
      .finally(() => setLoading(false))
  }, [user])

  const handleSubscribe = async () => {
    try {
      if (!user) return
      setIsStarting(true)
      const result = await ApiClient.startPremiumSubscription(150000, {
        planId: "premium_monthly",
        callbackUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/premium/manage?premium=success`
            : undefined,
      })
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl
        return
      }
      toast.error("Failed to start subscription")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to start premium subscription")
    } finally {
      setIsStarting(false)
    }
  }

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Cancel your premium subscription? You will keep access until the end of your current billing period and will not be charged again."
      )
    )
      return
    try {
      setIsCancelling(true)
      const { premiumExpiresAt: expiresAt } = await ApiClient.cancelPremiumSubscription()
      setStatus((prev) => (prev ? { ...prev, canCancel: false } : null))
      await refreshUser()
      toast.success(
        "Subscription cancelled. You keep premium until " +
          (expiresAt ? new Date(expiresAt).toLocaleDateString() : "the end of your period") +
          "."
      )
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription")
    } finally {
      setIsCancelling(false)
    }
  }

  // Handle redirect callback after Paystack
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get("reference")
    if (params.get("premium") === "success" && ref) {
      ApiClient.verifyPremiumSubscription(ref)
        .then((result) => {
          setStatus({
            isPremium: result.isPremium,
            premiumExpiresAt: result.premiumExpiresAt,
            canCancel: true,
          })
          refreshUser()
          toast.success("Premium subscription activated!")
        })
        .catch(() => toast.error("Failed to verify payment"))
        .finally(() => {
          const url = new URL(window.location.href)
          url.searchParams.delete("premium")
          url.searchParams.delete("reference")
          window.history.replaceState({}, "", url.toString())
        })
    }
  }, [refreshUser])

  return (
    <AuthGuard>
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8 pt-4 pt-safe">
          <Link
            href="/profile/settings"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to settings
          </Link>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium text-primary mb-3">
              <Crown className="w-3 h-3" />
              Manage subscription
            </div>
            <h1 className="text-2xl font-bold text-foreground">Manage Premium</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View your premium status, renew, or cancel your subscription.
            </p>
          </div>

          {loading ? (
            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : status?.isPremium ? (
            <>
              <Card className="border-primary/30 bg-primary/5 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                    <Crown className="w-5 h-5 text-primary" />
                    Your premium is active
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status.premiumExpiresAt && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border/60">
                      <Calendar className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Access until</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(status.premiumExpiresAt).toLocaleDateString(undefined, {
                            dateStyle: "long",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Glow Up Premium – Monthly plan. Billed via Paystack. You can cancel anytime.
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSubscribe}
                  disabled={isStarting || isCancelling}
                  className="bg-primary hover:bg-primary/90 rounded-xl gap-2"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isStarting ? "Connecting…" : "Renew / Manage payment via Paystack"}
                </Button>
                {status.canCancel && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isStarting || isCancelling}
                    className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
                  >
                    {isCancelling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {isCancelling ? "Cancelling…" : "Cancel subscription"}
                  </Button>
                )}
              </div>

              <Card className="mt-8 border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle className="text-foreground text-base">What you have</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    Weekly premium newsletter and insights
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                    Create and manage your own channels
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    Special library of premium guides and resources
                  </div>
                  <p className="text-xs pt-2">Plus ad‑light experience, QR profile, and Lock In hosting.</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="border-border/70 bg-card/90 mb-6">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    You’re not on a premium plan yet. Subscribe to unlock channels, newsletters, and more.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleSubscribe}
                      disabled={isStarting}
                      className="bg-primary hover:bg-primary/90 rounded-xl gap-2"
                    >
                      {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                      {isStarting ? "Connecting…" : "Subscribe – ₦1,500/month"}
                    </Button>
                    <Button variant="outline" asChild className="rounded-xl">
                      <Link href="/premium">View full plan details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  )
}
