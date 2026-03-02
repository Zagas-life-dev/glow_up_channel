"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FlaticonIcon } from '@/components/ui/flaticon-icon'
import Link from 'next/link'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [email, setEmail] = useState('')

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      await ApiClient.requestPasswordReset(data.email)
      setEmail(data.email)
      setCodeSent(true)
      toast.success('Password reset code sent! Please check your email.')
    } catch (error: any) {
      console.error('Request password reset error:', error)
      toast.error(error.message || 'Failed to send reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    router.push(`/reset-password?email=${encodeURIComponent(email)}`)
  }

  // Success state: keep the logic but use auth layout style
  if (codeSent) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          {/* Left: Context blurb (match login side panel style) */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password reset email sent
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Check your{" "}
                <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                  inbox
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                We&#39;ve sent a 6-digit reset code to <strong>{email}</strong>. Use it on the next
                screen to securely update your password.
              </p>
            </div>
          </div>

          {/* Right: Success card */}
          <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
            <CardHeader className="space-y-1 text-left pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Code sent
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                We&#39;ve emailed you a 6-digit code. It expires after a short time for your security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FlaticonIcon name="check-circle" className="w-7 h-7 text-emerald-500" aria-hidden />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                If you don&#39;t see the email, check your spam or promotions folder. You can request a new
                code from the reset screen if needed.
              </p>
              <Button
                onClick={handleContinue}
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200"
              >
                Continue to reset password
              </Button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full text-sm text-muted-foreground hover:text-orange-400 transition-colors"
              >
                <FlaticonIcon name="arrow-left" className="w-4 h-4 mr-2" aria-hidden />
                Back to login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Default state: align with login layout
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-rose-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* Left: Brand/context, mirroring login page */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Forgot your password
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Let&#39;s get you{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                back in
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              Enter the email linked to your GlowUp account and we&#39;ll send you a secure 6-digit
              code to reset your password.
            </p>
          </div>
        </div>

        {/* Right: Forgot password card */}
        <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Forgot password?
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We&#39;ll send a 6-digit reset code to your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold text-sm">
                  Email address
                </Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <FlaticonIcon
                        name="envelope"
                        className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
                        aria-hidden
                      />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-11 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Sending code…</span>
                  </div>
                ) : (
                  'Send reset code'
                )}
              </Button>
            </form>

            <div className="pt-2 text-sm text-muted-foreground">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                <FlaticonIcon name="arrow-left" className="w-4 h-4" aria-hidden />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


