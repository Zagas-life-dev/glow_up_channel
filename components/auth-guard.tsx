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
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-rose-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-md">
          <div className="w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-center mx-auto mb-4">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-semibold text-foreground">Checking access</p>
            <p className="text-xs text-muted-foreground mt-1">One moment...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>
    return (
      <AuthRequiredCard
        title="Authentication required"
        showSignUp
      />
    )
  }

  return <>{children}</>
}
