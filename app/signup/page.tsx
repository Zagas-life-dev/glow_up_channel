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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FlaticonIcon } from '@/components/ui/flaticon-icon'
import { Target } from 'lucide-react'
import { getDatePickerPropsFor5Plus, calculateAge } from '@/lib/date-utils'

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
  role: z.enum(['seeker', 'provider'], { required_error: "Please select a role" })
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { registerOpportunitySeeker, registerOpportunityPoster } = useAuth()
  const router = useRouter()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      password: '',
      role: undefined
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

      if (data.role === 'seeker') {
        await registerOpportunitySeeker(data.email, data.password, data.firstName, data.lastName, data.dateOfBirth)
      } else if (data.role === 'provider') {
        await registerOpportunityPoster(data.email, data.password, data.firstName, data.lastName, data.dateOfBirth)
      }
      
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-rose-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* Left: Story / benefits */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Create your GlowUp account
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Join a community that{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                stays locked in
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              Build your profile once, then use GlowUp to find opportunities, track your
              progress, and stay focused with Locked In sessions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="users" className="w-4 h-4" aria-hidden />
                <span className="font-medium">For seekers</span>
              </div>
              <p className="text-muted-foreground">
                Discover roles, programs, and events that match your goals.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <Target className="w-4 h-4 text-orange-400" aria-hidden />
                <span className="font-medium">For providers</span>
              </div>
              <p className="text-muted-foreground">
                Post opportunities and reach the right young talent.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="sparkles" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Built for growth</span>
              </div>
              <p className="text-muted-foreground">
                Use playlists, sessions, and tracking to stay consistent.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Signup card */}
        <Card className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Create your GlowUp account
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              It takes less than a minute to get set up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                <FlaticonIcon name="exclamation" className="w-4 h-4" aria-hidden />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground font-semibold text-sm">
                    First Name <span className="text-red-400">*</span>
                  </Label>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="firstName"
                        placeholder="First name"
                        className="h-11 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                        required
                      />
                    )}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-400">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground font-semibold text-sm">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="lastName"
                        placeholder="Last name"
                        className="h-11 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                        required
                      />
                    )}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold text-sm">
                  Email
                </Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                      disabled={isLoading}
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-foreground font-semibold text-sm">
                  Date of Birth
                </Label>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => {
                    const { min, max } = getDatePickerPropsFor5Plus()
                    
                    return (
                      <Input
                        {...field}
                        id="dateOfBirth"
                        type="date"
                        min={min}
                        max={max}
                        className="h-11 bg-muted/60 border-border/60 text-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                        required
                      />
                    )
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  You must be at least 5 years old to create an account.
                </p>
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-400">{errors.dateOfBirth.message}</p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-semibold text-sm">
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
                        className="pr-10 h-11 bg-muted/60 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30 rounded-xl"
                        disabled={isLoading}
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? <FlaticonIcon name="eye-off" className="h-5 w-5" aria-hidden /> : <FlaticonIcon name="eye" className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter (A-Z)</li>
                    <li>One lowercase letter (a-z)</li>
                    <li>One number (0-9)</li>
                  </ul>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                  )}
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-foreground font-semibold text-sm">I want to join as a:</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center space-x-3 p-4 border border-border/60 rounded-2xl hover:border-orange-500/40 hover:bg-primary/5 transition-all duration-200 bg-muted/40 backdrop-blur-sm cursor-pointer">
                        <RadioGroupItem value="seeker" id="seeker" />
                        <Label htmlFor="seeker" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                              <FlaticonIcon name="users" className="w-5 h-5 text-orange-400" aria-hidden />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">Opportunity Seeker</div>
                              <div className="text-xs text-muted-foreground">Find and apply for opportunities</div>
                            </div>
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-4 border border-border/60 rounded-2xl hover:border-orange-500/40 hover:bg-primary/5 transition-all duration-200 bg-muted/40 backdrop-blur-sm cursor-pointer">
                        <RadioGroupItem value="provider" id="provider" />
                        <Label htmlFor="provider" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                              <Target className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">Opportunity Provider</div>
                              <div className="text-xs text-muted-foreground">Post opportunities and events</div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.role && (
                  <p className="text-sm text-red-400">{errors.role.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                <FlaticonIcon name="user-plus" className="w-4 h-4 mr-2" aria-hidden />
                Create Account
              </Button>
            </form>

            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <div>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </div>
              <p className="text-xs max-w-sm">
                By creating an account, you agree to our{' '}
                <Link
                  href="/privacy-policy"
                  className="text-orange-400 hover:text-orange-300 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

