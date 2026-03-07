"use client"

import { useEffect, useState } from "react"
import NewsletterSignupForm from "@/components/forms/newsletter-signup-form"
import { useAuth } from "@/lib/auth-context"

const AUTH_DELAY_MS = 10 * 60 * 1000 // 10 minutes
const STORAGE_KEY = "glowup-newsletter-popup-dismissed"

export default function NewsletterPopup() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only show for authenticated users, after 10 min delay, and not already dismissed this session
    if (!isAuthenticated) return
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "true") return
    } catch {
      // ignore
    }
    const timer = setTimeout(() => setOpen(true), AUTH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isAuthenticated])

  const handleClose = () => {
    setOpen(false)
    try {
      sessionStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // ignore
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-lg shadow-xl p-6 max-w-lg w-full relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={handleClose}
          aria-label="Close newsletter popup"
        >
          &times;
        </button>
        <NewsletterSignupForm onSuccess={handleClose} />
      </div>
    </div>
  )
}
