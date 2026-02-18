"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaticonIcon } from '@/components/ui/flaticon-icon';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* Left: Brand + context (inspired by QR dashboard layout) */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Secure GlowUp login
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome back to{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                GlowUp
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              Sign in to pick up where you left off, track your opportunities, and stay
              locked in on your goals.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="sparkles" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Personalized feed</span>
              </div>
              <p className="text-muted-foreground">
                See opportunities, jobs, and events tuned to your profile.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="lock" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Account protected</span>
              </div>
              <p className="text-muted-foreground">
                Your data is encrypted and secured behind your login.
              </p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border/70 p-3 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FlaticonIcon name="target" className="w-4 h-4" aria-hidden />
                <span className="font-medium">Stay locked in</span>
              </div>
              <p className="text-muted-foreground">
                Keep your progress, playlists, and saved items in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Login card */}
        <Card className="w-full border border-border bg-card/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 text-left">
            <CardTitle className="text-2xl font-semibold">
              Sign in
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your details to access your GlowUp dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <FlaticonIcon name="exclamation" className="w-4 h-4" aria-hidden />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <FlaticonIcon
                    name="envelope"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
                    aria-hidden
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/40"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <FlaticonIcon
                    name="lock"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/40"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <FlaticonIcon name="eye-off" className="w-4 h-4" aria-hidden />
                    ) : (
                      <FlaticonIcon name="eye" className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground font-semibold rounded-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Signing you in…' : 'Sign In'}
              </Button>
            </form>

            {/* Links */}
            <div className="space-y-3 text-left text-sm">
              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Forgot your password?
                </Link>
                <span className="text-xs text-muted-foreground">
                  New here?{" "}
                  <Link
                    href="/signup"
                    className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                  >
                    Create account
                  </Link>
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                By signing in, you agree to our{" "}
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
