"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function WaitlistSignupPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/signup")
  }, [router])
  return null
}
