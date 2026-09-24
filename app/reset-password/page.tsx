"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { RiArrowLeftLine, RiCheckLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from 'react-icons/ri'
import { AuthShell, AuthHeading } from '@/components/up/auth-shell'
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

  const backToLogin = (
    <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline">
      <RiArrowLeftLine className="h-4 w-4" aria-hidden />
      Back to login
    </Link>
  )

  const passwordField = (
    name: 'newPassword' | 'confirmPassword',
    label: string,
    placeholder: string,
    shown: boolean,
    toggle: () => void,
  ) => (
    <div className="space-y-[7px]">
      <Label htmlFor={name} className="text-[13px] font-bold text-foreground">
        {label}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative">
            <Input
              {...field}
              id={name}
              type={shown ? 'text' : 'password'}
              placeholder={placeholder}
              className="h-12 pr-11"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={toggle}
              aria-label={shown ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {shown ? <RiEyeOffLine className="h-4 w-4" aria-hidden /> : <RiEyeLine className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        )}
      />
      {errors[name] && <p className="text-[13px] font-semibold text-destructive">{errors[name]?.message}</p>}
    </div>
  )

  if (isSuccess) {
    return (
      <AuthShell
        badge="Password reset complete"
        headline={<>You&#39;re <em>all set</em></>}
        subtitle="Your password has been updated. Use your new details next time you sign in."
      >
        <span className="grid h-11 w-11 place-items-center rounded-up-md bg-up-lime-tint text-foreground">
          <RiCheckLine className="h-[22px] w-[22px]" aria-hidden />
        </span>
        <div className="mt-[18px]">
          <AuthHeading title="Password updated">Taking you to sign in…</AuthHeading>
        </div>
        <Button onClick={() => router.push('/login')} className="h-[52px] w-full text-base">
          Go to sign in
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      badge="Secure password reset"
      headline={<>Set a <em>new password</em></>}
      subtitle="Enter the 6-digit code we sent to your email and choose a strong new password to protect your UP account."
    >
      <AuthHeading title="Reset your password">
        {email ? (
          <>Enter the 6-digit code sent to <b className="text-foreground">{email}</b> and your new password.</>
        ) : (
          'Enter the 6-digit code and your new password.'
        )}
      </AuthHeading>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-[7px]">
          <Label htmlFor="code" className="text-[13px] font-bold text-foreground">
            Reset code
          </Label>
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <InputOTP
                id="code"
                maxLength={6}
                inputMode="numeric"
                value={field.value ?? ''}
                onChange={(value) => handleCodeChange(value, field.onChange)}
                disabled={isLoading}
                autoFocus
              >
                <InputOTPGroup className="w-full justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-[56px] w-full max-w-[52px] rounded-up-md border-[1.5px] bg-card font-display text-xl font-bold first:rounded-up-md first:border-l-[1.5px] last:rounded-up-md"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {errors.code && <p className="text-[13px] font-semibold text-destructive">{errors.code.message}</p>}
        </div>

        {passwordField('newPassword', 'New password', 'Enter new password', showPassword, () => setShowPassword(!showPassword))}
        {passwordField('confirmPassword', 'Confirm new password', 'Confirm new password', showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}

        <Button type="submit" className="h-[52px] w-full text-base" disabled={isLoading}>
          {isLoading ? (
            <>
              <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>

      <p className="mt-3.5 text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending || !email}
          className="font-bold text-up-orange-ink hover:underline disabled:opacity-60"
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </p>

      {backToLogin}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <RiLoader4Line className="h-8 w-8 animate-spin text-up-orange" aria-hidden />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
