"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const [showFallback, setShowFallback] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return

    // If not authenticated, show fallback
    if (!isAuthenticated) {
      setShowFallback(true)
    } else {
      setShowFallback(false)
    }
  }, [isAuthenticated, isLoading])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show fallback if not authenticated
  if (showFallback) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            {/* Lock Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h1>

            {/* Description */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              You need to sign in or create an account to access this content. 
              Join our community to discover amazing opportunities, events, jobs, and resources.
            </p>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Link href="/signup" className="block">
                <Button 
                  size="lg" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href="/login" className="block">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Benefits */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">What you'll get:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Access to all content
                </div>
                <div className="flex items-center text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Save & like items
                </div>
                <div className="flex items-center text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Personalized recommendations
                </div>
                <div className="flex items-center text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Track your progress
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is authenticated, show content
  return <>{children}</>
}
