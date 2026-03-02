"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const resetPasswordSchema = z.object({
  code: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // If no email in URL, redirect to forgot password
      router.push('/forgot-password')
    }
  }, [searchParams, router])

  const handleCodeChange = (value: string, onChange: (value: string) => void) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    onChange(numericValue)
  }

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!email) {
      toast.error('Email is required. Please go back and request a reset code.')
      return
    }

    setIsLoading(true)
    try {
      // First verify the code
      await ApiClient.verifyResetCode(email, data.code)
      
      // Then reset the password
      await ApiClient.resetPassword(email, data.code, data.newPassword)
      
      toast.success('Password reset successfully!')
      setIsSuccess(true)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Failed to reset password. Please check the code and try again.')
      setValue('code', '') // Clear the code input
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email is required')
      return
    }

    setIsResending(true)
    try {
      await ApiClient.requestPasswordReset(email)
      toast.success('Reset code sent! Please check your email.')
    } catch (error: any) {
      console.error('Resend error:', error)
      toast.error(error.message || 'Failed to send reset code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          {/* Left: Context similar to login */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password reset complete
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                You&#39;re{" "}
                <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                  all set
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                Your password has been updated. Use your new details next time you sign in to keep your
                GlowUp journey secure.
              </p>
            </div>
          </div>

          {/* Right: Success card */}
          <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
            <CardHeader className="space-y-1 text-left pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Password reset successful
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FlaticonIcon name="check-circle" className="w-7 h-7 text-emerald-500" aria-hidden />
                </div>
              </div>
              <Button
                onClick={() => router.push('/login')}
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200"
              >
                Go to login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
              Secure password reset
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Set a{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                new password
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              Enter the 6-digit code we sent to your email and choose a strong new password to protect
              your GlowUp account.
            </p>
          </div>
        </div>

        {/* Right: Reset form card */}
        <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Reset your password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {email ? (
                <span>Enter the 6-digit code sent to <strong>{email}</strong> and your new password.</span>
              ) : (
                'Enter the 6-digit code and your new password.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground font-semibold text-sm">
                  Reset code
                </Label>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      onChange={(e) => handleCodeChange(e.target.value, field.onChange)}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono bg-muted/60 border-border/60 focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                      disabled={isLoading}
                      autoFocus
                    />
                  )}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground font-semibold text-sm">
                  New password
                </Label>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="h-11 pr-10 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <FlaticonIcon name="eye-off" className="w-4 h-4" aria-hidden />
                        ) : (
                          <FlaticonIcon name="eye" className="w-4 h-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  )}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-semibold text-sm">
                  Confirm new password
                </Label>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="h-11 pr-10 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <FlaticonIcon name="eye-off" className="w-4 h-4" aria-hidden />
                        ) : (
                          <FlaticonIcon name="eye" className="w-4 h-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  )}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                    <span>Resetting…</span>
                  </div>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>

            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending || !email}
                className="w-full border-border/60"
              >
                {isResending ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Sending code…</span>
                  </div>
                ) : (
                  'Resend code'
                )}
              </Button>

              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                <FlaticonIcon name="arrow-left" className="w-4 h-4 mr-2" aria-hidden />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <FlaticonIcon name="spinner" className="w-8 h-8 animate-spin text-primary" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

