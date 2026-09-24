"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiArrowLeftLine, RiCheckLine, RiLoader4Line, RiMailLine } from 'react-icons/ri'
import { AuthShell, AuthHeading } from '@/components/up/auth-shell'
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

  const backToLogin = (
    <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline">
      <RiArrowLeftLine className="h-4 w-4" aria-hidden />
      Back to login
    </Link>
  )

  // Success state
  if (codeSent) {
    return (
      <AuthShell
        badge="Password reset email sent"
        headline={<>Check your <em>inbox</em></>}
        subtitle={<>We&#39;ve sent a 6-digit reset code to {email}. Use it on the next screen to securely update your password.</>}
      >
        <span className="grid h-11 w-11 place-items-center rounded-up-md bg-up-lime-tint text-foreground">
          <RiCheckLine className="h-[22px] w-[22px]" aria-hidden />
        </span>
        <div className="mt-[18px]">
          <AuthHeading title="Code sent">
            We&#39;ve emailed a 6-digit code to <b className="text-foreground">{email}</b>. It expires after a short time for your security.
          </AuthHeading>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          If you don&#39;t see the email, check your spam or promotions folder. You can request a new
          code from the reset screen if needed.
        </p>
        <Button onClick={handleContinue} className="h-[52px] w-full text-base">
          Continue to reset password
        </Button>
        {backToLogin}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      badge="Forgot your password"
      headline={<>Let&#39;s get you <em>back in</em></>}
      subtitle="Enter the email linked to your UP account and we'll send you a secure 6-digit code to reset your password."
    >
      <AuthHeading title="Forgot password?">We&#39;ll send a 6-digit reset code to your email.</AuthHeading>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-[7px]">
          <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
            Email address
          </Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <RiMailLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  {...field}
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 pl-11"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}
          />
          {errors.email && <p className="text-[13px] font-semibold text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="h-[52px] w-full text-base" disabled={isLoading}>
          {isLoading ? (
            <>
              <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden />
              Sending code…
            </>
          ) : (
            'Send reset code'
          )}
        </Button>
      </form>

      {backToLogin}
    </AuthShell>
  )
}
