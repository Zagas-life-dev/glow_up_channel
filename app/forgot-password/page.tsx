"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
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

  if (codeSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Code Sent!
            </CardTitle>
            <CardDescription className="text-gray-600">
              We've sent a 6-digit password reset code to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Please check your email and enter the code on the next page to reset your password.
            </p>
            <Button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              Continue to Reset Password
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="h-11"
                    disabled={isLoading}
                    autoFocus
                  />
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Send Reset Code'
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-gray-200">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

