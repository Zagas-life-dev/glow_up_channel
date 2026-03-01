"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import {
  RiArrowDownSLine,
  RiSearchLine,
  RiUserLine,
  RiBriefcaseLine,
  RiSettings3Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiCloseLine,
  RiCalendarLine,
  RiBook2Line,
  RiGroupLine,
} from "react-icons/ri"

const routes = [
  { name: "Home", path: "/", description: "Welcome to GlowUp" },
  { 
    name: "Opportunities", 
    path: "/opportunities", 
    description: "Find your next opportunity",
    dropdown: [
      { name: "All Opportunities", path: "/opportunities", description: "Browse all opportunities", iconName: "lightbulb" },
      { name: "Internships", path: "/opportunities?type=internship", description: "Find internship positions", iconName: "book" },
      { name: "Freelance", path: "/opportunities?type=freelance", description: "Freelance projects", iconName: "briefcase" },
      { name: "Scholarships", path: "/opportunities?type=scholarship", description: "Educational funding", iconName: "book" },
    ]
  },
  { 
    name: "Jobs", 
    path: "/jobs", 
    description: "Find your dream job",
    dropdown: [
      { name: "All Jobs", path: "/jobs", description: "Browse all job listings", iconName: "briefcase" },
      { name: "Full Time", path: "/jobs?type=full-time", description: "Full-time positions", iconName: "briefcase" },
      { name: "Part Time", path: "/jobs?type=part-time", description: "Part-time positions", iconName: "briefcase" },
      { name: "Remote", path: "/jobs?type=remote", description: "Remote work opportunities", iconName: "briefcase" },
    ]
  },
  { 
    name: "Events", 
    path: "/events", 
    description: "Connect and learn",
    dropdown: [
      { name: "All Events", path: "/events", description: "Browse all events", iconName: "calendar" },
      { name: "Workshops", path: "/events?type=workshop", description: "Skill-building workshops", iconName: "users" },
      { name: "Networking", path: "/events?type=networking", description: "Professional networking", iconName: "users" },
      { name: "Webinars", path: "/events?type=webinar", description: "Online learning sessions", iconName: "calendar" },
    ]
  },
  { 
    name: "Resources", 
    path: "/resources", 
    description: "Free learning materials",
    dropdown: [
      { name: "All Resources", path: "/resources", description: "Browse all resources", iconName: "book" },
      { name: "Career Guides", path: "/resources?type=career-guide", description: "Professional development", iconName: "book" },
      { name: "Skill Development", path: "/resources?type=skill-development", description: "Learn new skills", iconName: "book" },
      { name: "Industry Insights", path: "/resources?type=industry-insight", description: "Market knowledge", iconName: "book" },
    ]
  },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const pathname = usePathname()
  const { hideNavbar } = usePage()
  const { normalizedUser, isLoading, logout } = useAuth()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Don't close if clicking on navbar elements or dropdown content
      if (target.closest('[data-navbar]') || target.closest('[data-dropdown-content]')) {
        return
      }
      
      setIsMenuOpen(false)
      setOpenDropdown(null)
    }

    if (isMenuOpen || openDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen, openDropdown])

  // Hide navbar on certain pages
  if (hideNavbar) {
    return null
  }

  return (
    <div className="w-full">
    <header className="fixed top-4 left-4 right-4 z-50" data-navbar>
        <div className="max-w-7xl mx-auto bg-card/80 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-black/5 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
                <Image
                  src="/images/Yellow and Black Modern Media Company Logo (14).png"
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {routes.map((route) => (
                <div key={route.path} className="relative">
                  {route.dropdown ? (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdown(openDropdown === route.name ? null : route.name)
                        }}
                        className={`flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all duration-200 ${
                          pathname === route.path || pathname.startsWith(route.path + '/')
                            ? 'text-orange-600 bg-orange-50'
                            : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                        }`}
                      >
                        {route.name}
                        <RiArrowDownSLine
                          className={`ml-1 lg:ml-2 h-3 w-3 lg:h-4 lg:w-4 transition-transform duration-200 ${
                            openDropdown === route.name ? 'rotate-180' : ''
                          }`}
                          aria-hidden
                        />
                      </button>

                      {/* Dropdown */}
                      {openDropdown === route.name && (
                        <div className="absolute top-full left-0 mt-2 w-64 lg:w-72 bg-card rounded-2xl border border-gray-200 shadow-xl z-50" data-dropdown-content>
                          <div className="p-2">
                            {route.dropdown?.map((item) => (
                                <Link
                                  key={item.path}
                                  href={item.path}
                                  className="flex items-start p-3 rounded-xl hover:bg-orange-50 transition-all duration-200 group"
                                  onClick={() => {
                                    setOpenDropdown(null)
                                    setIsMenuOpen(false)
                                  }}
                                >
                                  {item.iconName === "lightbulb" && (
                                    <RiBook2Line className="h-5 w-5 text-primary mt-0.5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "book" && (
                                    <RiBook2Line className="h-5 w-5 text-primary mt-0.5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "briefcase" && (
                                    <RiBriefcaseLine className="h-5 w-5 text-primary mt-0.5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "calendar" && (
                                    <RiCalendarLine className="h-5 w-5 text-primary mt-0.5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "users" && (
                                    <RiGroupLine className="h-5 w-5 text-primary mt-0.5 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  <div>
                                    <div className="font-medium text-foreground group-hover:text-orange-600 transition-colors duration-200">
                                      {item.name}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                      {item.description}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={route.path}
                      className={`px-3 lg:px-4 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all duration-200 ${
                        pathname === route.path
                          ? 'text-orange-600 bg-orange-50'
                          : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {route.name}
                    </Link>
                  )}
                </div>
              ))}
        </nav>

            {/* Search Button */}
            <div className="hidden md:flex items-center">
              <Button asChild variant="ghost" className="px-3 lg:px-4 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
                <Link href="/search">
                  <RiSearchLine className="h-4 w-4 lg:h-5 lg:w-5 mr-2" aria-hidden />
                </Link>
              </Button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
              {isLoading ? (
                <div className="flex items-center space-x-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              ) : normalizedUser ? (
                // Logged in user actions
                <div className="flex items-center space-x-2">
                  {/* <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50 rounded-full">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <FlaticonIcon name="user" className="h-4 w-4 text-foreground" aria-hidden />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{user.email}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</div>
                    </div>
                  </div> */}
                  <Button asChild variant="ghost" className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-orange-600 hover:text-orange-400 hover:bg-orange-50 transition-all duration-200">
                    <Link href="/dashboard">
                      <RiUserLine className="h-4 w-4 lg:h-5 lg:w-5 mr-2" aria-hidden />
                      Dashboard
                    </Link>
                  </Button>
              {/* {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                <Button asChild variant="ghost" className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
                  <Link href="/dashboard/provider">
                    <FlaticonIcon name="briefcase" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" aria-hidden />
                    Provider
                  </Link>
                </Button>
              )} */}
                  {/* <Button asChild variant="ghost" className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
                    <Link href="/profile/settings">
                      <FlaticonIcon name="settings" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" aria-hidden />
                      Settings
                    </Link>
                  </Button>
                  <Button 
                    onClick={logout}
                    variant="ghost" 
                    className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    <FlaticonIcon name="sign-out" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" aria-hidden />
                    Sign Out
                  </Button> */}
                </div>
              ) : (
                // Logged out user actions
                <div className="flex items-center space-x-2">
                  <Button asChild variant="ghost" className="px-4 lg:px-5 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-semibold bg-primary hover:bg-primary/90 text-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
      {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-lg rounded-b-2xl sm:rounded-b-3xl border-t border-border shadow-lg px-3 sm:px-4 pb-4 sm:pb-6 pt-2 max-h-[80vh] overflow-y-auto z-40">
              <nav className="space-y-1 sm:space-y-2">
            {routes.map((route) => (
                  <div key={route.path}>
                    {route.dropdown ? (
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDropdown(openDropdown === route.name ? null : route.name)
                          }}
                          className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 text-left text-base sm:text-lg font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200 touch-manipulation"
                        >
                          {route.name}
                          <RiArrowDownSLine
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${
                              openDropdown === route.name ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                          />
                        </button>
                        
                        {openDropdown === route.name && (
                          <div className="mt-2 ml-4 space-y-1" data-dropdown-content>
                            {route.dropdown?.map((item) => (
                                <Link
                                  key={item.path}
                                  href={item.path}
                                  className="flex items-center p-3 rounded-lg hover:bg-orange-50 transition-all duration-200 group"
                                  onClick={() => setIsMenuOpen(false)}
                                >
                                  {item.iconName === "lightbulb" && (
                                    <RiBook2Line className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "book" && (
                                    <RiBook2Line className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "briefcase" && (
                                    <RiBriefcaseLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "calendar" && (
                                    <RiCalendarLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  {item.iconName === "users" && (
                                    <RiGroupLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden />
                                  )}
                                  <div>
                                    <div className="font-medium text-foreground group-hover:text-orange-600 text-sm sm:text-base">
                                      {item.name}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-500">
                                      {item.description}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
              <Link
                href={route.path}
                className={`block px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg font-medium rounded-xl transition-all duration-200 touch-manipulation ${
                  pathname === route.path 
                    ? 'text-orange-600 bg-orange-50' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {route.name}
              </Link>
                    )}
                  </div>
                ))}
              </nav>
              
              {/* Mobile Search */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-border">
                <Button asChild variant="ghost" className="w-full justify-start text-gray-700 hover:text-orange-600 hover:bg-orange-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation">
                  <Link href="/search" onClick={() => setIsMenuOpen(false)}>
                    <RiSearchLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                    Search
                  </Link>
                </Button>
              </div>
              
              {/* Mobile Actions */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border space-y-2 sm:space-y-3">
                {isLoading ? (
                  <div className="flex items-center space-x-3 p-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
              ) : normalizedUser ? (
                  // Logged in user mobile actions
                  <>
                    <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-xl mb-2">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <RiUserLine className="h-5 w-5 text-foreground" aria-hidden />
                      </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{normalizedUser.email}</div>
                          <div className="text-sm text-gray-500 capitalize">{normalizedUser.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <Button asChild variant="ghost" className="w-full justify-start text-gray-700 hover:text-orange-600 hover:bg-orange-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation">
                      <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <RiUserLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                        Dashboard
                      </Link>
                    </Button>
                    {(normalizedUser?.role === 'opportunity_poster' || normalizedUser?.role === 'admin' || normalizedUser?.role === 'super_admin') && (
                      <Button asChild variant="ghost" className="w-full justify-start text-gray-700 hover:text-orange-600 hover:bg-orange-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation">
                        <Link href="/dashboard/provider" onClick={() => setIsMenuOpen(false)}>
                          <RiBriefcaseLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                          Provider Dashboard
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" className="w-full justify-start text-gray-700 hover:text-orange-600 hover:bg-orange-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation">
                      <Link href="/profile/settings" onClick={() => setIsMenuOpen(false)}>
                        <RiSettings3Line className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                        Settings
                      </Link>
                    </Button>
                    <Button 
                      onClick={() => {
                        logout()
                        setIsMenuOpen(false)
                      }}
                      variant="ghost" 
                      className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation"
                    >
                      <RiLogoutBoxRLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" aria-hidden />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  // Logged out user mobile actions
                  <>
                    <Button asChild variant="ghost" className="w-full justify-start text-gray-700 hover:text-orange-600 hover:bg-orange-50 py-3 sm:py-4 text-base sm:text-lg touch-manipulation">
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild className="w-full bg-primary hover:bg-primary/90 text-foreground rounded-full py-3 sm:py-4 text-base sm:text-lg font-semibold touch-manipulation">
                      <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
    </header>
    </div>
  )
}
