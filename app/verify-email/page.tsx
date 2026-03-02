"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FlaticonIcon } from '@/components/ui/flaticon-icon'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import AuthGuard from '@/components/auth-guard'

const verificationSchema = z.object({
  code: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
})

type VerificationForm = z.infer<typeof verificationSchema>

function VerifyEmailContent() {
  const router = useRouter()
  const { refreshUser, isOnboardingCompleted } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [isVerified, setIsVerified] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
  })

  useEffect(() => {
    // Check if email is already verified
    const checkStatus = async () => {
      try {
        const status = await ApiClient.getVerificationStatus()
        setEmail(status.email)
        if (status.emailVerified) {
          setIsVerified(true)
        }
      } catch (error) {
        console.error('Error checking verification status:', error)
      }
    }
    checkStatus()
  }, [])

  const onSubmit = async (data: VerificationForm) => {
    setIsLoading(true)
    try {
      await ApiClient.verifyEmail(data.code)
      toast.success('Email verified successfully!')
      setIsVerified(true)
      
      // Refresh user data to update emailVerified status
      if (refreshUser) {
        await refreshUser()
      }
      
      // Redirect after a short delay
      setTimeout(() => {
        if (!isOnboardingCompleted) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      }, 1500)
    } catch (error: any) {
      console.error('Verification error:', error)
      toast.error(error.message || 'Failed to verify email. Please check the code and try again.')
      setValue('code', '') // Clear the input
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    try {
      await ApiClient.sendVerificationCode()
      toast.success('Verification code sent! Please check your email.')
    } catch (error: any) {
      console.error('Resend error:', error)
      toast.error(error.message || 'Failed to send verification code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeChange = (value: string, onChange: (value: string) => void) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    onChange(numericValue)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-rose-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* Left: Context / explanation */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              One quick step to secure your account
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Verify your{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                GlowUp email
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              We&apos;ve sent a 6-digit code to your email. Enter it on the right to confirm it&apos;s really you
              and unlock your personalized GlowUp experience.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="lock" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Keep your account safe</span>
              </div>
              <p className="text-muted-foreground">
                Email verification helps us protect your progress and saved opportunities.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="envelope" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Check the right inbox</span>
              </div>
              <p className="text-muted-foreground">
                Look in your primary inbox and spam folder for the GlowUp code email.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="sparkles" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Then complete onboarding</span>
              </div>
              <p className="text-muted-foreground">
                Once verified, you&apos;ll go straight into a quick profile setup.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Verify card */}
        <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20">
                <Mail className="w-5 h-5 text-orange-400" />
              </span>
              <span>Verify your email</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {email ? (
                <span>
                  We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to continue.
                </span>
              ) : (
                'We’ve sent a 6-digit verification code to your email address.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground font-semibold text-sm text-center block">
                  Enter verification code
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
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                      disabled={isLoading}
                      autoFocus
                    />
                  )}
                />
                {errors.code && (
                  <p className="text-sm text-red-400 text-center">{errors.code.message}</p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Codes expire after a short time. You can always request a new one.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify email'
                )}
              </Button>
            </form>

            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full border-border/70"
              >
                {isResending ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Resend code'
                )}
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Link
                  href="/login"
                  className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <FlaticonIcon name="arrow-left" className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                  Back to login
                </Link>
                <span>
                  Wrong email?{' '}
                  <Link
                    href="/signup"
                    className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                  >
                    Create a new account
                  </Link>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthGuard>
      <VerifyEmailContent />
    </AuthGuard>
  )
}

