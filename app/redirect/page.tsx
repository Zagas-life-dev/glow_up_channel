"use client"

import { useEffect } from "react"
import Image from "next/image"
import { Sparkles, ArrowRight } from "lucide-react"

const REDIRECT_URL = "https://app.studybetterai.com"

export default function RedirectPage() {
  useEffect(() => {
    // Redirect after a brief delay to show the message
    const timer = setTimeout(() => {
      window.location.href = REDIRECT_URL
    }, 2000) // 2 second delay

    return () => clearTimeout(timer)
  }, [])

  return (
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
