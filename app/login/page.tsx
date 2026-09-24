"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RiEyeLine, RiEyeOffLine, RiFocus3Line, RiLockLine, RiMailLine, RiSparkling2Line } from 'react-icons/ri';
import { AuthShell, AuthHeading, AuthError } from '@/components/up/auth-shell';

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
    <AuthShell
      badge="Secure UP login"
      headline={<>Welcome back to <em>UP</em></>}
      subtitle="Sign in to pick up where you left off, track your opportunities, and stay locked in on your goals."
      points={[
        { icon: RiSparkling2Line, title: "Personalized feed", text: "See opportunities, jobs, and events tuned to your profile." },
        { icon: RiLockLine, title: "Account protected", text: "Your data is encrypted and secured behind your login." },
        { icon: RiFocus3Line, title: "Stay locked in", text: "Keep your progress, playlists, and saved items in one place." },
      ]}
    >
      <AuthHeading title="Sign in">Enter your details to access your UP dashboard.</AuthHeading>

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-[7px]">
          <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
            Email
          </Label>
          <div className="relative">
            <RiMailLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 pl-11"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-[7px]">
          <Label htmlFor="password" className="text-[13px] font-bold text-foreground">
            Password
          </Label>
          <div className="relative">
            <RiLockLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pl-11 pr-11"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? <RiEyeOffLine className="h-4 w-4" aria-hidden /> : <RiEyeLine className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <Button type="submit" className="h-[52px] w-full text-base" disabled={isLoading}>
          {isLoading ? 'Signing you in…' : 'Sign in'}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="font-semibold text-up-orange-ink hover:underline">
            Forgot your password?
          </Link>
          <span className="text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-bold text-foreground hover:underline">
              Create account
            </Link>
          </span>
        </div>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        By signing in, you agree to our{" "}
        <Link href="/privacy-policy" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  )
}
