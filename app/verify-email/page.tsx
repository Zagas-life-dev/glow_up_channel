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
import { Mail, CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react'
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
        router.push('/dashboard')
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Email Verified!
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your email address has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              Go to Dashboard
            </Button>
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
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-gray-600">
            {email ? (
              <span>We&apos;ve sent a 6-digit verification code to <strong>{email}</strong></span>
            ) : (
              'We\'ve sent a 6-digit verification code to your email address'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-gray-700 font-medium text-center block">
                Enter Verification Code
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
                    className="h-16 text-center text-3xl tracking-widest font-mono border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    disabled={isLoading}
                    autoFocus
                  />
                )}
              />
              {errors.code && (
                <p className="text-sm text-red-600 text-center">{errors.code.message}</p>
              )}
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify Email'
              )}
            </Button>
          </form>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendCode}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Resend Code'
              )}
            </Button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center w-full text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
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

