"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { AdminLayout } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { RiMailLine, RiErrorWarningLine, RiMagicLine } from "react-icons/ri"
import { cn } from "@/lib/utils"
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email/templates"

const TONE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "Professional", label: "Professional" },
  { value: "Friendly", label: "Friendly" },
  { value: "Urgent", label: "Urgent" },
  { value: "Casual", label: "Casual" },
]

const CAMPAIGN_TYPE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "Weekly digest", label: "Weekly digest" },
  { value: "Product launch", label: "Product launch" },
  { value: "Event promo", label: "Event promo" },
  { value: "General", label: "General" },
]

export default function MarketingEmailDesignerPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()

  const [subject, setSubject] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [body, setBody] = useState("")
  const [recipients, setRecipients] = useState("")
  const [selectedDesignId, setSelectedDesignId] = useState<EmailTemplateId>("minimal")
  const [tone, setTone] = useState("any")
  const [campaignType, setCampaignType] = useState("any")
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>("")
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: selectedDesignId,
          subject: subject || "Your subject",
          previewText: previewText || undefined,
          content: body || "Email body will appear here.",
        }),
      })
      if (res.ok) {
        const html = await res.text()
        setPreviewHtml(html)
      }
    } catch {
      setPreviewHtml("")
    }
  }, [selectedDesignId, subject, previewText, body])

  useEffect(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = setTimeout(() => {
      fetchPreview()
      previewDebounceRef.current = null
    }, 400)
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    }
  }, [fetchPreview])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <RiErrorWarningLine className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Super admin privileges required for email marketing.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
            <Link href="/dashboard/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleGenerateWithAI = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/marketing/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
          tone: tone && tone !== "any" ? tone : undefined,
          campaignType: campaignType && campaignType !== "any" ? campaignType : undefined,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error("AI generation failed", {
          description: data?.error || "Failed to generate. Check GEMINI_API_KEY in .env.local.",
        })
        return
      }
      const data = await response.json()
      if (data.subject != null) setSubject(data.subject)
      if (data.body != null) setBody(data.body)
      if (data.suggestedDesignId) setSelectedDesignId(data.suggestedDesignId)
      toast.success("Email generated", {
        description: "You can edit the subject and body, then send a test.",
      })
    } catch (error: unknown) {
      toast.error("AI generation failed", {
        description: error instanceof Error ? error.message : "Something went wrong.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendTest = async () => {
    const trimmedRecipients = recipients
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean)

    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required")
      return
    }

    if (trimmedRecipients.length === 0) {
      toast.error("Add at least one recipient email")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/marketing/send-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          previewText: previewText.trim() || undefined,
          content: body,
          recipients: trimmedRecipients,
          designId: selectedDesignId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const errorMessage = data?.error || "Failed to send test email."
        toast.error("Error sending test", {
          description: errorMessage,
        })
        return
      }

      toast.success("Test email sent", {
        description: "Your marketing email idea was sent to the selected recipients.",
      })
    } catch (error: any) {
      toast.error("Error sending test", {
        description: error?.message || "Something went wrong. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AdminLayout
      pageTitle="Marketing email"
      pageSubtitle="Design & test"
      PageIcon={RiMailLine}
      backHref="/dashboard/admin"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Link href="/dashboard/admin" className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Marketing email designer</h1>
              <p className="text-sm text-muted-foreground">
                Draft, preview, and send test versions of your email campaigns.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-3">Design</h2>
              <p className="text-xs text-muted-foreground mb-3">Choose a template for how the email will look.</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {EMAIL_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedDesignId(t.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selectedDesignId === t.id
                        ? "border-orange-500 bg-orange-500/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-[11px] mt-0.5 opacity-90">{t.description}</span>
                  </button>
                ))}
              </div>

              <h2 className="text-sm font-semibold text-foreground mb-4">Compose</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tone (for AI)</label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="rounded-xl bg-muted/50 border-border text-foreground">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="rounded-lg">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Campaign type (for AI)</label>
                    <Select value={campaignType} onValueChange={setCampaignType}>
                      <SelectTrigger className="rounded-xl bg-muted/50 border-border text-foreground">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="rounded-lg">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating}
                    >
                      <RiMagicLine className={cn("w-4 h-4 mr-2", isGenerating && "animate-pulse")} />
                      {isGenerating ? "Generating..." : "Generate with AI"}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Subject
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="GlowUp: Fresh opportunities for this week"
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Preview line (optional)
                  </label>
                  <Input
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="A quick snapshot that shows in inbox previews."
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Body
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={"Write your email content...\n\nTip: Use short paragraphs and clear calls-to-action."}
                    rows={12}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-y"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Send test</h2>
              <p className="text-xs text-muted-foreground mb-2">
                Add one or more emails (comma, semicolon, or new-line separated). This will send using Amazon SES.
              </p>
              <Textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder={"you@example.com\nteammate@example.com"}
                rows={3}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-y"
              />
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-muted-foreground">
                  This is for internal tests only. For full campaigns, plug this template into your main sending flow.
                </p>
                <Button
                  size="sm"
                  className={cn(
                    "rounded-2xl px-4",
                    isSending ? "bg-primary/80" : "bg-primary hover:bg-primary/90"
                  )}
                  onClick={handleSendTest}
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : "Send test email"}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <RiMailLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Live preview
                  </p>
                  <p className="text-xs text-muted-foreground">
                    How your email will look with the selected design.
                  </p>
                </div>
              </div>
              <div className="border border-border rounded-2xl bg-muted/30 overflow-hidden">
                <iframe
                  title="Email preview"
                  sandbox="allow-same-origin"
                  srcDoc={previewHtml || "<p style='padding:24px;color:#9ca3af;font-size:14px;'>Loading preview…</p>"}
                  className="w-full min-h-[420px] border-0 bg-background"
                  style={{ height: "480px" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

