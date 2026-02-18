"use client"

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import Image from 'next/image'
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
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => calculateAge(date) >= 5, 'You must be at least 5 years old to sign up'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  role: z.enum(['seeker', 'provider'], {
    required_error: 'Please select a role',
  }),
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { registerOpportunitySeeker, registerOpportunityPoster } = useAuth()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    setError('')

    try {
      // Trim and validate required fields
      const firstName = data.firstName.trim()
      const lastName = data.lastName.trim()
      const dateOfBirth = data.dateOfBirth

      if (data.role === 'seeker') {
        await registerOpportunitySeeker(data.email, data.password, firstName, lastName, dateOfBirth)
        // Redirect to email verification page after successful signup
        router.push('/verify-email')
      } else {
        // Provider registration - redirect to email verification page
        await registerOpportunityPoster(data.email, data.password, firstName, lastName, dateOfBirth)
        router.push('/verify-email')
      }
    } catch (err: any) {
      // Handle specific validation errors from backend
      if (err.message && err.message.includes('Validation failed')) {
        setError('Please check your password requirements: at least 8 characters with uppercase, lowercase, and number.')
      } else if (err.message && err.message.includes('already exists')) {
        setError('An account with this email already exists. Please try logging in instead.')
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.')
      }
      console.error('Signup error:', err)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border bg-card backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
            Join GlowUp
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              <FlaticonIcon name="exclamation" className="w-4 h-4" aria-hidden />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground font-medium">
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
                      className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
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
                <Label htmlFor="lastName" className="text-foreground font-medium">
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
                      className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
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
              <Label htmlFor="email" className="text-foreground font-medium">
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
                    placeholder="Enter your email"
                    className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-foreground font-medium">
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
                      className="h-12 bg-muted border-border text-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
                      disabled={isLoading}
                      required
                    />
                  )
                }}
              />
              <p className="text-xs text-muted-foreground">
                You must be at least 5 years old to create an account
              </p>
              {errors.dateOfBirth && (
                <p className="text-sm text-red-400">{errors.dateOfBirth.message}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
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
                      className="pr-10 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
                      disabled={isLoading}
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-muted-foreground"
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
              <Label className="text-foreground font-medium">I want to join as a:</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:border-orange-500/30 hover:bg-primary/5 transition-colors bg-card">
                      <RadioGroupItem value="seeker" id="seeker" />
                      <Label htmlFor="seeker" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <FlaticonIcon name="users" className="w-5 h-5 text-primary" aria-hidden />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Opportunity Seeker</div>
                            <div className="text-sm text-muted-foreground">Find and apply for opportunities</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:border-orange-500/30 hover:bg-primary/5 transition-colors bg-card">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Opportunity Provider</div>
                            <div className="text-sm text-muted-foreground">Post opportunities and events</div>
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
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground font-semibold rounded-xl transition-all duration-200"
              disabled={isLoading}
            >
              <FlaticonIcon name="user-plus" className="w-4 h-4 mr-2" aria-hidden />
              Create Account
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 