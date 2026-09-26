"use client"

import { useAuth } from '@/lib/auth-context'
import { AuthRequiredCard } from '@/components/auth-required-card'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10" role="status" aria-label="Checking access">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-up-orange border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>
    return (
      <AuthRequiredCard
        title="Sign in to continue"
        description="This part of UP lives in your account."
        showSignUp
      />
    )
  }

  return <>{children}</>
}
