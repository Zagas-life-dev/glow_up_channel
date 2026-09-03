"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminSection } from "@/components/admin/ui"
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
import PostTypeSelector, { PostTypeOption } from "@/components/posting/PostTypeSelector"
import TagInputWithSuggestions from "@/components/posting/TagInputWithSuggestions"
import { AmountCurrencyField, type PayPeriod } from "@/components/posting/AmountCurrencyField"
import { ChipMultiSelect } from "@/components/posting/ChipMultiSelect"
import { CountryField, type CountryValue } from "@/components/posting/CountryField"
import { useRates } from "@/lib/currency/use-rates"
import { useAmountEntry } from "@/lib/currency/use-amount-entry"
import { currencyForCountry } from "@/lib/currency/catalog"
import { buildListingPayload, type ListingDraft } from "@/lib/listings/payload"
import { INDUSTRY_SECTORS, TARGET_AUDIENCE_GROUPS } from "@/lib/listings/taxonomy"

type ContentType = "event" | "job" | "opportunity" | "resource"

const ADMIN_POST_TYPES: PostTypeOption<ContentType>[] = [
  {
    id: "event",
    title: "Event",
    icon: RiCalendarLine,
    color: "emerald",
    desc: "Workshops, conferences, meetups",
  },
  {
    id: "job",
    title: "Job",
    icon: RiBriefcaseLine,
    color: "primary",
    desc: "Full-time, part-time positions",
  },
  {
    id: "opportunity",
    title: "Opportunity",
    icon: RiFocus3Line,
    color: "orange",
    desc: "Scholarships, grants, fellowships",
  },
  {
    id: "resource",
    title: "Resource",
    icon: RiBookOpenLine,
    color: "violet",
    desc: "Courses, guides, tools",
  },
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
  const [tags, setTags] = useState<string[]>([])
  const [industrySectors, setIndustrySectors] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState<string[]>([])
  const [country, setCountry] = useState<CountryValue>(null)
  const [period, setPeriod] = useState<PayPeriod>('monthly')

  const { rates, stale: ratesStale } = useRates()
  // Admin listings are posted on behalf of organisations all over the coverage
  // map, so there is no sensible local default — USD is the neutral one, and
  // the picker is one click away.
  const amount = useAmountEntry(rates, { currency: currencyForCountry(country?.code) })

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
    setTags([])
    setIndustrySectors([])
    setTargetAudience([])
    setCountry(null)
    setPeriod('monthly')
    amount.reset(null, currencyForCountry(null))
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
      const benefitsList = parseBenefits()

      /**
       * One draft for all four types, shaped by `buildListingPayload`.
       *
       * The four hand-written payloads this replaces dropped, between them:
       * every job's type (`type` where the model reads `jobType`), every
       * resource's link and author (`url` and `author`, neither of which the
       * model has), and — because the tag input was rendered only in the
       * resource branch — the tags on every event, job and opportunity this
       * form has ever created.
       */
      const draft: ListingDraft = {
        kind: contentType,
        title: title.trim(),
        description: description.trim(),
        url: resourceLink.trim(),
        organizationName:
          contentType === "event" ? (organizer.trim() || "UP")
            : contentType === "job" ? (company.trim() || "Company")
              : contentType === "opportunity" ? (provider.trim() || "UP")
                : (author.trim() || "UP"),
        type:
          contentType === "event" ? eventType
            : contentType === "job" ? jobType
              : contentType === "opportunity" ? opportunityCategory
                : resourceCategory,
        tags,
        industrySectors,
        targetAudience,
        location: contentType === "resource" ? undefined : {
          country: country?.name,
          countryCode: country?.code,
          city:
            contentType === "event" ? (eventCity.trim() || undefined)
              : contentType === "job" ? (jobCity.trim() || undefined)
                : (oppCity.trim() || undefined),
          isRemote:
            contentType === "event" ? eventRemote
              : contentType === "job" ? jobRemote
                : oppRemote,
        },
        money: isPaid ? amount.payload : null,
        isPaid,
        period: contentType === "job" ? period : undefined,
        dates: {
          startDate: contentType === "event" ? (startDate || undefined) : undefined,
          endDate: contentType === "event" ? (endDate || undefined) : undefined,
          applicationDeadline:
            contentType === "job" ? (appDeadline || undefined)
              : contentType === "opportunity" ? (oppDeadline || undefined)
                : undefined,
        },
        requirements: contentType === "opportunity" ? eligibility.trim() : undefined,
        benefits: benefitsList,
        isPremium: contentType === "resource" && isPaid,
        // Admin posts publish directly rather than queueing for review.
        status: "active",
        isApproved: true,
      }

      const payload = buildListingPayload(draft)

      if (contentType === "event") {
        await ApiClient.createEvent(payload)
      } else if (contentType === "job") {
        await ApiClient.createJob(payload)
      } else if (contentType === "opportunity") {
        await ApiClient.createOpportunity(payload)
      } else {
        await ApiClient.createResource(payload)
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
    <AdminShell
      title="Create content"
      description="Post a new event, job, opportunity, or resource."
      width="narrow"
    >
      <div className="space-y-5">
        <AdminSection title="What are you posting?">
          <PostTypeSelector<ContentType>
            types={ADMIN_POST_TYPES}
            selectedType={contentType}
            onSelect={(id) => setContentType(id)}
          />
        </AdminSection>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AdminSection title="Basics">
               <div className="space-y-5">
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

               </div>
              </AdminSection>

              <AdminSection title="Link">
              {/* Where viewers actually get the thing — the field most often left vague */}
              <div className="space-y-2">
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

              </AdminSection>

              {/* Type-specific fields */}
              <AdminSection title="Details">
               <div className="space-y-5">
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
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <CountryField value={country} onChange={setCountry} className="rounded-xl" />
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
                      <div className="sm:col-span-2">
                        <AmountCurrencyField
                          entry={amount}
                          label="Ticket price"
                          ratesStale={ratesStale}
                          inputClassName="rounded-xl"
                        />
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
                      <CountryField value={country} onChange={setCountry} className="rounded-xl" />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input type="checkbox" id="jobRemote" checked={jobRemote} onChange={(e) => setJobRemote(e.target.checked)} className="rounded" />
                      <Label htmlFor="jobRemote">Remote</Label>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="jobIsPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded" />
                        <Label htmlFor="jobIsPaid">States a salary</Label>
                      </div>
                      {isPaid && (
                        <AmountCurrencyField
                          entry={amount}
                          label="Salary"
                          period={period}
                          onPeriodChange={setPeriod}
                          ratesStale={ratesStale}
                          inputClassName="rounded-xl"
                        />
                      )}
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
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <CountryField value={country} onChange={setCountry} className="rounded-xl" />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="oppIsPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded" />
                        <Label htmlFor="oppIsPaid">Carries a stipend or award</Label>
                      </div>
                      {isPaid && (
                        <AmountCurrencyField
                          entry={amount}
                          label="Stipend / award"
                          ratesStale={ratesStale}
                          inputClassName="rounded-xl"
                        />
                      )}
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
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="resourceIsPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded" />
                        <Label htmlFor="resourceIsPaid">Premium (paid) resource</Label>
                      </div>
                      {isPaid && (
                        <AmountCurrencyField
                          entry={amount}
                          label="Price"
                          ratesStale={ratesStale}
                          inputClassName="rounded-xl"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Discovery fields, for all four types.

                  The tag input used to live inside the resource block above and
                  the payload passed `tags` only for resources, so every event,
                  job and opportunity this form created shipped with none — which
                  is most of what tag ranking had to work with. */}
              <div className="space-y-4 rounded-xl border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground">Discovery</h4>
                <TagInputWithSuggestions
                  tags={tags}
                  onTagsChange={setTags}
                  label="Tags"
                  helperText="Add up to 10 tags to help users discover this listing."
                />
                <ChipMultiSelect
                  label="Industries"
                  options={INDUSTRY_SECTORS}
                  selected={industrySectors}
                  onChange={setIndustrySectors}
                  max={3}
                />
                <ChipMultiSelect
                  label="Who is this for?"
                  groups={TARGET_AUDIENCE_GROUPS}
                  selected={targetAudience}
                  onChange={setTargetAudience}
                  max={4}
                />
              </div>

               </div>
              </AdminSection>

              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
                  <RiCheckboxCircleLine className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Content created. Post another, or open Moderation to review it.</span>
                </div>
              )}

              {/* Submit stays reachable at the bottom of a long form */}
              <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-page/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                <Button type="submit" disabled={submitting} className="h-10 rounded-xl">
                  {submitting ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={resetForm}>
                  Clear form
                </Button>
                <Button type="button" variant="outline" className="ml-auto h-10 rounded-xl" asChild>
                  <Link href="/dashboard/admin/content">View content</Link>
                </Button>
              </div>
            </form>
      </div>
    </AdminShell>
  )
}
