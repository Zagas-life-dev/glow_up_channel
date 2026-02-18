"use client"

import Image from "next/image"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"

export default function UnderConstructionPage() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
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
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
          Under Construction
        </h1>
        
        <div className="flex items-center justify-center gap-2 mb-6">
          <FlaticonIcon name="sparkles" className="w-6 h-6 text-primary animate-pulse" aria-hidden />
          <p className="text-xl sm:text-2xl lg:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 font-semibold">
            Prepare for v3
          </p>
          <FlaticonIcon name="sparkles" className="w-6 h-6 text-primary animate-pulse" aria-hidden />
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.1),_transparent_70%)] pointer-events-none -z-10" />
    </div>
  )
}
