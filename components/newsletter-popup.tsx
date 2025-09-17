"use client"

import { useEffect, useState } from "react"
import NewsletterSignupForm from "@/components/forms/newsletter-signup-form"

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Show popup on first load after short delay
    const timer = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(timer)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={() => setOpen(false)}
          aria-label="Close newsletter popup"
        >
          &times;
        </button>
        <NewsletterSignupForm onSuccess={() => setOpen(false)} />
      </div>
    </div>
  )
}
