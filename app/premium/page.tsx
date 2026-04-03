"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Shield, Star, QrCode, Mail, Hash, Focus, BookOpen } from "lucide-react"
import { toast } from "sonner"

export default function PremiumPage() {
  const { user } = useAuth()
  const [isStarting, setIsStarting] = useState(false)

  const handleSubscribe = async () => {
    try {
      if (!user) return

      setIsStarting(true)
      // Paystack expects amount in kobo (1 NGN = 100 kobo). ₦1,500 = 150000 kobo.
      const result = await ApiClient.startPremiumSubscription(150000, {
        planId: "premium_monthly",
        callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/profile/settings?premium=success` : undefined,
      })
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl
        return
      }
      toast.error("Failed to start subscription")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start premium subscription"
      console.error("Error starting premium subscription:", error)
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <AuthGuard>
    <div className="max-w-3xl mx-auto px-4 pb-24 lg:pb-8 pt-4 pt-safe">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium text-primary mb-3">
          <Crown className="w-3 h-3" />
          Premium Membership
        </div>
        <h1 className="text-2xl font-bold text-foreground">Glow Up Premium</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unlock extra power features for ambitious users each month.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1.5fr] mb-6">
        <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Star className="w-5 h-5 text-primary" />
              What you get
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <BookOpen className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Premium Resource</p>
                <p className="text-xs text-muted-foreground">
                  Access to a special library of premium guides and resources.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Create channels</p>
                <p className="text-xs text-muted-foreground">
                  Start and grow your own communities around topics you care about.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Focus className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Lock In sessions</p>
                <p className="text-xs text-muted-foreground">
                  Run community focus sessions that keep everyone accountable together.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Ad‑light experience</p>
                <p className="text-xs text-muted-foreground">
                  Browse the platform with no regular ads. You&apos;ll still see clearly labelled promoted content.
                </p>
              </div>
            </div>

            {/* <div className="flex items-start gap-3">
              <QrCode className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">QR contact profile</p>
                <p className="text-xs text-muted-foreground">
                  Generate a QR card that lets people save your details instantly at events.
                </p>
              </div>
            </div> */}
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-primary/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-foreground flex items-center gap-2">
                Monthly Plan
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[11px]">
                  Most popular
                </Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">₦1,500</span>
                <span className="text-xs text-muted-foreground">per month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Billed monthly through Paystack. Cancel any time.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• All premium benefits included</li>
              <li>• Renews automatically each month</li>
              <li>• Secure payments handled by Paystack</li>
            </ul>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSubscribe} disabled={isStarting}>
              {isStarting ? "Connecting to Paystack…" : "Continue with Paystack"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-[11px] text-muted-foreground">
        By subscribing you agree to our terms. Payments are processed by Paystack; Glow Up does not store your card
        details.
      </div>
    </div>
    </AuthGuard>
  )
}

