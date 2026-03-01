"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { AdminLayout } from "@/components/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiAddCircleLine,
  RiCalendarLine,
  RiBriefcaseLine,
  RiFocus3Line,
  RiBookOpenLine,
  RiExternalLinkLine,
  RiErrorWarningLine,
  RiCheckboxCircleLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import PageSkeleton from "@/components/skeletons/page-skeleton"

type ContentType = "event" | "job" | "opportunity" | "resource"

const CONTENT_TYPES: { id: ContentType; label: string; icon: typeof RiCalendarLine }[] = [
  { id: "event", label: "Event", icon: RiCalendarLine },
  { id: "job", label: "Job", icon: RiBriefcaseLine },
  { id: "opportunity", label: "Opportunity", icon: RiFocus3Line },
  { id: "resource", label: "Resource", icon: RiBookOpenLine },
]

const EVENT_TYPES = ["networking", "workshop", "conference", "webinar", "other"]
const JOB_TYPES = ["full-time", "part-time", "contract", "internship", "volunteer", "other"]
const OPPORTUNITY_CATEGORIES = ["scholarship", "fellowship", "grant", "competition", "program", "other"]
const RESOURCE_CATEGORIES = ["article", "video", "document", "course", "toolkit", "other"]

export default function AdminCreateContentPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [contentType, setContentType] = useState<ContentType>("event")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Common
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [resourceLink, setResourceLink] = useState("")

  // Event
  const [organizer, setOrganizer] = useState("")
  const [eventType, setEventType] = useState("networking")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [eventCity, setEventCity] = useState("")
  const [eventRemote, setEventRemote] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [price, setPrice] = useState("")

  // Job
  const [company, setCompany] = useState("")
  const [jobType, setJobType] = useState("full-time")
  const [appDeadline, setAppDeadline] = useState("")
  const [jobCity, setJobCity] = useState("")
  const [jobCountry, setJobCountry] = useState("")
  const [jobRemote, setJobRemote] = useState(false)
  const [salary, setSalary] = useState("")
  const [salaryPeriod, setSalaryPeriod] = useState("month")

  // Opportunity
  const [provider, setProvider] = useState("")
  const [opportunityCategory, setOpportunityCategory] = useState("scholarship")
  const [oppDeadline, setOppDeadline] = useState("")
  const [oppCity, setOppCity] = useState("")
  const [oppRemote, setOppRemote] = useState(false)
  const [eligibility, setEligibility] = useState("")
  const [oppAmount, setOppAmount] = useState("")

  // Resource
  const [author, setAuthor] = useState("")
  const [resourceCategory, setResourceCategory] = useState("article")
  const [resourceTags, setResourceTags] = useState("")

  // Benefits (optional) – event, job, opportunity only; one per line
  const [benefitsText, setBenefitsText] = useState("")

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setResourceLink("")
    setOrganizer("")
    setStartDate("")
    setEndDate("")
    setEventCity("")
    setCompany("")
    setAppDeadline("")
    setProvider("")
    setOppDeadline("")
    setAuthor("")
    setEligibility("")
    setOppAmount("")
    setSalary("")
    setPrice("")
    setBenefitsText("")
    setResourceTags("")
    setSuccess(false)
  }

  const parseBenefits = (): string[] =>
    benefitsText.trim() ? benefitsText.split(/\n/).map((b) => b.trim()).filter(Boolean) : []

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required."
    if (!description.trim()) return "Description is required."
    if (!resourceLink.trim()) return "Link to main resource is required so viewers can access it."
    const urlPattern = /^https?:\/\//
    if (!urlPattern.test(resourceLink.trim())) return "Link must start with http:// or https://"
    if (contentType === "event" && !startDate) return "Event start date is required."
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSubmitting(true)
    setSuccess(false)
    try {
      const basePayload = {
        title: title.trim(),
        description: description.trim(),
        url: resourceLink.trim(),
        status: "active" as const,
      }

      const benefitsList = parseBenefits()

      if (contentType === "event") {
        const start = startDate ? new Date(startDate).toISOString() : new Date().toISOString()
        await ApiClient.createEvent({
          ...basePayload,
          organizer: organizer.trim() || "GlowUp Diaries",
          type: eventType,
          eventType,
          isPaid,
          price: isPaid && price ? parseFloat(price) : undefined,
          currency: "NGN",
          location: {
            city: eventCity.trim() || undefined,
            isRemote: eventRemote,
          },
          dates: {
            startDate: start,
            endDate: endDate ? new Date(endDate).toISOString() : null,
          },
          ...(benefitsList.length > 0 && { financial: { benefits: benefitsList } }),
        })
      } else if (contentType === "job") {
        await ApiClient.createJob({
          ...basePayload,
          company: company.trim() || "Company",
          type: jobType,
          location: {
            city: jobCity.trim() || undefined,
            country: jobCountry.trim() || undefined,
            isRemote: jobRemote,
          },
          pay: salary ? { isPaid: true, amount: parseFloat(salary), period: salaryPeriod, currency: "NGN" } : { isPaid: false },
          dates: appDeadline ? { applicationDeadline: new Date(appDeadline).toISOString() } : undefined,
          ...(benefitsList.length > 0 && { benefits: benefitsList }),
        })
      } else if (contentType === "opportunity") {
        const hasAmount = oppAmount.trim() !== ""
        await ApiClient.createOpportunity({
          ...basePayload,
          provider: provider.trim() || "GlowUp Diaries",
          category: opportunityCategory,
          type: opportunityCategory,
          location: { isRemote: oppRemote, city: oppCity.trim() || undefined },
          requirements: eligibility.trim() ? { other: eligibility.trim() } : undefined,
          dates: oppDeadline ? { applicationDeadline: new Date(oppDeadline).toISOString() } : undefined,
          ...((hasAmount || benefitsList.length > 0) && {
            financial: {
              ...(hasAmount && { isPaid: true, amount: parseFloat(oppAmount), currency: "NGN" }),
              ...(benefitsList.length > 0 && { benefits: benefitsList }),
            },
          }),
        })
      } else {
        await ApiClient.createResource({
          title: basePayload.title,
          description: basePayload.description,
          author: author.trim() || "GlowUp Diaries",
          category: resourceCategory,
          url: basePayload.url,
          paymentLink: basePayload.url,
          tags: resourceTags.trim() ? resourceTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        })
      }

      setSuccess(true)
      toast.success("Content created", {
        description: "The item was created. It may need approval depending on backend settings.",
      })
      resetForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create content"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) return <PageSkeleton />
  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <RiErrorWarningLine className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Admin privileges required.</p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout
      pageTitle="Create content"
      pageSubtitle="Post event, job, opportunity, or resource"
      PageIcon={RiAddCircleLine}
      backHref="/dashboard/admin"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiAddCircleLine className="h-5 w-5 text-primary" />
              Post new content
            </CardTitle>
            <CardDescription>
              Create an event, job, opportunity, or resource. Add a link so viewers can access the main resource (registration, application, or content).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content type tabs */}
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  type="button"
                  variant={contentType === id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-xl",
                    contentType === id && "bg-primary hover:bg-primary/90"
                  )}
                  onClick={() => setContentType(id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Tech Conference 2025"
                  className="rounded-xl"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description for the listing."
                  rows={4}
                  className="rounded-xl resize-none"
                  required
                />
              </div>

              {/* Link to main resource — prominent */}
              <div className="space-y-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Label htmlFor="resourceLink" className="flex items-center gap-2 text-foreground">
                  <RiExternalLinkLine className="h-4 w-4 text-primary" />
                  Link where viewers access the main resource *
                </Label>
                <Input
                  id="resourceLink"
                  type="url"
                  value={resourceLink}
                  onChange={(e) => setResourceLink(e.target.value)}
                  placeholder="https://example.com/register or https://example.com/apply"
                  className="rounded-xl bg-background"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {contentType === "event" && "Registration or event page URL"}
                  {contentType === "job" && "Application or job page URL"}
                  {contentType === "opportunity" && "Application or opportunity page URL"}
                  {contentType === "resource" && "URL to the resource (article, video, document, etc.)"}
                </p>
              </div>

              {/* Type-specific fields */}
              {contentType === "event" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground">Event details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Organizer</Label>
                      <Input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="Organizer name" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Event type</Label>
                      <Select value={eventType} onValueChange={setEventType}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start date *</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" required />
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={eventCity} onChange={(e) => setEventCity(e.target.value)} placeholder="City" className="rounded-xl" />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input type="checkbox" id="eventRemote" checked={eventRemote} onChange={(e) => setEventRemote(e.target.checked)} className="rounded" />
                      <Label htmlFor="eventRemote">Remote / online</Label>
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input type="checkbox" id="isPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded" />
                      <Label htmlFor="isPaid">Paid event</Label>
                    </div>
                    {isPaid && (
                      <div className="space-y-2">
                        <Label>Price (NGN)</Label>
                        <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="rounded-xl" />
                      </div>
                    )}
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Benefits (optional)</Label>
                      <Textarea
                        value={benefitsText}
                        onChange={(e) => setBenefitsText(e.target.value)}
                        placeholder={"One per line, e.g.\nFree lunch\nHealth insurance\nRemote work"}
                        rows={3}
                        className="rounded-xl resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Shown in the feed only when added.</p>
                    </div>
                  </div>
                </div>
              )}

              {contentType === "job" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground">Job details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Job type</Label>
                      <Select value={jobType} onValueChange={setJobType}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {JOB_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Application deadline</Label>
                      <Input type="date" value={appDeadline} onChange={(e) => setAppDeadline(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={jobCity} onChange={(e) => setJobCity(e.target.value)} placeholder="City" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value={jobCountry} onChange={(e) => setJobCountry(e.target.value)} placeholder="Country" className="rounded-xl" />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input type="checkbox" id="jobRemote" checked={jobRemote} onChange={(e) => setJobRemote(e.target.checked)} className="rounded" />
                      <Label htmlFor="jobRemote">Remote</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary (optional)</Label>
                      <div className="flex gap-2">
                        <Input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Amount" className="rounded-xl" />
                        <Select value={salaryPeriod} onValueChange={setSalaryPeriod}>
                          <SelectTrigger className="w-28 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">/ month</SelectItem>
                            <SelectItem value="year">/ year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Benefits (optional)</Label>
                      <Textarea
                        value={benefitsText}
                        onChange={(e) => setBenefitsText(e.target.value)}
                        placeholder={"One per line, e.g.\nHealth insurance\nFlexible hours\nTraining budget"}
                        rows={3}
                        className="rounded-xl resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Shown in the feed only when added.</p>
                    </div>
                  </div>
                </div>
              )}

              {contentType === "opportunity" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground">Opportunity details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Organization name" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={opportunityCategory} onValueChange={setOpportunityCategory}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPPORTUNITY_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Application deadline</Label>
                      <Input type="date" value={oppDeadline} onChange={(e) => setOppDeadline(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={oppCity} onChange={(e) => setOppCity(e.target.value)} placeholder="City" className="rounded-xl" />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input type="checkbox" id="oppRemote" checked={oppRemote} onChange={(e) => setOppRemote(e.target.checked)} className="rounded" />
                      <Label htmlFor="oppRemote">Remote</Label>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Eligibility / requirements</Label>
                      <Textarea value={eligibility} onChange={(e) => setEligibility(e.target.value)} placeholder="Brief eligibility or requirements" rows={2} className="rounded-xl resize-none" />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Benefits (optional)</Label>
                      <Textarea
                        value={benefitsText}
                        onChange={(e) => setBenefitsText(e.target.value)}
                        placeholder={"One per line, e.g.\nStipend included\nMentorship\nCertificate"}
                        rows={3}
                        className="rounded-xl resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Shown in the feed only when added.</p>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Stipend / amount (NGN, optional)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={oppAmount}
                        onChange={(e) => setOppAmount(e.target.value)}
                        placeholder="Leave empty if this opportunity is free"
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        If you enter an amount, it will be treated as a paid opportunity; leave blank for free.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {contentType === "resource" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground">Resource details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author or source" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={resourceCategory} onValueChange={setResourceCategory}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESOURCE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input value={resourceTags} onChange={(e) => setResourceTags(e.target.value)} placeholder="e.g. guide, tutorial, template" className="rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <RiCheckboxCircleLine className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Content created. You can post another or go to Content to moderate.</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting} className="rounded-xl bg-primary hover:bg-primary/90">
                  {submitting ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <Link href="/dashboard/admin/content">View content</Link>
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={resetForm}>
                  Clear form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
