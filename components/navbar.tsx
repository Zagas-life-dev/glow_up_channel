"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import { cn, glassSurfaceClass } from "@/lib/utils"
import {
  RiLogoutBoxRLine,
  RiMenuLine,
  RiCloseLine,
} from "react-icons/ri"

const routes = [
  { name: "Home", path: "/" },
  { name: "Sign up", path: "/signup" },
  { name: "Privacy Policy", path: "/privacy-policy" },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { hideNavbar } = usePage()
  const { normalizedUser, isLoading, logout } = useAuth()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (target.closest('[data-navbar]')) return
      setIsMenuOpen(false)
    }
    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

  if (hideNavbar) {
    return null
  }

  return (
    <div className="w-full">
      <header className="fixed top-4 left-4 right-4 z-50" data-navbar>
        <div className={cn(glassSurfaceClass("max-w-7xl mx-auto rounded-2xl sm:rounded-3xl px-4 sm:px-6 lg:px-8"))}>
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
                <Image
                  src="/images/logo-icon-transparent.png"
                  alt="GlowUp"
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-200"
                  priority
                />
              </div>
              <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                GlowUp
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {routes.map((route) => {
                const isActive = pathname === route.path
                return (
                  <Link
                    key={route.path}
                    href={route.path}
                    className={cn(glassSurfaceClass("px-3 lg:px-4 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all duration-200 border"),
                      isActive
                        ? "text-orange-600 bg-orange-500/25 backdrop-blur-md border-orange-500/40 shadow-sm"
                        : "text-gray-300 border-transparent hover:text-orange-600 hover:bg-orange-500/20 hover:backdrop-blur-md hover:border-orange-500/30"
                    )}
                  >
                    {route.name}
                  </Link>
                )
              })}
            </nav>

            <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
              {isLoading ? (
                <div className="flex items-center space-x-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              ) : normalizedUser ? (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={logout}
                    variant="ghost"
                    className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-500/20 hover:backdrop-blur-md border border-transparent"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button asChild className="px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-semibold bg-primary hover:bg-primary/90 text-foreground shadow-lg shadow-primary/25 border border-orange-500/30 backdrop-blur-sm">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(!isMenuOpen)
              }}
              className="md:hidden p-2 rounded-full text-gray-600 hover:bg-muted hover:text-gray-800 transition-all duration-200 touch-manipulation"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <RiCloseLine className="h-5 w-5 sm:h-6 sm:w-6" aria-label="Close menu" />
              ) : (
                <RiMenuLine className="h-5 w-5 sm:h-6 sm:w-6" aria-label="Open menu" />
              )}
            </button>
          </div>

          {isMenuOpen && (
            <div
              className={cn(
                glassSurfaceClass("rounded-2xl sm:rounded-3xl px-3 sm:px-4 pb-4 sm:pb-6 pt-2"),
                " left-4 right-4 top-[5.5rem] z-40 mx-auto max-w-7xl md:hidden"
              )}
            >
                <nav className="space-y-1 sm:space-y-2 py-2">
                {routes.map((route) => {
                  const isActive = pathname === route.path
                  return (
                    <Link
                      key={route.path}
                      href={route.path}
                      className={cn(
                        "block px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg font-medium rounded-xl transition-all duration-200 touch-manipulation",
                        isActive
                          ? "text-orange-600 bg-orange-500/25 backdrop-blur-md border border-orange-500/40 shadow-sm"
                          : "text-gray-700 border border-transparent hover:text-orange-600 hover:bg-orange-500/20 hover:backdrop-blur-md hover:border-orange-500/30"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {route.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="pt-4 border-t border-border/60 space-y-2">
                {isLoading ? (
                  <div className="flex items-center space-x-3 p-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                ) : normalizedUser ? (
                  <>
                    <Button
                      onClick={() => { logout(); setIsMenuOpen(false) }}
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-500/20 hover:backdrop-blur-md py-3 sm:py-4 text-base sm:text-lg touch-manipulation rounded-xl"
                    >
                      <RiLogoutBoxRLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-foreground rounded-xl py-3 sm:py-4 text-base sm:text-lg font-semibold touch-manipulation shadow-lg border border-orange-500/30 backdrop-blur-sm">
                    <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
