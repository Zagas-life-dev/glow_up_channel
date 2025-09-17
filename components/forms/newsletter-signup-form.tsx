"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface NewsletterSignupFormProps {
  onSuccess?: () => void
}

export default function NewsletterSignupForm({ onSuccess }: NewsletterSignupFormProps) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", agree: false })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.agree) {
      toast.error("Please fill all fields and agree to the terms.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to subscribe")
      toast.success("Thank you for subscribing!")
      setForm({ firstName: "", lastName: "", email: "", agree: false })
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="max-w-md ">
      <CardHeader>
        <CardTitle>Get A Personalized Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="agree" name="agree" checked={form.agree} onChange={handleChange} required />
            <Label htmlFor="agree" className="text-sm">I agree to the <a href="/terms" className="text-blue-500 underline" target="_blank">Terms & Conditions</a></Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Submitting..." : "Subscribe"}</Button>
        </form>
      </CardContent>

      </div>
  )
}
