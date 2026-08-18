/**
 * Shape of the backend payloads we read for SEO/GEO output.
 *
 * These mirror `getPublicData()` on the backend models
 * (`latest-glowup-channel/src/models/{Event,Job,Opportunity,Resource}.js`).
 * Every field is optional: crawler-facing code must degrade rather than throw
 * when the backend omits something.
 */

export interface SeoLocation {
  country?: string | null
  province?: string | null
  city?: string | null
  address?: string | null
  isRemote?: boolean
  isHybrid?: boolean
}

export interface SeoEvent {
  _id?: string
  title?: string
  description?: string
  url?: string
  eventType?: string
  organizer?: string
  isPaid?: boolean
  price?: number | null
  currency?: string | null
  location?: SeoLocation
  dates?: {
    startDate?: string | null
    endDate?: string | null
    registrationDeadline?: string | null
    timezone?: string | null
  }
  capacity?: { maxAttendees?: number | null }
  requirements?: {
    ageRange?: string | null
    skillLevel?: string | null
    prerequisites?: string[]
  }
  tags?: string[]
  industrySectors?: string[]
  targetAudience?: string[]
  image?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface SeoJob {
  _id?: string
  title?: string
  description?: string
  url?: string
  jobType?: string
  company?: string
  location?: SeoLocation
  dates?: { applicationDeadline?: string | null; startDate?: string | null }
  pay?: {
    isPaid?: boolean
    amount?: number | null
    currency?: string | null
    period?: string | null
  }
  requirements?: unknown
  benefits?: string[]
  tags?: string[]
  industrySectors?: string[]
  targetAudience?: string[]
  image?: string | null
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface SeoOpportunity {
  _id?: string
  title?: string
  description?: string
  url?: string
  category?: string
  type?: string
  provider?: string
  location?: SeoLocation
  requirements?: {
    educationLevel?: string | null
    careerStage?: string | null
    skills?: string[]
    experience?: string | null
    ageRange?: string | null
    citizenship?: string | null
    Eligible_participants?: string | null
    other?: string | null
  }
  financial?: {
    amount?: number | null
    currency?: string | null
    isPaid?: boolean
    benefits?: string[]
  }
  dates?: {
    applicationDeadline?: string | null
    startDate?: string | null
    endDate?: string | null
    duration?: string | null
  }
  tags?: string[]
  industrySectors?: string[]
  targetAudience?: string[]
  image?: string | null
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface SeoResource {
  _id?: string
  title?: string
  description?: string
  category?: string
  resourceType?: string
  fileUrl?: string | null
  cloudinaryUrl?: string | null
  pdfUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
  pageCount?: number | null
  isPremium?: boolean
  featured?: boolean
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

/** A minimal record used to build sitemap entries without loading full documents. */
export interface SitemapItem {
  id: string
  lastModified?: string
}
