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
  const { refreshUser } = useAuth()
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
        router.push('/onboarding')
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

  if (isVerified) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-md">
          <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mb-2">
                <FlaticonIcon name="check-circle" className="w-9 h-9 text-emerald-500" aria-hidden />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Email verified
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Your email has been confirmed. Let&apos;s finish setting up your GlowUp profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => router.push('/onboarding')}
                className="w-full h-11 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                Continue to onboarding
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                You can always update your details later from your settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-3 text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mb-1">
              <Mail className="w-9 h-9 text-orange-500" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
                Verify your email
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                {email ? (
                  <span>
                    We&apos;ve sent a 6‑digit code to <strong>{email}</strong>
                  </span>
                ) : (
                  "We’ve sent a 6‑digit verification code to your email address."
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground font-medium text-center block text-sm">
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
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono border-border/70 bg-muted/60 focus:border-orange-500/70 focus:ring-orange-500/30 rounded-2xl"
                      disabled={isLoading}
                      autoFocus
                    />
                  )}
                />
                {errors.code && (
                  <p className="text-sm text-red-500 text-center">{errors.code.message}</p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6‑digit code from your inbox. Check spam or promotions if you don&apos;t see it.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Verifying…</span>
                  </div>
                ) : (
                  'Verify email'
                )}
              </Button>
            </form>

            <div className="space-y-3 pt-4 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full h-11 rounded-full border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              >
                {isResending ? (
                  <div className="flex items-center space-x-2">
                    <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Sending…</span>
                  </div>
                ) : (
                  'Resend code'
                )}
              </Button>

              <Link
                href="/"
                className="inline-flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FlaticonIcon name="arrow-left" className="w-3 h-3 mr-1.5" aria-hidden />
                Back to home
              </Link>
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

