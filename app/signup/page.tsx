"use client"

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiCheckLine, RiCloseLine, RiEyeLine, RiEyeOffLine, RiFlashlightLine, RiPlayList2Line, RiUserLine } from 'react-icons/ri'
import { cn } from '@/lib/utils'
import { AuthShell, AuthHeading, AuthError } from '@/components/up/auth-shell'
import { getDatePickerPropsFor5Plus, calculateAge } from '@/lib/date-utils'

/** Mirrors the password rules in the schema below, so the checklist ticks live. */
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'One number (0-9)', test: (v) => /[0-9]/.test(v) },
]

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().refine((date) => {
    return !!date; 
  }, "Date of birth is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { registerOpportunitySeeker } = useAuth()
  const router = useRouter()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      password: '',
    }
  })

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError('')
    try {
      // Validate age
      const age = calculateAge(data.dateOfBirth)
      if (age < 5) {
        setError('You must be at least 5 years old to create an account')
        setIsLoading(false)
        return
      }

      // Every new account is an opportunity seeker. Publishing is unlocked by
      // purchasing Founder Batch after signing up, not chosen at registration.
      await registerOpportunitySeeker(data.email, data.password, data.firstName, data.lastName, data.dateOfBirth)

      
      router.push('/verify-email')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const password = watch('password') ?? ''
  const rulesPass = PASSWORD_RULES.every((rule) => rule.test(password))
  const fieldError = (message?: string) =>
    message ? <p className="text-[13px] font-semibold text-destructive">{message}</p> : null

  return (
    <AuthShell
      badge="Join 10,000+ members"
      headline={<>Your glow-up starts <em>here</em></>}
      mobileHeadline={<>Get access. Get <em>UP</em>.</>}
      subtitle="Real opportunities, resources and support for young Africans preparing to lead the future of global work."
      points={[
        { icon: RiUserLine, title: 'For seekers', text: 'Discover roles, programs, and events that match your goals.' },
        { icon: RiFlashlightLine, title: 'Founder Batch', text: 'Upgrade after joining to publish your own opportunities and events.' },
        { icon: RiPlayList2Line, title: 'Built for growth', text: 'Use playlists, sessions, and tracking to stay consistent.' },
      ]}
    >
      <AuthHeading title="Create your account">Free for seekers. Takes about a minute.</AuthHeading>

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-[7px]">
            <Label htmlFor="firstName" className="text-[13px] font-bold text-foreground">
              First name
            </Label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <Input {...field} id="firstName" placeholder="First name" className="h-12" disabled={isLoading} required />
              )}
            />
            {fieldError(errors.firstName?.message)}
          </div>

          <div className="space-y-[7px]">
            <Label htmlFor="lastName" className="text-[13px] font-bold text-foreground">
              Last name
            </Label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <Input {...field} id="lastName" placeholder="Last name" className="h-12" disabled={isLoading} required />
              )}
            />
            {fieldError(errors.lastName?.message)}
          </div>
        </div>

        <div className="space-y-[7px]">
          <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
            Email
          </Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input {...field} id="email" type="email" placeholder="you@example.com" className="h-12" disabled={isLoading} />
            )}
          />
          {fieldError(errors.email?.message)}
        </div>

        <div className="space-y-[7px]">
          <Label htmlFor="dateOfBirth" className="text-[13px] font-bold text-foreground">
            Date of birth
          </Label>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => {
              const { min, max } = getDatePickerPropsFor5Plus()
              return (
                <Input {...field} id="dateOfBirth" type="date" min={min} max={max} className="h-12" disabled={isLoading} required />
              )
            }}
          />
          <p className="text-xs text-muted-foreground">You must be at least 5 years old to create an account.</p>
          {fieldError(errors.dateOfBirth?.message)}
        </div>

        <div className="space-y-[7px]">
          <Label htmlFor="password" className="text-[13px] font-bold text-foreground">
            Password
          </Label>
          <div className="relative">
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  className="h-12 pr-11"
                  disabled={isLoading}
                />
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? <RiEyeOffLine className="h-4 w-4" aria-hidden /> : <RiEyeLine className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {/* Rules tick orange as they pass — no red/green pair. */}
          <ul className="grid gap-1.5 pt-1.5 text-[13px]" aria-label="Password rules">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li key={rule.label} className={cn('flex items-center gap-2', ok ? 'text-foreground' : 'text-muted-foreground')}>
                  {ok ? (
                    <RiCheckLine className="h-4 w-4 text-up-orange-ink" aria-hidden />
                  ) : (
                    <RiCloseLine className="h-4 w-4" aria-hidden />
                  )}
                  {rule.label}
                  <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
                </li>
              )
            })}
          </ul>
          {fieldError(errors.password?.message)}
        </div>

        <Button type="submit" className="h-[52px] w-full text-base" disabled={isLoading || !rulesPass}>
          {isLoading ? 'Creating your account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already on UP?{' '}
          <Link href="/login" className="font-bold text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/privacy-policy" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  )
}
