"use client"

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { getPostingLimit } from "@/lib/posting-limits"
import AuthGuard from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'
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
import { useUserLocation } from "@/hooks/use-user-location"
import { ProviderShell, providerTabForPath, PROVIDER_NAV_ROUTES } from '@/components/provider/provider-shell'
import { Panel, QuotaMeter, OnboardingBanner } from '@/components/provider/provider-ui'
import {
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  MapPin,
  Clock,
  DollarSign,
  Globe,
  CheckCircle,
  AlertCircle,
  Plus,
  Sparkles,
  Send,
  Loader2,
  FileText,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type PostType = 'opportunity' | 'event' | 'job' | 'resource'

const postTypes: PostTypeOption<PostType>[] = [
  { id: 'opportunity', title: 'Opportunity', icon: Target, color: 'orange', desc: 'Internships, scholarships, grants' },
  { id: 'job', title: 'Job', icon: Briefcase, color: 'primary', desc: 'Full-time, part-time positions' },
  { id: 'event', title: 'Event', icon: Calendar, color: 'emerald', desc: 'Workshops, conferences, meetups' },
  { id: 'resource', title: 'Resource', icon: BookOpen, color: 'violet', desc: 'Courses, guides, tools' },
]

const opportunityTypes = [
  'Internship', 'Scholarship', 'Grant', 'Fellowship', 'Volunteer Work',
  'Mentorship Program', 'Training Program', 'Workshop', 'Competition',
  'Research Opportunity', 'Startup Incubator', 'Accelerator Program',
  'Hackathon', 'Bootcamp', 'Exchange Program', 'Apprenticeship', 'Other',
]

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Remote', 'Other']

const eventTypes = ['Workshop', 'Conference', 'Webinar', 'Meetup', 'Hackathon', 'Networking', 'Bootcamp', 'Career Fair', 'Other']

const resourceCategories = ['Course', 'Tutorial', 'E-book', 'Tool', 'Template', 'Guide', 'Podcast', 'Video Series', 'Product', 'Other']

const QUICK_START_STEPS = [
  'Choose a post type',
  'Fill in the details',
  'Add tags for discovery',
  'Submit for review',
]

/** Shared field styling so every control in the sheet matches. */
const FIELD_CLASS = "h-11 rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground"
const FIELD_SM_CLASS = "h-10 rounded-lg border-border bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground"

/** A bordered group inside the form (Location, Compensation, Dates). */
function FormSection({
  icon: Icon,
  title,
  toggle,
  children,
}: {
  icon: any
  title: string
  toggle?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-body-sm font-semibold text-foreground">{title}</span>
        </div>
        {toggle}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
      {required ? <span className="ml-0.5 text-primary">*</span> : null}
    </Label>
  )
}

function PostingContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isAuthenticated } = useAuth()
  const [selectedType, setSelectedType] = useState<PostType | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const tagInputContainerRef = useRef<HTMLDivElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)

  // Permission state
  const [canPost, setCanPost] = useState(false)
  const [postingCount, setPostingCount] = useState<number | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completionPercentage: number
    isCompleted: boolean
    reason: string
  } | null>(null)

  // Form states
  const [isPaid, setIsPaid] = useState(false)
  const [isRemote, setIsRemote] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [country, setCountry] = useState<CountryValue>(null)
  const [industrySectors, setIndustrySectors] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState<string[]>([])
  const [period, setPeriod] = useState<PayPeriod>('monthly')

  // Rates load once per page and are shared with every other money field.
  const { rates, stale: ratesStale } = useRates()
  const { location } = useUserLocation()

  /**
   * The currency to open the form with: the poster's own, from the country they
   * are in or the one on their profile. Someone in Accra posting a Ghanaian
   * salary should not have to change a dropdown that says USD — and before
   * this, all three forms hardcoded NGN regardless of who was posting.
   */
  const defaultCurrency = currencyForCountry(
    country?.code || location.countryCode || profile?.onboarding?.countryCode,
  )
  const amount = useAmountEntry(rates, { currency: defaultCurrency })
  // Resource source: external link vs uploaded file (only one allowed per resource)
  const [resourceSource, setResourceSource] = useState<'link' | 'file'>('link')
  const [resourceFile, setResourceFile] = useState<File | null>(null)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  /** Single source of truth for posting permission + current post count. */
  const checkPermission = useCallback(async () => {
    if (!isAuthenticated || !user) return
    setLoading(true)
    try {
      const [response, countResult] = await Promise.all([
        ApiClient.checkPostingPermission().catch(() => ({
          canPost: false,
          completionPercentage: 0,
          isCompleted: false,
          reason: 'Could not verify posting permission'
        })),
        ApiClient.getMyPostingCount().catch(() => ({ total: 0, opportunities: 0, events: 0, jobs: 0, resources: 0 }))
      ])
      setCanPost(response.canPost)
      setOnboardingStatus({
        completionPercentage: response.completionPercentage,
        isCompleted: response.isCompleted,
        reason: response.reason
      })
      setPostingCount(countResult.total)
    } catch (error) {
      setCanPost(false)
      setPostingCount(null)
      setOnboardingStatus({
        completionPercentage: 0,
        isCompleted: false,
        reason: 'Failed to verify onboarding status'
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  /**
   * Bring the error into view when a submit fails.
   *
   * The banner renders at the top of the scrolling column while the submit
   * button is pinned to the footer, so submitting from the bottom of a long
   * form showed the spinner stop and nothing else. That reads as a silent
   * failure — and the form does keep every value, so the fix is to show the
   * reason rather than to preserve anything.
   */
  useEffect(() => {
    if (submitStatus !== 'error') return
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [submitStatus, errorMessage])

  const handleSelectType = (type: PostType) => {
    const limit = getPostingLimit(user?.role)
    // If limit is finite, enforce it; admins/super_admins get Infinity and bypass this check
    if (Number.isFinite(limit) && postingCount !== null && postingCount >= limit) {
      toast.error(
        `You have reached your maximum of ${limit} posts. Remove an existing post to add more.`,
        { duration: 5000 }
      )
      return
    }
    setSelectedType(type)
    setIsSheetOpen(true)
    setSubmitStatus('idle')
    setErrorMessage('')
    setTags([])
    setIsPaid(false)
    setIsRemote(false)
    setCountry(null)
    setIndustrySectors([])
    setTargetAudience([])
    setPeriod('monthly')
    amount.reset(null, defaultCurrency)
    setResourceSource('link')
    setResourceFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !canPost) return

    const limit = getPostingLimit(user?.role)
    let currentTotal = postingCount ?? 0
    if (Number.isFinite(limit) && currentTotal >= limit) {
      try {
        const count = await ApiClient.getMyPostingCount()
        currentTotal = count.total
        setPostingCount(currentTotal)
      } catch (_) {}
      if (Number.isFinite(limit) && currentTotal >= limit) {
        toast.error(
          `You have reached your maximum of ${limit} posts. Remove an existing post to add more.`,
          { duration: 5000 }
        )
        return
      }
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())

      const str = (value: FormDataEntryValue | undefined) =>
        typeof value === 'string' && value.trim() ? value.trim() : undefined

      /**
       * One draft, shaped by `buildListingPayload` into whatever the model for
       * this type actually reads.
       *
       * The four hand-rolled payloads this replaces each had at least one key
       * the model ignored — jobs sent `type` where the model reads `jobType`,
       * opportunities sent `company` where it reads `provider` — and because the
       * controllers accept unknown keys silently, all of it returned 201 and
       * published with the field empty.
       */
      const draft: ListingDraft = {
        kind: selectedType,
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        url: str(data.url),
        organizationName: str(data.organizer) ?? str(data.company) ?? str(data.author),
        type: str(data.type),
        tags,
        industrySectors,
        targetAudience,
        location: selectedType === 'resource'
          ? undefined
          : {
              country: country?.name,
              countryCode: country?.code,
              province: str(data.province),
              city: str(data.city),
              isRemote,
            },
        money: isPaid ? amount.payload : null,
        isPaid,
        period: selectedType === 'job' ? period : undefined,
        dates: {
          applicationDeadline: str(data.deadline),
          startDate: str(data.startDate),
          endDate: str(data.endDate),
          registrationDeadline: str(data.registrationDeadline),
        },
        requirements: str(data.requirements),
        capacity: data.capacity ? parseInt(String(data.capacity), 10) : null,
        // A resource with a price is a premium one; the flag and the figure were
        // previously unrelated, so a paid resource could publish with no price.
        isPremium: selectedType === 'resource' && isPaid,
      }

      let submissionData: any = {}

      if (selectedType !== 'resource') {
        submissionData = buildListingPayload(draft)
      } else {

        const resourceUrl = str(data.url) ?? ''
        // The uploaded-file path posts multipart, so it takes the payload minus
        // the link — a resource is a file or a link, never both, and the
        // controller rejects one carrying each.
        const { paymentLink: _link, ...baseResource } = buildListingPayload(draft) as Record<string, unknown>

        // A resource is either an uploaded file OR an external link — never both.
        if (resourceSource === 'file') {
          if (!resourceFile) {
            setIsSubmitting(false)
            setSubmitStatus('error')
            setErrorMessage('Please select a file to upload.')
            return
          }
          await ApiClient.createResourceWithFile(resourceFile, baseResource)
          setSubmitStatus('success')
          const c = await ApiClient.getMyPostingCount()
          setPostingCount(c.total)
          setTimeout(() => { setIsSheetOpen(false); setSelectedType(null) }, 2000)
          setIsSubmitting(false)
          return
        }

        if (!resourceUrl) {
          setIsSubmitting(false)
          setSubmitStatus('error')
          setErrorMessage('Please provide an external link.')
          return
        }
        submissionData = { ...baseResource, paymentLink: resourceUrl }
      }

      switch (selectedType) {
        case 'opportunity':
          await ApiClient.createOpportunity(submissionData)
          break
        case 'job':
          await ApiClient.createJob(submissionData)
          break
        case 'event':
          await ApiClient.createEvent(submissionData)
          break
        case 'resource':
          await ApiClient.createResource(submissionData)
          break
      }

      setSubmitStatus('success')
      const count = await ApiClient.getMyPostingCount()
      setPostingCount(count.total)
      setTimeout(() => {
        setIsSheetOpen(false)
        setSelectedType(null)
      }, 2000)

    } catch (error: any) {
      setSubmitStatus('error')
      setErrorMessage(error.message || 'Failed to post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeConfig = (type: PostType) => postTypes.find(t => t.id === type)!

  const postingLimit = getPostingLimit(user?.role)
  const typeOptions = selectedType === 'opportunity' ? opportunityTypes
    : selectedType === 'job' ? jobTypes
    : selectedType === 'event' ? eventTypes
    : resourceCategories

  return (
    <ProviderShell
      user={user}
      profile={profile}
      activeTab={providerTabForPath(pathname)}
      onTabChange={(tab) => router.push(PROVIDER_NAV_ROUTES[tab])}
      title="Create content"
      totalPostings={postingCount ?? 0}
      postingLimit={postingLimit}
      onRefresh={() => checkPermission()}
      refreshing={loading}
      showNewPost={false}
    >
      {/* Blocked until onboarding is complete */}
      {!canPost && onboardingStatus && (
        <OnboardingBanner
          percentage={onboardingStatus.completionPercentage}
          title="Complete onboarding to publish"
          description={onboardingStatus.reason}
        />
      )}

      {postingCount !== null && <QuotaMeter used={postingCount} limit={postingLimit} />}

      <Panel
        icon={Plus}
        title="What would you like to post?"
        subtitle={canPost ? "Pick a type to open the form" : "Available once onboarding is complete"}
      >
        <PostTypeSelector<PostType>
          types={postTypes}
          selectedType={selectedType}
          onSelect={handleSelectType}
          disabled={!canPost}
        />
      </Panel>

      {/* Quick start — one compact row instead of a four-row card */}
      <div className="rounded-2xl border border-border/60 bg-card/70 px-3.5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Quick start
        </div>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          {QUICK_START_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-2 py-1">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">{step}</span>
              </span>
              {index < QUICK_START_STEPS.length - 1 ? (
                <span className="text-muted-foreground/40" aria-hidden>→</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {/* Bottom Sheet Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="flex h-[92vh] flex-col overflow-hidden rounded-t-3xl border-border bg-page p-0">
          {selectedType && (
            <>
              <SheetHeader className="shrink-0 space-y-0 border-b border-border/60 px-4 py-3.5 text-left sm:px-6">
                <div className="flex items-center gap-3 pr-8">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      getTypeConfig(selectedType).color === 'orange' && "border-orange-500/25 bg-orange-500/10",
                      getTypeConfig(selectedType).color === 'primary' && "border-primary/25 bg-primary/10",
                      getTypeConfig(selectedType).color === 'emerald' && "border-emerald-500/25 bg-emerald-500/10",
                      getTypeConfig(selectedType).color === 'violet' && "border-violet-500/25 bg-violet-500/10",
                    )}
                  >
                    {(() => {
                      const Icon = getTypeConfig(selectedType).icon
                      return (
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            getTypeConfig(selectedType).color === 'orange' && "text-orange-500",
                            getTypeConfig(selectedType).color === 'primary' && "text-primary",
                            getTypeConfig(selectedType).color === 'emerald' && "text-emerald-500",
                            getTypeConfig(selectedType).color === 'violet' && "text-violet-500",
                          )}
                        />
                      )
                    })()}
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-body font-semibold text-foreground">
                      New {getTypeConfig(selectedType).title}
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-muted-foreground">
                      Fill in the details below — it goes live after review.
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {submitStatus === 'success' ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Posted successfully</h3>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    Your {selectedType} has been submitted for review.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="mx-auto max-w-2xl space-y-4">
                      {submitStatus === 'error' && (
                        <div ref={errorRef} className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-body-sm text-red-500 dark:text-red-400">{errorMessage}</p>
                            <button
                              type="button"
                              onClick={() => setSubmitStatus('idle')}
                              className="mt-1 text-xs text-red-500 hover:underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Title + owner */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <FieldLabel required>Title</FieldLabel>
                          <Input
                            name="title"
                            placeholder={`${getTypeConfig(selectedType).title} title`}
                            required
                            className={FIELD_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>
                            {selectedType === 'event' ? 'Organizer' : selectedType === 'resource' ? 'Creator' : 'Company'}
                          </FieldLabel>
                          <Input
                            name={selectedType === 'event' ? 'organizer' : selectedType === 'resource' ? 'author' : 'company'}
                            placeholder={selectedType === 'event' ? 'Organizer name' : selectedType === 'resource' ? 'Creator name' : 'Company name'}
                            className={FIELD_CLASS}
                          />
                        </div>
                      </div>

                      {/* Type */}
                      <div className="space-y-1.5">
                        <FieldLabel required>Type</FieldLabel>
                        <Select name="type" required>
                          <SelectTrigger className={FIELD_CLASS}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-surface">
                            {typeOptions.map((t) => (
                              <SelectItem key={t} value={t} className="text-foreground">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <FieldLabel required>Description</FieldLabel>
                        <Textarea
                          name="description"
                          placeholder="Describe in detail..."
                          required
                          rows={4}
                          className="resize-none rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* Resource source: external link OR file upload (mutually exclusive) */}
                      {selectedType === 'resource' ? (
                        <div className="space-y-2">
                          <FieldLabel required>Resource source</FieldLabel>
                          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                            <button
                              type="button"
                              onClick={() => { setResourceSource('link'); setResourceFile(null) }}
                              className={cn(
                                "flex h-9 items-center justify-center gap-2 rounded-lg text-body-sm font-medium transition-colors",
                                resourceSource === 'link' ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Globe className="h-4 w-4" /> External link
                            </button>
                            <button
                              type="button"
                              onClick={() => setResourceSource('file')}
                              className={cn(
                                "flex h-9 items-center justify-center gap-2 rounded-lg text-body-sm font-medium transition-colors",
                                resourceSource === 'file' ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <FileText className="h-4 w-4" /> File upload
                            </button>
                          </div>

                          {resourceSource === 'link' ? (
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input name="url" type="url" placeholder="https://..." className={cn(FIELD_CLASS, "pl-10")} />
                            </div>
                          ) : (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-violet-500/60">
                              <FileText className="h-8 w-8 text-violet-500" />
                              {resourceFile ? (
                                <>
                                  <span className="break-all text-body-sm font-medium text-foreground">{resourceFile.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {(resourceFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-body-sm font-medium text-foreground">Click to upload a file</span>
                                  <span className="text-xs text-muted-foreground">
                                    PDF, Word, PowerPoint or image (JPEG, PNG, WebP, GIF, AVIF) · max 25MB
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.avif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/webp,image/avif"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null
                                  if (f && f.size > 25 * 1024 * 1024) {
                                    toast.error('File is too large. Maximum size is 25MB.')
                                    return
                                  }
                                  setResourceFile(f)
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <FieldLabel required>External link</FieldLabel>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input name="url" type="url" placeholder="https://..." required className={cn(FIELD_CLASS, "pl-10")} />
                          </div>
                        </div>
                      )}

                      {/* Location (not for resource) */}
                      {selectedType !== 'resource' && (
                        <FormSection
                          icon={MapPin}
                          title="Location"
                          toggle={
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Virtual</span>
                              <Switch checked={isRemote} onCheckedChange={setIsRemote} />
                            </div>
                          }
                        >
                          {!isRemote && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {/* Picked, not typed: the ranker matches ISO codes, and
                                  "nigeria" / "Nigeria " / "NGA" were three different
                                  places to it. Choosing here also sets the currency. */}
                              <CountryField value={country} onChange={setCountry} />
                              <Input name="province" placeholder="State/Province" className={FIELD_SM_CLASS} />
                              <Input name="city" placeholder="City" className={FIELD_SM_CLASS} />
                            </div>
                          )}
                        </FormSection>
                      )}

                      {/* Financial (opportunity, job) or ticket price (event) */}
                      {/* Resources are included now: a premium resource used to be a
                          bare flag plus an off-platform link, so its price was the one
                          figure on the platform nothing could state. */}
                      <FormSection
                          icon={DollarSign}
                          title={
                            selectedType === 'event' ? 'Ticket price'
                              : selectedType === 'resource' ? 'Price'
                                : 'Compensation'
                          }
                          toggle={
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {selectedType === 'event' ? 'Paid event' : selectedType === 'resource' ? 'Premium' : 'Paid'}
                              </span>
                              <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                            </div>
                          }
                        >
                          {isPaid && (
                            <AmountCurrencyField
                              entry={amount}
                              placeholder="Amount"
                              period={selectedType === 'job' ? period : undefined}
                              onPeriodChange={selectedType === 'job' ? setPeriod : undefined}
                              ratesStale={ratesStale}
                              inputClassName={FIELD_SM_CLASS}
                            />
                          )}
                      </FormSection>

                      {/* Dates */}
                      {selectedType !== 'resource' && (
                        <FormSection icon={Clock} title="Dates">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {selectedType === 'event' ? (
                              <>
                                <div className="space-y-1.5">
                                  <FieldLabel required>Start date</FieldLabel>
                                  <Input name="startDate" type="date" required className={FIELD_SM_CLASS} />
                                </div>
                                <div className="space-y-1.5">
                                  <FieldLabel>End date</FieldLabel>
                                  <Input name="endDate" type="date" className={FIELD_SM_CLASS} />
                                </div>
                                {/* The submit handler has always read this field; the
                                    input was simply never rendered, so every event
                                    published with no registration deadline — and
                                    Event.isValid is computed from exactly that. */}
                                <div className="space-y-1.5">
                                  <FieldLabel>Registration deadline</FieldLabel>
                                  <Input name="registrationDeadline" type="date" className={FIELD_SM_CLASS} />
                                </div>
                              </>
                            ) : (
                              <div className="space-y-1.5">
                                <FieldLabel>Application deadline</FieldLabel>
                                <Input name="deadline" type="date" className={FIELD_SM_CLASS} />
                              </div>
                            )}
                          </div>
                        </FormSection>
                      )}

                      {/* Tags */}
                      <div ref={tagInputContainerRef}>
                        <TagInputWithSuggestions
                          tags={tags}
                          onTagsChange={setTags}
                          label="Tags"
                          helperText="Add up to 10 tags for better discovery"
                        />
                      </div>

                      {/* Both vocabularies are the ones users answer at onboarding,
                          so a listing tagged "Technology, Student" matches a profile
                          holding those exact values instead of being fuzzy-matched. */}
                      <ChipMultiSelect
                        label="Industries"
                        options={INDUSTRY_SECTORS}
                        selected={industrySectors}
                        onChange={setIndustrySectors}
                        max={3}
                        helperText="Who this is relevant to. Shown to people who picked these at signup."
                      />

                      <ChipMultiSelect
                        label="Who is this for?"
                        groups={TARGET_AUDIENCE_GROUPS}
                        selected={targetAudience}
                        onChange={setTargetAudience}
                        max={4}
                      />

                      {/* Requirements (opportunity only) */}
                      {selectedType === 'opportunity' && (
                        <div className="space-y-1.5">
                          <FieldLabel>Requirements</FieldLabel>
                          <Textarea
                            name="requirements"
                            placeholder="List the requirements..."
                            rows={3}
                            className="resize-none rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      )}

                      {/* Capacity (event only) */}
                      {selectedType === 'event' && (
                        <div className="space-y-1.5">
                          <FieldLabel>Capacity</FieldLabel>
                          <Input
                            name="capacity"
                            type="number"
                            placeholder="Maximum attendees (optional)"
                            className={FIELD_CLASS}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit stays in reach instead of scrolling away at the bottom */}
                  <div className="shrink-0 border-t border-border/60 bg-page px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                    <div className="mx-auto max-w-2xl">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit {getTypeConfig(selectedType).title}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </ProviderShell>
  )
}

export default function PostingDashboard() {
  return (
    <AuthGuard>
      <PostingContent />
    </AuthGuard>
  )
}
