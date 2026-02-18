"use client"

<<<<<<< HEAD
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaticonIcon } from '@/components/ui/flaticon-icon';
=======
import { useEffect } from "react"
import Image from "next/image"
import { Sparkles, ArrowRight } from "lucide-react"
>>>>>>> cbec9f4b7df93a7bf0e86ccf74af4dc65c2b65a6

const REDIRECT_URL = "https://www.glowupchannel.com"

export default function RedirectPage() {
  useEffect(() => {
    // Redirect after a brief delay to show the message
    const timer = setTimeout(() => {
      window.location.href = REDIRECT_URL
    }, 2000) // 2 second delay

    return () => clearTimeout(timer)
  }, [])

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border bg-card backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your GlowUp account
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

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <div className="relative">
                <FlaticonIcon name="envelope" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
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
                <FlaticonIcon name="lock" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:ring-orange-500/50"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? <FlaticonIcon name="eye-off" className="w-4 h-4" aria-hidden /> : <FlaticonIcon name="eye" className="w-4 h-4" aria-hidden />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground font-semibold rounded-xl transition-all duration-200"
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Links */}
          <div className="space-y-3 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Forgot your password?
            </Link>
            <div className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </div>
=======
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <Image
              src="/images/logo-icon-transparent.png"
              alt="Glow Up Channel"
              fill
              className="object-contain"
              priority
            />
>>>>>>> cbec9f4b7df93a7bf0e86ccf74af4dc65c2b65a6
          </div>
        </div>

        {/* Main Text */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
          Redirecting...
        </h1>
        
        <div className="flex items-center justify-center gap-3 mb-6">
          <p className="text-xl sm:text-2xl text-white/70">
            Taking you to
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
          <a 
            href={REDIRECT_URL}
            className="text-xl sm:text-2xl lg:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 font-semibold hover:from-orange-300 hover:to-orange-400 transition-colors"
          >
            app.studybetterai.com
          </a>
          <ArrowRight className="w-5 h-5 text-orange-500 animate-pulse" />
        </div>

        <p className="text-sm text-white/50 mb-8">
          If you are not redirected automatically,{" "}
          <a 
            href={REDIRECT_URL}
            className="text-orange-500 hover:text-orange-400 underline"
          >
            click here
          </a>
        </p>

        {/* Loading indicator */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.1),_transparent_70%)] pointer-events-none -z-10" />
    </div>
  )
}
