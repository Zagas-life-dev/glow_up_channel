"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { RiArrowLeftLine, RiArrowRightLine, RiInboxLine, RiLoader4Line, RiMailLine, RiShieldCheckLine } from 'react-icons/ri'
import { AuthShell } from '@/components/up/auth-shell'
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
    <AuthShell
      badge="Almost there"
      headline={<>One code, then you&apos;re <em>in</em></>}
      subtitle="Verifying keeps fake accounts off UP and makes sure deadline reminders reach you."
      points={[
        { icon: RiShieldCheckLine, title: 'Keep your account safe', text: 'Codes expire quickly and work once.' },
        { icon: RiArrowRightLine, title: 'Then complete onboarding', text: 'Seven quick questions build your feed.' },
      ]}
    >
      <span className="grid h-11 w-11 place-items-center rounded-up-md bg-up-orange-tint text-up-orange-ink">
        <RiMailLine className="h-[22px] w-[22px]" aria-hidden />
      </span>
      <h2 className="mt-[18px] font-display text-[22px] font-bold leading-tight text-foreground lg:text-[28px]">
        Verify your email
      </h2>
      <p className="mb-[22px] mt-2 text-[15px] leading-relaxed text-muted-foreground">
        {email ? (
          <>
            We sent a 6-digit code to <b className="text-foreground">{email}</b>.
          </>
        ) : (
          'We sent a 6-digit code to your email address.'
        )}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[22px]">
        <div className="space-y-2">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                inputMode="numeric"
                value={field.value ?? ''}
                onChange={(value) => handleCodeChange(value, field.onChange)}
                disabled={isLoading}
                autoFocus
                aria-label="Verification code"
              >
                <InputOTPGroup className="w-full justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-[60px] w-full max-w-[52px] rounded-up-md border-[1.5px] bg-card font-display text-[22px] font-bold first:rounded-up-md first:border-l-[1.5px] last:rounded-up-md"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {errors.code && (
            <p className="text-[13px] font-semibold text-destructive">{errors.code.message}</p>
          )}
        </div>

        <Button type="submit" className="h-[52px] w-full text-base" disabled={isLoading}>
          {isLoading ? (
            <>
              <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden />
              Verifying…
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </form>

      <p className="mt-3.5 text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          className="font-bold text-up-orange-ink hover:underline disabled:opacity-60"
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </p>

      {/* Tips sit below the form as quiet rows. */}
      <div className="mt-[26px] grid gap-2.5">
        {[
          { icon: RiShieldCheckLine, title: 'Keep your account safe', text: 'Codes expire after a short time. You can always request a new one.' },
          { icon: RiInboxLine, title: 'Check the right inbox', text: "Look in Promotions or Spam if it isn't there." },
          { icon: RiArrowRightLine, title: 'Then complete onboarding', text: 'Seven quick questions build your feed.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm bg-up-fill text-foreground">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div>
              <b className="block text-sm text-foreground">{title}</b>
              <small className="text-[13px] text-muted-foreground">{text}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-up-hairline pt-4 text-[13px] text-muted-foreground">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:underline">
          <RiArrowLeftLine className="h-3.5 w-3.5" aria-hidden />
          Back to login
        </Link>
        <span>
          Wrong email?{' '}
          <Link href="/signup" className="font-bold text-foreground hover:underline">
            Create a new account
          </Link>
        </span>
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthGuard>
      <VerifyEmailContent />
    </AuthGuard>
  )
}

