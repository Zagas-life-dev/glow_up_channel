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
import { Eye, EyeOff, UserPlus, AlertCircle, Target, Users } from 'lucide-react'

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  dob: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      // Adjust age if birthday hasn't occurred this year
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age
      
      return actualAge >= 16
    }, 'You must be at least 16 years old to sign up'),
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
      if (data.role === 'seeker') {
        await registerOpportunitySeeker(data.email, data.password)
        // Redirect to homepage after successful signup
        router.push('/')
      } else {
        // Provider registration - redirect to homepage
        await registerOpportunityPoster(data.email, data.password, data.firstName, data.lastName)
        router.push('/')
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Join Glow Up Channel
          </CardTitle>
          <CardDescription className="text-gray-600">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-700 font-medium">
                  First Name
                </Label>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="firstName"
                      placeholder="First name"
                      className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                  )}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-700 font-medium">
                  Last Name
                </Label>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="lastName"
                      placeholder="Last name"
                      className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                  )}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
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
                    className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="text-gray-700 font-medium">
                Date of Birth
              </Label>
              <Controller
                name="dob"
                control={control}
                render={({ field }) => {
                  // Calculate the maximum date (16 years ago from today)
                  const today = new Date()
                  const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
                  const maxDateString = maxDate.toISOString().split('T')[0]
                  
                  return (
                    <Input
                      {...field}
                      id="dob"
                      type="date"
                      max={maxDateString}
                      className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                  )
                }}
              />
              <p className="text-xs text-gray-500">
                You must be at least 16 years old to create an account
              </p>
              {errors.dob && (
                <p className="text-sm text-red-600">{errors.dob.message}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
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
                      className="pr-10 h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                </ul>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">I want to join as a:</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
                      <RadioGroupItem value="seeker" id="seeker" />
                      <Label htmlFor="seeker" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Opportunity Seeker</div>
                            <div className="text-sm text-gray-600">Find and apply for opportunities</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Opportunity Provider</div>
                            <div className="text-sm text-gray-600">Post opportunities and events</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 