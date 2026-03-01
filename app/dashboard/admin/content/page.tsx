"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RiFileLine,
  RiSearchLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiEyeLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiBankCardLine,
  RiUserLine,
  RiMapPinLine,
  RiCalendarLine,
  RiRefreshLine,
  RiBarChartBoxLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiBookLine,
  RiCloseLine,
  RiEditLine,
  RiExternalLinkLine,
} from "react-icons/ri"
import { AdminLayout } from "@/components/admin-sidebar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Skeleton } from "@/components/ui/skeleton"

const ITEMS_PER_PAGE = 20

interface ContentItem {
  _id: string
  title: string
  description: string
  type: "opportunity" | "event" | "job" | "resource"
  status: "active" | "inactive" | "draft"
  isApproved: boolean
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  paymentStatus?:
    | "not_required"
    | "pending"
    | "awaiting_payment"
    | "payment_uploaded"
    | "verified"
    | "failed"
  paymentAmount?: number
  providerId?: string
  organizerId?: string
  provider?: string
  organizer?: string
  location?: {
    country?: string
    city?: string
    province?: string
    address?: string
    isRemote?: boolean
    isHybrid?: boolean
  }
  poster?: { name?: string; email?: string }
  paymentReceipt?: string
  paymentNotes?: string
  applicationLink?: string
  externalLink?: string
  eventLink?: string
  url?: string
  benefits?: string[]
  /** True when item is from opportunity-inactive, events-inactive, jobs-inactive, or resources-inactive */
  _fromInactive?: boolean
  company?: string
  category?: string
  jobType?: string
  tags?: string[]
  pay?: { amount?: number; currency?: string; period?: string }
  financial?: { amount?: number; currency?: string; isPaid?: boolean; benefits?: string[]; period?: string }
  price?: number
  currency?: string
  dates?: {
    applicationDeadline?: string
    startDate?: string
    endDate?: string
    duration?: string
    registrationDeadline?: string
  }
  requirements?: Record<string, unknown>
  [key: string]: unknown
}

type StatusFilter =
  | "all"
  | "live"
  | "pending"
  | "true_draft"
  | "hidden"
  | "inactive_not_approved"
  | "inactive_approved"
type TypeFilter = "all" | "opportunity" | "event" | "job" | "resource"
type PaymentFilter =
  | "all"
  | "not_required"
  | "awaiting_payment"
  | "payment_uploaded"
  | "verified"

// Basic requirement option sets for opportunities
const EDUCATION_LEVEL_OPTIONS = [
  "Any",
  "High school",
  "Undergraduate",
  "Graduate",
  "Postgraduate",
  "Other",
]

const CAREER_STAGE_OPTIONS = [
  "Any",
  "Student",
  "Entry level",
  "Mid level",
  "Senior",
  "Executive",
  "Other",
]

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "opportunity", label: "Opportunity" },
  { value: "event", label: "Event" },
  { value: "job", label: "Job" },
  { value: "resource", label: "Resource" },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "pending", label: "Pending" },
  { value: "true_draft", label: "Draft" },
  { value: "hidden", label: "Hidden" },
  { value: "inactive_not_approved", label: "Inactive" },
  { value: "inactive_approved", label: "Inactive (OK)" },
]

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_required", label: "None" },
  { value: "awaiting_payment", label: "Awaiting" },
  { value: "payment_uploaded", label: "Uploaded" },
  { value: "verified", label: "Verified" },
]

const JOB_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Remote", "Other"]

/** Backend expects jobType as lowercase hyphenated (e.g. full-time, part-time) */
function jobTypeToBackendFormat(display: string): string {
  return display.trim().toLowerCase().replace(/\s+/g, "-")
}

/** Normalize API jobType (e.g. full-time) to display format for Select (e.g. Full-time) */
function jobTypeToDisplayFormat(apiValue: string | undefined): string {
  if (!apiValue || !apiValue.trim()) return ""
  const normalized = apiValue.trim().toLowerCase().replace(/\s+/g, "-")
  const match = JOB_TYPE_OPTIONS.find((opt) => jobTypeToBackendFormat(opt) === normalized)
  return match ?? apiValue.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function AdminContentCardSkeleton() {
  return (
    <article className="rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-sm flex min-h-[140px] animate-pulse">
      <div className="w-16 sm:w-20 flex-shrink-0 bg-muted" />
      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-4 border-l-4 border-l-transparent">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <div className="flex gap-4 mt-1">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Skeleton className="h-9 w-16 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </article>
  )
}

export default function AdminContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [counts, setCounts] = useState({ live: 0, pending: 0, drafts: 0, inactive: 0 })

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [rejectionReason, setRejectionReason] = useState("")
  const [bypassPayment, setBypassPayment] = useState(false)
  const [paymentAmountInput, setPaymentAmountInput] = useState(5000)
  const [paymentVerification, setPaymentVerification] = useState<"verify" | "reject">("verify")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [detailsEditMode, setDetailsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "draft">("active")
  const [editApplicationLink, setEditApplicationLink] = useState("")
  const [editExternalLink, setEditExternalLink] = useState("")
  const [editEventLink, setEditEventLink] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const [editLocationCity, setEditLocationCity] = useState("")
  const [editLocationCountry, setEditLocationCountry] = useState("")
  const [editLocationProvince, setEditLocationProvince] = useState("")
  const [editLocationRemote, setEditLocationRemote] = useState(false)
  const [editLocationHybrid, setEditLocationHybrid] = useState(false)
  const [editLocationAddress, setEditLocationAddress] = useState("")
  const [editCompany, setEditCompany] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editJobType, setEditJobType] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editPayPeriod, setEditPayPeriod] = useState("")
  const [editPaymentAmount, setEditPaymentAmount] = useState<number | "">("")
  const [editPaymentNotes, setEditPaymentNotes] = useState("")
  const [editPrice, setEditPrice] = useState<number | "">("")
  const [editCurrency, setEditCurrency] = useState("")
  const [editBenefits, setEditBenefits] = useState("")
  const [editAppDeadline, setEditAppDeadline] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editRegistrationDeadline, setEditRegistrationDeadline] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [detailsSaveLoading, setDetailsSaveLoading] = useState(false)

  // Requirements (for opportunities) – structured instead of raw JSON block
  const [editReqEducationLevel, setEditReqEducationLevel] = useState("")
  const [editReqCareerStage, setEditReqCareerStage] = useState("")
  const [editReqSkills, setEditReqSkills] = useState("")
  const [editReqExperience, setEditReqExperience] = useState("")
  const [editReqAgeRange, setEditReqAgeRange] = useState("")
  const [editReqCitizenship, setEditReqCitizenship] = useState("")
  const [editReqEligibleParticipants, setEditReqEligibleParticipants] = useState("")
  const [editReqOther, setEditReqOther] = useState("")

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const filters = useMemo(
    () => ({
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      payment: paymentFilter !== "all" ? paymentFilter : undefined,
      search: searchQuery || undefined,
    }),
    [typeFilter, statusFilter, paymentFilter, searchQuery]
  )

  const hasActiveFilters =
    typeFilter !== "all" || statusFilter !== "all" || paymentFilter !== "all" || !!searchQuery.trim()

  const clearAllFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    setPaymentFilter("all")
    setSearchQuery("")
  }

  const fetchPosters = useCallback(async (items: ContentItem[]) => {
    return Promise.all(
      items.map(async (item: ContentItem) => {
        try {
          const posterInfo = await ApiClient.getPosterInfo(
            item.providerId || item.organizerId
          )
          return { ...item, poster: posterInfo }
        } catch {
          return { ...item, poster: { name: "Unknown", email: "N/A" } }
        }
      })
    )
  }, [])

  const fetchFirstPage = useCallback(async () => {
    if (!isAuthenticated || !user) return
    setContent([])
    setCounts({ live: 0, pending: 0, drafts: 0, inactive: 0 })
    setLoading(true)
    setError(null)
    try {
      const result = await ApiClient.getContentForModeration(
        1,
        ITEMS_PER_PAGE,
        filters
      )
      const contentWithPosters = await fetchPosters(result.content)
      setContent(contentWithPosters)
      setTotalCount(result.pagination.totalCount)
      setTotalPages(result.pagination.totalPages)
      setCurrentPage(1)
      if (result.counts) {
        setCounts(result.counts)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load content"
      setError(message)
      toast.error("Failed to load content")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, filters, fetchPosters])

  const loadMore = useCallback(async () => {
    if (currentPage >= totalPages || loadingMore || loading) return
    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const result = await ApiClient.getContentForModeration(
        nextPage,
        ITEMS_PER_PAGE,
        filters
      )
      const contentWithPosters = await fetchPosters(result.content)
      setContent((prev) => [...prev, ...contentWithPosters])
      setCurrentPage(nextPage)
      setTotalPages(result.pagination.totalPages)
      setTotalCount(result.pagination.totalCount)
      if (result.counts) {
        setCounts(result.counts)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load more")
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, totalPages, loadingMore, loading, filters, fetchPosters])

  const hasMore = currentPage < totalPages
  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
    itemsBeforeLoad: 4,
    estimatedItemHeight: 200,
  })

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return
    if (user.role !== "admin" && user.role !== "super_admin") {
      setError("Access denied.")
      setLoading(false)
      return
    }
    fetchFirstPage()
  }, [authLoading, isAuthenticated, user, fetchFirstPage])

  useEffect(() => {
    if (showDetailsDialog && selectedContent) {
      setEditTitle(selectedContent.title)
      setEditDescription(selectedContent.description)
      setEditStatus(selectedContent.status)
      setEditApplicationLink(selectedContent.applicationLink ?? "")
      setEditExternalLink(selectedContent.externalLink ?? "")
      setEditEventLink(selectedContent.eventLink ?? "")
      setEditUrl(selectedContent.url ?? "")
      setEditLocationCity(selectedContent.location?.city ?? "")
      setEditLocationCountry(selectedContent.location?.country ?? "")
      setEditLocationProvince(selectedContent.location?.province ?? "")
      setEditLocationRemote(selectedContent.location?.isRemote ?? false)
      setEditLocationHybrid((selectedContent.location as { isHybrid?: boolean })?.isHybrid ?? false)
      setEditLocationAddress((selectedContent.location as { address?: string })?.address ?? "")
      setEditCompany(selectedContent.company ?? "")
      setEditCategory(selectedContent.category ?? "")
      setEditJobType(jobTypeToDisplayFormat(selectedContent.jobType as string))
      setEditTags(Array.isArray(selectedContent.tags) ? (selectedContent.tags as string[]).join(", ") : "")
      setEditPayPeriod((selectedContent.pay as { period?: string })?.period ?? (selectedContent.financial as { period?: string })?.period ?? "")
      setEditPaymentAmount(selectedContent.paymentAmount ?? "")
      setEditPaymentNotes(selectedContent.paymentNotes ?? "")
      const priceVal = selectedContent.price ?? selectedContent.financial?.amount ?? ""
      setEditPrice(priceVal === "" ? "" : Number(priceVal))
      setEditCurrency(selectedContent.currency ?? selectedContent.financial?.currency ?? "")
      const benefitsArr = selectedContent.benefits ?? selectedContent.financial?.benefits ?? []
      setEditBenefits(Array.isArray(benefitsArr) ? benefitsArr.join("\n") : "")
      setEditAppDeadline(selectedContent.dates?.applicationDeadline ? selectedContent.dates.applicationDeadline.slice(0, 16) : "")
      setEditStartDate(selectedContent.dates?.startDate ? selectedContent.dates.startDate.slice(0, 16) : "")
      setEditEndDate(selectedContent.dates?.endDate ? selectedContent.dates.endDate.slice(0, 16) : "")
      setEditRegistrationDeadline(selectedContent.dates?.registrationDeadline ? selectedContent.dates.registrationDeadline.slice(0, 16) : "")
      setEditDuration(selectedContent.dates?.duration ?? "")
      // Requirements (only map structured fields for opportunities)
      if (selectedContent.type === "opportunity" && selectedContent.requirements && typeof selectedContent.requirements === "object") {
        const req = selectedContent.requirements as any
        setEditReqEducationLevel((req.educationLevel as string) ?? "")
        setEditReqCareerStage((req.careerStage as string) ?? "")
        setEditReqSkills(Array.isArray(req.skills) ? (req.skills as string[]).join(", ") : (req.skills as string) ?? "")
        setEditReqExperience((req.experience as string) ?? "")
        setEditReqAgeRange((req.ageRange as string) ?? "")
        setEditReqCitizenship((req.citizenship as string) ?? "")
        setEditReqEligibleParticipants((req.Eligible_participants as string) ?? "")
        setEditReqOther((req.other as string) ?? "")
      } else {
        setEditReqEducationLevel("")
        setEditReqCareerStage("")
        setEditReqSkills("")
        setEditReqExperience("")
        setEditReqAgeRange("")
        setEditReqCitizenship("")
        setEditReqEligibleParticipants("")
        setEditReqOther("")
      }
      setDetailsEditMode(false)
    }
  }, [showDetailsDialog, selectedContent])

  const handleReview = async () => {
    if (!selectedContent) return
    const id = selectedContent._id
    const previousItem = content.find((c) => c._id === id)
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }
    setActionLoading(id)
    if (reviewAction === "approve") {
      setContent((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, isApproved: true, status: "active" as const } : c
        )
      )
      setCounts((prev) => ({
        ...prev,
        live: prev.live + 1,
        pending: Math.max(0, prev.pending - 1),
      }))
      setShowReviewDialog(false)
      setRejectionReason("")
      setBypassPayment(false)
      setSelectedContent(null)
    } else {
      const wasPending = previousItem?.status === "active" && !previousItem?.isApproved
      const wasDraft = previousItem?.status === "draft"
      setContent((prev) => prev.filter((c) => c._id !== id))
      setCounts((prev) => ({
        ...prev,
        pending: wasPending ? Math.max(0, prev.pending - 1) : prev.pending,
        drafts: wasDraft ? Math.max(0, prev.drafts - 1) : prev.drafts,
      }))
      setShowReviewDialog(false)
      setRejectionReason("")
      setSelectedContent(null)
    }
    try {
      if (reviewAction === "approve") {
        await ApiClient.approveContent(selectedContent._id, selectedContent.type, {
          bypassPayment,
        })
        toast.success(
          bypassPayment
            ? "Content approved without payment."
            : "Content approved. Request payment from Approved tab."
        )
      } else {
        await ApiClient.rejectContent(
          selectedContent._id,
          selectedContent.type,
          rejectionReason
        )
        toast.success("Content rejected")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to review")
      if (previousItem) {
        setContent((prev) => {
          const next = reviewAction === "approve"
            ? prev.map((c) => (c._id === id ? previousItem : c))
            : [...prev, previousItem].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
          return next
        })
        if (reviewAction === "approve") {
          setCounts((prev) => ({ ...prev, live: Math.max(0, prev.live - 1), pending: prev.pending + 1 }))
        } else {
          const wasPending = previousItem.status === "active" && !previousItem.isApproved
          const wasDraft = previousItem.status === "draft"
          setCounts((prev) => ({
            ...prev,
            pending: wasPending ? prev.pending + 1 : prev.pending,
            drafts: wasDraft ? prev.drafts + 1 : prev.drafts,
          }))
        }
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestPayment = (item: ContentItem) => {
    setSelectedContent(item)
    setPaymentAmountInput(item.paymentAmount || 5000)
    setShowPaymentDialog(true)
  }

  const handleConfirmPaymentRequest = async () => {
    if (!selectedContent) return
    const id = selectedContent._id
    const previousItem = content.find((c) => c._id === id)
    setActionLoading(id)
    setContent((prev) =>
      prev.map((c) =>
        c._id === id
          ? { ...c, paymentStatus: "awaiting_payment" as const, paymentAmount: paymentAmountInput }
          : c
      )
    )
    setShowPaymentDialog(false)
    setSelectedContent(null)
    try {
      await ApiClient.requestPayment(
        id,
        selectedContent.type,
        paymentAmountInput,
        "Payment requested by admin for content approval"
      )
      toast.success(`Payment request sent for ₦${paymentAmountInput.toLocaleString()}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to request payment")
      if (previousItem) {
        setContent((prev) => prev.map((c) => (c._id === id ? previousItem : c)))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handlePaymentVerification = async () => {
    if (!selectedContent) return
    const id = selectedContent._id
    const verified = paymentVerification === "verify"
    const previousItem = content.find((c) => c._id === id)
    const wasAlreadyLive = previousItem?.status === "active" && previousItem?.isApproved
    setActionLoading(id)
    setContent((prev) =>
      prev.map((c) =>
        c._id === id
          ? {
              ...c,
              paymentStatus: verified ? ("verified" as const) : ("failed" as const),
              isApproved: verified ? true : c.isApproved,
            }
          : c
      )
    )
    if (verified && !wasAlreadyLive) {
      setCounts((prev) => ({ ...prev, live: prev.live + 1, pending: Math.max(0, prev.pending - 1) }))
    }
    setShowPaymentDialog(false)
    setPaymentNotes("")
    setSelectedContent(null)
    try {
      await ApiClient.verifyPayment(id, selectedContent.type, verified, paymentNotes)
      toast.success(verified ? "Payment verified" : "Payment rejected")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to verify")
      if (previousItem) {
        setContent((prev) => prev.map((c) => (c._id === id ? previousItem : c)))
        if (verified && !wasAlreadyLive) {
          setCounts((prev) => ({ ...prev, live: Math.max(0, prev.live - 1), pending: prev.pending + 1 }))
        }
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveDetailsEdit = async () => {
    if (!selectedContent) return
    const id = selectedContent._id
    const title = editTitle.trim()
    const description = editDescription.trim()
    const benefitsList = editBenefits.trim() ? editBenefits.split(/\n/).map((b) => b.trim()).filter(Boolean) : undefined
    // Build structured requirements update for opportunities
    let requirementsUpdate: Record<string, unknown> | undefined
    if (selectedContent.type === "opportunity") {
      const skillsArray =
        editReqSkills.trim() !== "" ? editReqSkills.split(",").map((s) => s.trim()).filter(Boolean) : undefined
      const req: Record<string, unknown> = {}
      if (editReqEducationLevel.trim() !== "") req.educationLevel = editReqEducationLevel.trim()
      if (editReqCareerStage.trim() !== "") req.careerStage = editReqCareerStage.trim()
      if (skillsArray && skillsArray.length) req.skills = skillsArray
      if (editReqExperience.trim() !== "") req.experience = editReqExperience.trim()
      if (editReqAgeRange.trim() !== "") req.ageRange = editReqAgeRange.trim()
      if (editReqCitizenship.trim() !== "") req.citizenship = editReqCitizenship.trim()
      if (editReqEligibleParticipants.trim() !== "") req.Eligible_participants = editReqEligibleParticipants.trim()
      if (editReqOther.trim() !== "") req.other = editReqOther.trim()
      if (Object.keys(req).length > 0) {
        requirementsUpdate = req
      } else {
        requirementsUpdate = undefined
      }
    }
    const previousItem = content.find((c) => c._id === id)
    const updated: ContentItem = {
      ...selectedContent,
      title,
      description,
      status: editStatus,
      applicationLink: editApplicationLink.trim() || undefined,
      externalLink: editExternalLink.trim() || undefined,
      eventLink: editEventLink.trim() || undefined,
      url: editUrl.trim() || undefined,
      location: {
        ...selectedContent.location,
        city: editLocationCity.trim() || undefined,
        country: editLocationCountry.trim() || undefined,
        province: editLocationProvince.trim() || undefined,
        address: editLocationAddress.trim() || undefined,
        isRemote: editLocationRemote,
        isHybrid: editLocationHybrid,
      },
      company: editCompany.trim() || undefined,
      category: editCategory.trim() || undefined,
      jobType: editJobType.trim() || undefined,
      tags: editTags.trim() ? editTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      pay: selectedContent.type === "job" && (editPrice !== "" || editPayPeriod.trim())
        ? { ...(selectedContent.pay as object || {}), amount: editPrice === "" ? undefined : Number(editPrice), currency: editCurrency.trim() || undefined, period: editPayPeriod.trim() || undefined }
        : selectedContent.pay,
      financial: {
        ...selectedContent.financial,
        amount: editPrice === "" ? undefined : Number(editPrice),
        currency: editCurrency.trim() || undefined,
        benefits: benefitsList?.length ? benefitsList : undefined,
        period: editPayPeriod.trim() || undefined,
      },
      paymentAmount: editPaymentAmount === "" ? undefined : Number(editPaymentAmount),
      paymentNotes: editPaymentNotes.trim() || undefined,
      price: editPrice === "" ? undefined : Number(editPrice),
      currency: editCurrency.trim() || undefined,
      benefits: benefitsList?.length ? benefitsList : undefined,
      requirements:
        requirementsUpdate && selectedContent.type === "opportunity"
          ? { ...(selectedContent.requirements || {}), ...requirementsUpdate }
          : selectedContent.requirements,
      dates: {
        ...selectedContent.dates,
        applicationDeadline: editAppDeadline ? new Date(editAppDeadline).toISOString() : undefined,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        registrationDeadline: editRegistrationDeadline ? new Date(editRegistrationDeadline).toISOString() : undefined,
        duration: editDuration.trim() || undefined,
      },
      // Once an item is made active, treat it as no longer coming from an *-inactive bucket
      _fromInactive: editStatus === "active" ? false : selectedContent._fromInactive,
    }
    setContent((prev) => prev.map((c) => (c._id === id ? updated : c)))
    setSelectedContent(updated)
    setDetailsEditMode(false)
    setDetailsSaveLoading(true)
    try {
      const descriptionChanged = description !== selectedContent.description
      // Event API requires description min 20 chars and does not accept undefined in nested objects (would overwrite existing data)
      if (selectedContent.type === "event") {
        const eventDescription = description.trim() || (selectedContent.description ?? "")
        if (eventDescription.length > 0 && eventDescription.length < 20) {
          toast.error("Event description must be at least 20 characters.")
          setDetailsSaveLoading(false)
          setDetailsEditMode(true)
          return
        }
        const omitUndefined = <T extends Record<string, unknown>>(o: T): Partial<T> =>
          Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
        const eventLocation = omitUndefined({
          city: editLocationCity.trim() || undefined,
          country: editLocationCountry.trim() || undefined,
          province: editLocationProvince.trim() || undefined,
          address: editLocationAddress.trim() || undefined,
          isRemote: editLocationRemote,
          isHybrid: editLocationHybrid,
        })
        const eventDates = omitUndefined({
          startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
          endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
          registrationDeadline: editRegistrationDeadline ? new Date(editRegistrationDeadline).toISOString() : undefined,
        })
        await ApiClient.updateContentByAdmin(id, "event", {
          title,
          description: eventDescription || undefined,
          status: editStatus,
          url: editUrl.trim() || undefined,
          ...(Object.keys(eventLocation).length > 0 && { location: eventLocation }),
          ...(Object.keys(eventDates).length > 0 && { dates: eventDates }),
          ...(editPrice !== "" && { price: Number(editPrice) }),
          ...(editCurrency.trim() && { currency: editCurrency.trim() }),
          ...(editPaymentAmount !== "" && { paymentAmount: Number(editPaymentAmount) }),
          ...(editPaymentNotes.trim() && { paymentNotes: editPaymentNotes.trim() }),
          ...(selectedContent._fromInactive && { _fromInactive: true }),
        })
      } else {
        await ApiClient.updateContentByAdmin(id, selectedContent.type, {
          title,
          ...(descriptionChanged && { description }),
          status: editStatus,
          applicationLink: editApplicationLink.trim() || undefined,
          externalLink: editExternalLink.trim() || undefined,
          eventLink: editEventLink.trim() || undefined,
          url: editUrl.trim() || undefined,
          location: {
            city: editLocationCity.trim() || undefined,
            country: editLocationCountry.trim() || undefined,
            province: editLocationProvince.trim() || undefined,
            address: editLocationAddress.trim() || undefined,
            isRemote: editLocationRemote,
            isHybrid: editLocationHybrid,
          },
          ...(selectedContent.type === "job" && {
            ...(editCompany.trim() && { company: editCompany.trim() }),
            ...(editCategory.trim() && { category: editCategory.trim() }),
            ...(editJobType.trim() || (selectedContent.jobType as string)
              ? { jobType: jobTypeToBackendFormat(editJobType.trim() || (selectedContent.jobType as string)) }
              : {}),
            ...(editTags.trim() && { tags: editTags.split(",").map((t) => t.trim()).filter(Boolean) }),
            ...((editPrice !== "" || editPayPeriod.trim()) && {
              pay: {
                ...(editPrice !== "" && { amount: Number(editPrice) }),
                ...(editCurrency.trim() && { currency: editCurrency.trim() }),
                ...(editPayPeriod.trim() && { period: editPayPeriod.trim() }),
              },
            }),
          }),
          paymentAmount: editPaymentAmount === "" ? undefined : Number(editPaymentAmount),
          paymentNotes: editPaymentNotes.trim() || undefined,
          price: editPrice === "" ? undefined : Number(editPrice),
          currency: editCurrency.trim() || undefined,
          benefits: benefitsList,
          ...(requirementsUpdate && selectedContent.type === "opportunity" ? { requirements: requirementsUpdate } : {}),
          dates: {
            applicationDeadline: editAppDeadline ? new Date(editAppDeadline).toISOString() : undefined,
            startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
            endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
            registrationDeadline: editRegistrationDeadline ? new Date(editRegistrationDeadline).toISOString() : undefined,
            duration: editDuration.trim() || undefined,
          },
          ...(selectedContent._fromInactive ? { _fromInactive: true } : {}),
        })
      }
      toast.success("Content updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update content")
      if (previousItem) {
        setContent((prev) => prev.map((c) => (c._id === id ? previousItem : c)))
        setSelectedContent(previousItem)
        setEditTitle(previousItem.title)
        setEditDescription(previousItem.description)
        setEditStatus(previousItem.status)
        setEditApplicationLink(previousItem.applicationLink ?? "")
        setEditExternalLink(previousItem.externalLink ?? "")
        setEditEventLink(previousItem.eventLink ?? "")
        setEditUrl(previousItem.url ?? "")
        setEditLocationCity(previousItem.location?.city ?? "")
        setEditLocationCountry(previousItem.location?.country ?? "")
        setEditLocationProvince(previousItem.location?.province ?? "")
        setEditLocationRemote(previousItem.location?.isRemote ?? false)
        setEditLocationHybrid((previousItem.location as { isHybrid?: boolean })?.isHybrid ?? false)
        setEditLocationAddress((previousItem.location as { address?: string })?.address ?? "")
        setEditCompany(previousItem.company ?? "")
        setEditCategory(previousItem.category ?? "")
        setEditJobType(jobTypeToDisplayFormat(previousItem.jobType as string))
        setEditTags(Array.isArray(previousItem.tags) ? (previousItem.tags as string[]).join(", ") : "")
        setEditPayPeriod((previousItem.pay as { period?: string })?.period ?? (previousItem.financial as { period?: string })?.period ?? "")
        setEditPaymentAmount(previousItem.paymentAmount ?? "")
        setEditPaymentNotes(previousItem.paymentNotes ?? "")
        const p = previousItem.price ?? previousItem.financial?.amount ?? ""
        setEditPrice(p === "" ? "" : Number(p))
        setEditCurrency(previousItem.currency ?? previousItem.financial?.currency ?? "")
        const b = previousItem.benefits ?? previousItem.financial?.benefits ?? []
        setEditBenefits(Array.isArray(b) ? b.join("\n") : "")
        setEditAppDeadline(previousItem.dates?.applicationDeadline ? previousItem.dates.applicationDeadline.slice(0, 16) : "")
        setEditStartDate(previousItem.dates?.startDate ? previousItem.dates.startDate.slice(0, 16) : "")
        setEditEndDate(previousItem.dates?.endDate ? previousItem.dates.endDate.slice(0, 16) : "")
        setEditRegistrationDeadline(previousItem.dates?.registrationDeadline ? previousItem.dates.registrationDeadline.slice(0, 16) : "")
        setEditDuration(previousItem.dates?.duration ?? "")
        setDetailsEditMode(true)
      }
    } finally {
      setDetailsSaveLoading(false)
    }
  }

  const getPublicContentUrl = (item: ContentItem) => {
    const base = "/"
    switch (item.type) {
      case "opportunity": return `${base}opportunities/${item._id}`
      case "event": return `${base}events/${item._id}`
      case "job": return `${base}jobs/${item._id}`
      case "resource": return `${base}resources/${item._id}`
      default: return "#"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "opportunity": return RiFocus3Line
      case "event": return RiCalendarLine
      case "job": return RiBriefcaseLine
      case "resource": return RiBookLine
      default: return RiFileLine
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "opportunity": return "text-orange-500 bg-orange-500/10 border-orange-500/20"
      case "event": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      case "job": return "text-amber-500 bg-amber-500/10 border-amber-500/20"
      case "resource": return "text-violet-500 bg-violet-500/10 border-violet-500/20"
      default: return "text-muted-foreground bg-muted border-border"
    }
  }

  const getStatusBadge = (item: ContentItem) => {
    const isLive = item.status === "active" && item.isApproved
    const isPending = item.status === "active" && !item.isApproved
    const isDraft = item.status === "draft"
    const isInactive = item.status === "inactive"
    if (isLive) return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0">Live</Badge>
    if (isPending) return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">Pending</Badge>
    if (isDraft) return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Draft</Badge>
    if (isInactive) return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0">Inactive</Badge>
    return null
  }

  const getPaymentBadge = (item: ContentItem) => {
    if (!item.paymentStatus || item.paymentStatus === "not_required")
      return <Badge className="bg-gray-500/15 text-gray-600 dark:text-gray-400 border-0 text-xs">No payment</Badge>
    if (item.paymentStatus === "awaiting_payment")
      return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 text-xs">Awaiting</Badge>
    if (item.paymentStatus === "payment_uploaded")
      return <Badge className="bg-primary/20 text-primary border-0 text-xs">Uploaded</Badge>
    if (item.paymentStatus === "verified")
      return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-xs">Verified</Badge>
    if (item.paymentStatus === "failed")
      return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0 text-xs">Failed</Badge>
    return null
  }

  const stats = useMemo(
    () => ({
      live: counts.live,
      pending: counts.pending,
      drafts: counts.drafts,
      inactive: counts.inactive,
    }),
    [counts]
  )

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-page">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-page px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border-2 border-red-500/20">
            <RiErrorWarningLine className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-8">Admin or super admin access required.</p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-2xl px-6">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
    <AdminLayout
      pageTitle="Content"
      pageSubtitle="Moderate"
      PageIcon={RiFileLine}
      onRefresh={fetchFirstPage}
      refreshLoading={loading}
      backHref="/dashboard/admin"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Page title + back (desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm" className="rounded-2xl text-muted-foreground hover:text-foreground">
                  <Link href="/dashboard/admin" className="flex items-center gap-2">
                    <RiArrowLeftLine className="w-4 h-4" />
                    Back
                  </Link>
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Content moderation</h1>
                  <p className="text-sm text-muted-foreground">Review, approve, and manage platform content (live + opportunity-inactive, events-inactive, jobs-inactive, resources-inactive)</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchFirstPage()} disabled={loading} className="rounded-2xl border-border">
                <RiRefreshLine className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <RiErrorWarningLine className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
              </div>
            )}

            {/* Stats — bento style, one dark "Total" card */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <RiCheckboxCircleLine className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.live}</p>
                <p className="text-xs text-muted-foreground mt-1">Active & approved</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <RiTimeLine className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drafts</span>
                  <div className="w-10 h-10 rounded-xl bg-gray-500/15 flex items-center justify-center">
                    <RiFileLine className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{stats.drafts}</p>
                <p className="text-xs text-muted-foreground mt-1">Unpublished</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 p-5 shadow-lg text-white border-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/80 uppercase tracking-wider">Total</span>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <RiBarChartBoxLine className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{totalCount.toLocaleString()}</p>
                <p className="text-xs text-white/80 mt-1">All content</p>
              </div>
            </div>

            {/* Search + filter system — chip-based */}
            <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 sm:p-5 shadow-sm mb-6">
              {/* Search bar — prominent */}
              <div className="relative mb-5">
                <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search content by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-10 h-12 rounded-2xl border-border/80 bg-muted/30 dark:bg-muted/20 text-foreground placeholder:text-muted-foreground text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTypeFilter(opt.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          typeFilter === opt.value
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted/50 dark:bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatusFilter(opt.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          statusFilter === opt.value
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted/50 dark:bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment</p>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentFilter(opt.value)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            paymentFilter === opt.value
                              ? "bg-primary text-white shadow-md"
                              : "bg-muted/50 dark:bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="ml-auto self-end px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Initial loading — skeleton cards */}
            {loading && content.length === 0 && (
              <div className="space-y-4 mb-6">
                {[...Array(5)].map((_, i) => (
                  <AdminContentCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && content.length === 0 && (
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <RiFileLine className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No content found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try changing filters or search.</p>
                <Button variant="outline" onClick={clearAllFilters} className="rounded-2xl">Clear filters</Button>
              </div>
            )}

            {/* Content list — ticket-style cards with left gradient rail */}
            {content.length > 0 && (
              <div className="space-y-4 mb-6">
                {content.map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  return (
                    <article
                      key={item._id}
                      className="rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all flex min-h-[140px]"
                    >
                      {/* Left rail — gradient by type + icon */}
                      <div
                        className={cn(
                          "w-16 sm:w-20 flex-shrink-0 bg-gradient-to-b flex items-center justify-center",
                          item.type === "opportunity" && "from-orange-500 to-amber-500",
                          item.type === "event" && "from-emerald-500 to-teal-500",
                          item.type === "job" && "from-amber-500 to-orange-600",
                          item.type === "resource" && "from-violet-500 to-purple-600",
                          !["opportunity", "event", "job", "resource"].includes(item.type) && "from-gray-500 to-gray-600"
                        )}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-white drop-shadow-sm" />
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex-1 min-w-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4",
                          item.type === "opportunity" && "border-l-4 border-l-orange-500",
                          item.type === "event" && "border-l-4 border-l-emerald-500",
                          item.type === "job" && "border-l-4 border-l-amber-500",
                          item.type === "resource" && "border-l-4 border-l-violet-500"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {getStatusBadge(item)}
                            {getPaymentBadge(item)}
                            {item._fromInactive && (
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                {item.type}-inactive
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-foreground line-clamp-1 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {item.poster && (
                              <span className="flex items-center gap-1.5">
                                <RiUserLine className="w-3.5 h-3.5" />
                                {item.poster.name || "Unknown"}
                              </span>
                            )}
                            {item.location?.city && (
                              <span className="flex items-center gap-1.5">
                                <RiMapPinLine className="w-3.5 h-3.5" />
                                {item.location.city}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <RiCalendarLine className="w-3.5 h-3.5" />
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedContent(item); setShowDetailsDialog(true) }}
                            className="rounded-xl border-border h-9"
                          >
                            <RiEyeLine className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          {!item.isApproved && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => { setSelectedContent(item); setReviewAction("approve"); setShowReviewDialog(true) }}
                                disabled={actionLoading === item._id}
                                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 h-9"
                              >
                                <RiCheckboxCircleLine className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSelectedContent(item); setReviewAction("reject"); setShowReviewDialog(true) }}
                                disabled={actionLoading === item._id}
                                className="rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 h-9"
                              >
                                <RiCloseCircleLine className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Reject</span>
                              </Button>
                            </>
                          )}
                          {item.isApproved && item.paymentStatus === "awaiting_payment" && (
                            <Button variant="outline" size="sm" onClick={() => handleRequestPayment(item)} disabled={actionLoading === item._id} className="rounded-xl border-primary/30 text-primary h-9">
                              <RiMoneyDollarCircleLine className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Request</span>
                            </Button>
                          )}
                          {item.paymentStatus === "payment_uploaded" && (
                            <Button variant="outline" size="sm" onClick={() => { setSelectedContent(item); setShowPaymentDialog(true) }} disabled={actionLoading === item._id} className="rounded-xl border-violet-500/30 text-violet-500 h-9">
                              <RiBankCardLine className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Verify</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {content.length > 0 && (
              <div ref={sentinelRef} style={{ height: 1, width: "100%", marginTop: `${threshold}px` }} />
            )}

            {/* Loading more — skeleton cards */}
            {loadingMore && content.length > 0 && (
              <div className="space-y-4 pt-2">
                <AdminContentCardSkeleton />
                <AdminContentCardSkeleton />
                <AdminContentCardSkeleton />
              </div>
            )}

            {!hasMore && content.length > 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl bg-white/50 dark:bg-card/50 border border-border/50">
                You&apos;ve reached the end · {content.length} of {totalCount} loaded
              </div>
            )}
          </div>
    </AdminLayout>

      {/* Review dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="rounded-3xl border-border bg-white dark:bg-card shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {reviewAction === "approve" ? "Approve content" : "Reject content"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "This will be published on the platform."
                : "Provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          {reviewAction === "approve" && (
            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="bypassPayment"
                checked={bypassPayment}
                onChange={(e) => setBypassPayment(e.target.checked)}
                className="w-4 h-4 rounded border-border text-orange-500"
              />
              <label htmlFor="bypassPayment" className="text-sm text-muted-foreground">
                Approve without requiring payment
              </label>
            </div>
          )}
          {reviewAction === "reject" && (
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="rounded-2xl bg-muted/50 border-border min-h-[100px]"
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowReviewDialog(false); setRejectionReason(""); setBypassPayment(false); setSelectedContent(null) }} className="rounded-2xl">
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={actionLoading === selectedContent?._id || (reviewAction === "reject" && !rejectionReason.trim())}
              className={cn("rounded-2xl", reviewAction === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}
            >
              {reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="rounded-3xl border-border bg-white dark:bg-card shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedContent?.paymentStatus === "payment_uploaded" ? "Verify payment" : "Request payment"}
            </DialogTitle>
            <DialogDescription>
              {selectedContent?.paymentStatus === "payment_uploaded"
                ? "Confirm or reject the uploaded receipt."
                : "Set the amount to request."}
            </DialogDescription>
          </DialogHeader>
          {selectedContent?.paymentStatus === "payment_uploaded" ? (
            <div className="space-y-4">
              <Select value={paymentVerification} onValueChange={(v: "verify" | "reject") => setPaymentVerification(v)}>
                <SelectTrigger className="rounded-2xl bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="verify">Verify payment</SelectItem>
                  <SelectItem value="reject">Reject payment</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Notes..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="rounded-2xl bg-muted/50 border-border min-h-[80px]" />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Amount (₦)</label>
              <Input type="number" value={paymentAmountInput} onChange={(e) => setPaymentAmountInput(Number(e.target.value))} className="rounded-2xl bg-muted/50 border-border" placeholder="5000" />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowPaymentDialog(false); setPaymentNotes(""); setSelectedContent(null) }} className="rounded-2xl">Cancel</Button>
            <Button onClick={selectedContent?.paymentStatus === "payment_uploaded" ? handlePaymentVerification : handleConfirmPaymentRequest} disabled={actionLoading === selectedContent?._id} className="rounded-2xl bg-primary hover:bg-primary/90">
              {selectedContent?.paymentStatus === "payment_uploaded" ? "Verify" : "Request payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog — full details, payment link, inline edit */}
      <Dialog open={showDetailsDialog} onOpenChange={(open) => { if (!open) setDetailsEditMode(false); setShowDetailsDialog(open); if (!open) setSelectedContent(null) }}>
        <DialogContent className="rounded-3xl border-border bg-white dark:bg-card shadow-2xl max-w-2xl max-h-[90vh] overflow-hidden p-0 flex flex-col" aria-describedby={undefined}>
          {selectedContent && (
            <>
              <DialogTitle className="sr-only">View: {selectedContent.title}</DialogTitle>
              <div
                className={cn(
                  "h-2 w-full rounded-t-3xl",
                  selectedContent.type === "opportunity" && "bg-gradient-to-r from-orange-500 to-amber-500",
                  selectedContent.type === "event" && "bg-gradient-to-r from-emerald-500 to-teal-500",
                  selectedContent.type === "job" && "bg-gradient-to-r from-amber-500 to-orange-600",
                  selectedContent.type === "resource" && "bg-gradient-to-r from-violet-500 to-purple-600"
                )}
              />
              <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border", getTypeColor(selectedContent.type))}>
                    {(() => { const Icon = getTypeIcon(selectedContent.type); return <Icon className="w-3.5 h-3.5" /> })()}
                    {selectedContent.type}
                  </span>
                  {getStatusBadge(selectedContent)}
                  {getPaymentBadge(selectedContent)}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(selectedContent.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {detailsEditMode ? (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl border-border" placeholder="Title" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="rounded-xl border-border min-h-[120px]" placeholder="Description" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "active" | "inactive" | "draft")}>
                        <SelectTrigger className="rounded-xl border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Application link (URL)</label>
                        <Input value={editApplicationLink} onChange={(e) => setEditApplicationLink(e.target.value)} className="rounded-xl border-border" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">External link (URL)</label>
                        <Input value={editExternalLink} onChange={(e) => setEditExternalLink(e.target.value)} className="rounded-xl border-border" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event link (URL)</label>
                        <Input value={editEventLink} onChange={(e) => setEditEventLink(e.target.value)} className="rounded-xl border-border" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source / main URL</label>
                        <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="rounded-xl border-border" placeholder="https://..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location — City</label>
                        <Input value={editLocationCity} onChange={(e) => setEditLocationCity(e.target.value)} className="rounded-xl border-border" placeholder="City" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location — Country</label>
                        <Input value={editLocationCountry} onChange={(e) => setEditLocationCountry(e.target.value)} className="rounded-xl border-border" placeholder="Country" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location — Province / State</label>
                        <Input value={editLocationProvince} onChange={(e) => setEditLocationProvince(e.target.value)} className="rounded-xl border-border" placeholder="Province" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location — Address</label>
                        <Input value={editLocationAddress} onChange={(e) => setEditLocationAddress(e.target.value)} className="rounded-xl border-border" placeholder="Address" />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="edit-remote" checked={editLocationRemote} onChange={(e) => setEditLocationRemote(e.target.checked)} className="rounded border-border" />
                          <label htmlFor="edit-remote" className="text-sm text-muted-foreground">Remote</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="edit-hybrid" checked={editLocationHybrid} onChange={(e) => setEditLocationHybrid(e.target.checked)} className="rounded border-border" />
                          <label htmlFor="edit-hybrid" className="text-sm text-muted-foreground">Hybrid</label>
                        </div>
                      </div>
                    </div>
                    {selectedContent.type === "job" && (
                      <div className="space-y-3 pt-2 border-t border-border/60">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Company</label>
                            <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className="rounded-xl border-border" placeholder="Company name" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                            <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="rounded-xl border-border" placeholder="e.g. Technology" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job type</label>
                            <Select value={editJobType} onValueChange={(v) => setEditJobType(v)}>
                              <SelectTrigger className="rounded-xl border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                {JOB_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags (comma separated)</label>
                            <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} className="rounded-xl border-border" placeholder="e.g. React, Node.js, Remote" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment amount (₦)</label>
                        <Input
                          type="number"
                          value={editPaymentAmount}
                          onChange={(e) => setEditPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="rounded-xl border-border"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price / amount (leave blank if free)</label>
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value === "" ? "" : Number(e.target.value))}
                          className="rounded-xl border-border"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
                        <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} className="rounded-xl border-border" placeholder="NGN / USD" />
                      </div>
                      {(selectedContent.type === "job" || selectedContent.type === "opportunity") && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pay period (e.g. month, year)</label>
                          <Input value={editPayPeriod} onChange={(e) => setEditPayPeriod(e.target.value)} className="rounded-xl border-border" placeholder="month" />
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment notes</label>
                        <Textarea value={editPaymentNotes} onChange={(e) => setEditPaymentNotes(e.target.value)} className="rounded-xl border-border min-h-[60px]" placeholder="Admin notes" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Benefits (one per line)</label>
                      <Textarea
                        value={editBenefits}
                        onChange={(e) => setEditBenefits(e.target.value)}
                        className="rounded-xl border-border min-h-[80px]"
                        placeholder={"Benefit 1\nBenefit 2"}
                      />
                    </div>
                    {selectedContent.type === "opportunity" && (
                      <div className="space-y-3 pt-2 border-t border-border/60">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Requirements (opportunity)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Education level</label>
                            <Select
                              value={editReqEducationLevel}
                              onValueChange={(v) => setEditReqEducationLevel(v)}
                            >
                              <SelectTrigger className="rounded-xl border-border text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-xs">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Career stage</label>
                            <Select
                              value={editReqCareerStage}
                              onValueChange={(v) => setEditReqCareerStage(v)}
                            >
                              <SelectTrigger className="rounded-xl border-border text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {CAREER_STAGE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-xs">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Skills (comma separated)
                            </label>
                            <Input
                              value={editReqSkills}
                              onChange={(e) => setEditReqSkills(e.target.value)}
                              className="rounded-xl border-border text-xs"
                              placeholder="e.g. Leadership, Public speaking"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Experience</label>
                            <Input
                              value={editReqExperience}
                              onChange={(e) => setEditReqExperience(e.target.value)}
                              className="rounded-xl border-border text-xs"
                              placeholder="e.g. 1–3 years"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Age range</label>
                            <Input
                              value={editReqAgeRange}
                              onChange={(e) => setEditReqAgeRange(e.target.value)}
                              className="rounded-xl border-border text-xs"
                              placeholder="e.g. 18–35"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Citizenship</label>
                            <Input
                              value={editReqCitizenship}
                              onChange={(e) => setEditReqCitizenship(e.target.value)}
                              className="rounded-xl border-border text-xs"
                              placeholder="e.g. Nigerian, Any"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Eligible participants
                            </label>
                            <Input
                              value={editReqEligibleParticipants}
                              onChange={(e) => setEditReqEligibleParticipants(e.target.value)}
                              className="rounded-xl border-border text-xs"
                              placeholder="e.g. Women in tech, Students in Africa"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Other notes
                            </label>
                            <Textarea
                              value={editReqOther}
                              onChange={(e) => setEditReqOther(e.target.value)}
                              className="rounded-xl border-border min-h-[60px] text-xs"
                              placeholder="Any other eligibility details"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Application deadline</label>
                        <Input type="datetime-local" value={editAppDeadline} onChange={(e) => setEditAppDeadline(e.target.value)} className="rounded-xl border-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start date</label>
                        <Input type="datetime-local" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="rounded-xl border-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">End date</label>
                        <Input type="datetime-local" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="rounded-xl border-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Registration deadline</label>
                        <Input type="datetime-local" value={editRegistrationDeadline} onChange={(e) => setEditRegistrationDeadline(e.target.value)} className="rounded-xl border-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</label>
                        <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="rounded-xl border-border" placeholder="e.g. 3 months" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-6">{selectedContent.title}</h2>
                    <section className="mb-6">
                      <p className="text-base leading-relaxed text-foreground/95 max-w-prose" style={{ wordBreak: "break-word" }}>
                        {selectedContent.description}
                      </p>
                    </section>
                  </>
                )}

                {!detailsEditMode && (
                <>
                <section className="space-y-3 mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Content ID</p>
                      <p className="text-sm font-mono text-foreground break-all">{selectedContent._id}</p>
                    </div>
                    {selectedContent.poster && (
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                          <RiUserLine className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Posted by</p>
                          <p className="text-sm font-medium truncate">{selectedContent.poster.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{selectedContent.poster.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                        <RiCalendarLine className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Created</p>
                        <p className="text-sm font-medium">{new Date(selectedContent.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(selectedContent.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                        <RiCalendarLine className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Updated</p>
                        <p className="text-sm font-medium">{new Date(selectedContent.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                    </div>
                    {selectedContent.approvedAt && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Approved</p>
                        <p className="text-sm font-medium">{new Date(selectedContent.approvedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        {selectedContent.approvedBy && <p className="text-xs text-muted-foreground">{selectedContent.approvedBy}</p>}
                      </div>
                    )}
                    {selectedContent.publishedAt && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Published</p>
                        <p className="text-sm font-medium">{new Date(selectedContent.publishedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedContent)}</div>
                    </div>
                    {selectedContent.type === "job" && (selectedContent.company || selectedContent.category || (selectedContent as ContentItem & { jobType?: string }).jobType) && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 sm:col-span-2 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Job details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedContent.company && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Company</p>
                              <p className="text-sm font-medium">{selectedContent.company}</p>
                            </div>
                          )}
                          {selectedContent.category && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Category</p>
                              <p className="text-sm font-medium">{selectedContent.category}</p>
                            </div>
                          )}
                          {(selectedContent as ContentItem & { jobType?: string }).jobType && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Job type</p>
                              <p className="text-sm font-medium">{(selectedContent as ContentItem & { jobType?: string }).jobType}</p>
                            </div>
                          )}
                        </div>
                        {Array.isArray(selectedContent.tags) && selectedContent.tags.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Tags</p>
                            <p className="text-sm text-foreground/90">{(selectedContent.tags as string[]).join(", ")}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedContent.location && (
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50 sm:col-span-2">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                          <RiMapPinLine className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Location</p>
                          <p className="text-sm font-medium">
                            {[selectedContent.location.city, selectedContent.location.province, selectedContent.location.country].filter(Boolean).join(", ") || "N/A"}
                            {selectedContent.location.isRemote ? " · Remote" : ""}
                            {(selectedContent.location as { isHybrid?: boolean }).isHybrid ? " · Hybrid" : ""}
                          </p>
                          {selectedContent.location.address && (
                            <p className="text-xs text-muted-foreground mt-0.5">{selectedContent.location.address}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {(selectedContent.dates && (selectedContent.dates.applicationDeadline || selectedContent.dates.startDate || selectedContent.dates.endDate || selectedContent.dates.duration || selectedContent.dates.registrationDeadline)) && (
                  <section className="space-y-3 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dates</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedContent.dates.applicationDeadline && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Application deadline</p>
                          <p className="text-sm font-medium">{new Date(selectedContent.dates.applicationDeadline).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      )}
                      {selectedContent.dates.registrationDeadline && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Registration deadline</p>
                          <p className="text-sm font-medium">{new Date(selectedContent.dates.registrationDeadline).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      )}
                      {selectedContent.dates.startDate && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Start date</p>
                          <p className="text-sm font-medium">{new Date(selectedContent.dates.startDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      )}
                      {selectedContent.dates.endDate && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">End date</p>
                          <p className="text-sm font-medium">{new Date(selectedContent.dates.endDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      )}
                      {selectedContent.dates.duration && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Duration</p>
                          <p className="text-sm font-medium">{selectedContent.dates.duration}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {((selectedContent.benefits && selectedContent.benefits.length > 0) || (selectedContent.financial?.benefits && selectedContent.financial.benefits.length > 0)) && (
                  <section className="space-y-3 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Benefits</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                      {(selectedContent.benefits ?? selectedContent.financial?.benefits ?? []).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {selectedContent.requirements && (Array.isArray(selectedContent.requirements) ? (selectedContent.requirements as unknown[]).length > 0 : Object.keys(selectedContent.requirements).length > 0) && (
                  <section className="space-y-3 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requirements</h3>
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                      {(() => {
                        if (Array.isArray(selectedContent.requirements)) {
                          return (
                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                              {(selectedContent.requirements as string[]).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          )
                        }
                        const req = selectedContent.requirements as Record<string, unknown>
                        const hasStructured =
                          req.educationLevel ||
                          req.careerStage ||
                          (Array.isArray(req.skills) && req.skills.length > 0) ||
                          req.experience ||
                          req.ageRange ||
                          req.citizenship ||
                          req.Eligible_participants ||
                          req.other

                        if (!hasStructured) {
                          return (
                            <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans">
                              {JSON.stringify(selectedContent.requirements, null, 2)}
                            </pre>
                          )
                        }

                        return (
                          <dl className="space-y-1 text-xs text-foreground/90">
                            {req.educationLevel != null && req.educationLevel !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Education level:</dt>
                                <dd>{String(req.educationLevel)}</dd>
                              </div>
                            )}
                            {req.careerStage != null && req.careerStage !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Career stage:</dt>
                                <dd>{String(req.careerStage)}</dd>
                              </div>
                            )}
                            {((Array.isArray(req.skills) && req.skills.length > 0) || req.skills) ? (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Skills:</dt>
                                <dd>
                                  {Array.isArray(req.skills) ? (req.skills as string[]).join(", ") : String(req.skills)}
                                </dd>
                              </div>
                            ) : null}
                            {req.experience != null && req.experience !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Experience:</dt>
                                <dd>{String(req.experience)}</dd>
                              </div>
                            )}
                            {req.ageRange != null && req.ageRange !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Age range:</dt>
                                <dd>{String(req.ageRange)}</dd>
                              </div>
                            )}
                            {req.citizenship != null && req.citizenship !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Citizenship:</dt>
                                <dd>{String(req.citizenship)}</dd>
                              </div>
                            )}
                            {req.Eligible_participants != null && req.Eligible_participants !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Eligible participants:</dt>
                                <dd>{String(req.Eligible_participants)}</dd>
                              </div>
                            )}
                            {req.other != null && req.other !== "" && (
                              <div className="flex gap-1">
                                <dt className="font-semibold text-muted-foreground">Other:</dt>
                                <dd className="whitespace-pre-wrap">{String(req.other)}</dd>
                              </div>
                            )}
                          </dl>
                        )
                      })()}
                    </div>
                  </section>
                )}

                <section className="space-y-3 mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Payment status</p>
                      <div className="mt-1">{getPaymentBadge(selectedContent)}</div>
                    </div>
                    {(selectedContent.paymentAmount != null && selectedContent.paymentAmount > 0) && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Payment amount (posting fee)</p>
                        <p className="text-sm font-medium">₦{Number(selectedContent.paymentAmount).toLocaleString()}</p>
                      </div>
                    )}
                    {(selectedContent.price != null || selectedContent.financial?.amount != null || (selectedContent.pay as { amount?: number })?.amount != null) && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Price / amount (content)</p>
                        <p className="text-sm font-medium">
                          {selectedContent.currency || selectedContent.financial?.currency || (selectedContent.pay as { currency?: string })?.currency || "NGN"}{" "}
                          {Number(selectedContent.price ?? selectedContent.financial?.amount ?? (selectedContent.pay as { amount?: number })?.amount ?? 0).toLocaleString()}
                          {(selectedContent.pay as { period?: string })?.period && (
                            <span className="text-muted-foreground font-normal"> / {(selectedContent.pay as { period?: string }).period}</span>
                          )}
                          {(selectedContent.financial as { period?: string })?.period && !(selectedContent.pay as { period?: string })?.period && (
                            <span className="text-muted-foreground font-normal"> / {(selectedContent.financial as { period?: string }).period}</span>
                          )}
                        </p>
                      </div>
                    )}
                    {selectedContent.paymentNotes && (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 sm:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Payment notes</p>
                        <p className="text-sm text-foreground/90">{String(selectedContent.paymentNotes)}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button variant="outline" size="sm" className="rounded-xl" asChild>
                        <Link href="/dashboard/admin/receipts" target="_blank" rel="noopener noreferrer">
                          <RiExternalLinkLine className="w-4 h-4 mr-2" />
                          View all receipts
                        </Link>
                      </Button>
                      {(selectedContent.paymentReceipt && String(selectedContent.paymentReceipt).startsWith("http")) && (
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <a href={String(selectedContent.paymentReceipt)} target="_blank" rel="noopener noreferrer">
                            <RiBankCardLine className="w-4 h-4 mr-2" />
                            View receipt
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links & URLs</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" asChild>
                      <a href={getPublicContentUrl(selectedContent)} target="_blank" rel="noopener noreferrer">
                        <RiExternalLinkLine className="w-4 h-4 mr-2" />
                        View on site
                      </a>
                    </Button>
                    {selectedContent.url && (
                      <Button variant="outline" size="sm" className="rounded-xl" asChild>
                        <a href={String(selectedContent.url)} target="_blank" rel="noopener noreferrer">
                          <RiExternalLinkLine className="w-4 h-4 mr-2" />
                          Source / main URL
                        </a>
                      </Button>
                    )}
                    {selectedContent.applicationLink && (
                      <Button variant="outline" size="sm" className="rounded-xl" asChild>
                        <a href={String(selectedContent.applicationLink)} target="_blank" rel="noopener noreferrer">
                          <RiExternalLinkLine className="w-4 h-4 mr-2" />
                          Application link
                        </a>
                      </Button>
                    )}
                    {(selectedContent.externalLink || selectedContent.eventLink) && (
                      <Button variant="outline" size="sm" className="rounded-xl" asChild>
                        <a href={String(selectedContent.externalLink || selectedContent.eventLink)} target="_blank" rel="noopener noreferrer">
                          <RiExternalLinkLine className="w-4 h-4 mr-2" />
                          External link
                        </a>
                      </Button>
                    )}
                  </div>
                </section>
                </>
                )}
              </div>
              <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-muted/20 flex flex-wrap items-center gap-2">
                {detailsEditMode ? (
                  <>
                    <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => {
                      setDetailsEditMode(false)
                      setEditTitle(selectedContent.title)
                      setEditDescription(selectedContent.description)
                      setEditStatus(selectedContent.status)
                      setEditApplicationLink(selectedContent.applicationLink ?? "")
                      setEditExternalLink(selectedContent.externalLink ?? "")
                      setEditEventLink(selectedContent.eventLink ?? "")
                      setEditUrl(selectedContent.url ?? "")
                      setEditLocationCity(selectedContent.location?.city ?? "")
                      setEditLocationCountry(selectedContent.location?.country ?? "")
                      setEditLocationProvince(selectedContent.location?.province ?? "")
                      setEditLocationRemote(selectedContent.location?.isRemote ?? false)
                      setEditLocationHybrid((selectedContent.location as { isHybrid?: boolean })?.isHybrid ?? false)
                      setEditLocationAddress((selectedContent.location as { address?: string })?.address ?? "")
                      setEditCompany(selectedContent.company ?? "")
                      setEditCategory(selectedContent.category ?? "")
                      setEditJobType(jobTypeToDisplayFormat(selectedContent.jobType as string))
                      setEditTags(Array.isArray(selectedContent.tags) ? (selectedContent.tags as string[]).join(", ") : "")
                      setEditPayPeriod((selectedContent.pay as { period?: string })?.period ?? (selectedContent.financial as { period?: string })?.period ?? "")
                      setEditPaymentAmount(selectedContent.paymentAmount ?? "")
                      setEditPaymentNotes(selectedContent.paymentNotes ?? "")
                      const p = selectedContent.price ?? selectedContent.financial?.amount ?? ""
                      setEditPrice(p === "" ? "" : Number(p))
                      setEditCurrency(selectedContent.currency ?? selectedContent.financial?.currency ?? "")
                      const b = selectedContent.benefits ?? selectedContent.financial?.benefits ?? []
                      setEditBenefits(Array.isArray(b) ? b.join("\n") : "")
                      setEditAppDeadline(selectedContent.dates?.applicationDeadline ? selectedContent.dates.applicationDeadline.slice(0, 16) : "")
                      setEditStartDate(selectedContent.dates?.startDate ? selectedContent.dates.startDate.slice(0, 16) : "")
                      setEditEndDate(selectedContent.dates?.endDate ? selectedContent.dates.endDate.slice(0, 16) : "")
                      setEditRegistrationDeadline(selectedContent.dates?.registrationDeadline ? selectedContent.dates.registrationDeadline.slice(0, 16) : "")
                      setEditDuration(selectedContent.dates?.duration ?? "")
                    }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/90" onClick={handleSaveDetailsEdit} disabled={detailsSaveLoading || !editTitle.trim()}>
                      {detailsSaveLoading ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setDetailsEditMode(true)}>
                    <RiEditLine className="w-4 h-4 mr-2" />
                    Edit details
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="rounded-2xl ml-auto" onClick={() => { setShowDetailsDialog(false); setSelectedContent(null); setDetailsEditMode(false) }}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
