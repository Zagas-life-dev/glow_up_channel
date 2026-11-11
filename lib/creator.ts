"use client"

/** Creator dashboard, earning picks, listing requests and tips. Backend: routes/creators.js. */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"

function authHeaders(): HeadersInit {
  const out: Record<string, string> = { "Content-Type": "application/json" }
  try {
    const token = localStorage.getItem("accessToken")
    if (token) out.Authorization = `Bearer ${token}`
  } catch {
    // Storage blocked.
  }
  return out
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    throw Object.assign(new Error(json?.message || "Request failed"), { status: res.status, code: json?.code })
  }
  return json.data as T
}

export type TrafficSource = "in_app" | "direct_link" | "shared_link" | "signup"

export type DashboardPlaylist = {
  _id: string
  name: string
  coverImage: string | null
  isPublic: boolean
  isGroup: boolean
  role: "owner" | "editor"
  uniqueViews: number
  frozen: boolean
  nextBlock: { size: number; done: number; remaining: number; blocksComplete: number }
  subscribers: number
  views30d: number
  liveItems: number
  active: boolean
  earning: boolean
}

export type PublicLimit = {
  limit: number
  count: number
  overLimit: boolean
  needsPick: boolean
  playlists: { _id: string; name: string; earning: boolean }[]
}

export type CreatorDashboard = {
  config: { blockSize: number; activeMinViews30d: number; publicPlaylistLimit: number }
  totals: {
    uniqueViews: number
    creatorSubscribers: number
    playlistSubscribers: number
    publicPlaylists: number
    activePlaylists: number
  }
  program: {
    status: "not_invited" | "invited" | "member" | "removed"
    balances?: { held: number; pending: number; available: number; requested: number; paid: number }
    bestPublic: { _id: string; name: string; uniqueViews: number; target: number; progress: number } | null
  }
  sources: Record<TrafficSource, number>
  top: DashboardPlaylist[]
  playlists: DashboardPlaylist[]
  limit: PublicLimit
}

export type ListingRequest = {
  _id: string
  url: string
  details: string
  status: "pending" | "approved" | "rejected"
  note: string | null
  createdAt: string
  reviewedAt: string | null
  creator?: { _id: string; name: string | null; email: string | null }
}

export const getCreatorDashboard = () => request<CreatorDashboard>("GET", "/creators/me/dashboard")
export const setEarningPicks = (playlistIds: string[]) => request<PublicLimit>("PUT", "/playlists/earning-picks", { playlistIds })
export const getCreatorTips = () => request<{ tips: { title: string; body: string }[] }>("GET", "/creators/tips")
export const sendListingRequest = (url: string, details: string) =>
  request<{ request: ListingRequest }>("POST", "/creators/listing-requests", { url, details })
export const getMyListingRequests = () => request<{ requests: ListingRequest[] }>("GET", "/creators/listing-requests/mine")
export const getListingRequestQueue = (status: ListingRequest["status"]) =>
  request<{ requests: ListingRequest[] }>("GET", `/creators/listing-requests?status=${status}`)
export const reviewListingRequest = (id: string, status: "approved" | "rejected", note?: string) =>
  request<{ request: ListingRequest }>("PATCH", `/creators/listing-requests/${encodeURIComponent(id)}`, { status, note })

// ---- Creators Program (P6)

export type ProgramStatus = "not_invited" | "invited" | "member" | "removed"
export type Balances = { held: number; pending: number; available: number; requested: number; paid: number }
export type LedgerRow = {
  _id: string
  playlistId: string | null
  playlistName: string | null
  blockNumber: number | null
  type: "bonus" | "block" | "collab_share" | "reversal" | "payout" | "tax"
  amount: number
  state: "held" | "pending" | "available" | "requested" | "paid"
  creditedAt: string
  availableAt: string | null
  note?: string | null
}
export type MyProgram = {
  status: ProgramStatus
  invitedAt: string | null
  joinedAt: string | null
  bonusPaid: boolean
  termsVersion: string | null
  balances: Balances
  history: LedgerRow[]
  terms: { version: string; title: string; body: string[] }
  rates: { bonusAmount: number; blockAmount: number; blockSize: number; minPayout: number; holdDays: number }
}

export const getMyProgram = () => request<MyProgram>("GET", "/creators/me/program")
export const acceptProgram = (termsVersion: string) =>
  request<{ released: number; program: MyProgram }>("POST", "/creators/me/program/accept", { termsVersion })

export type ProgramOverview = {
  counts: Record<string, number>
  flags: {
    _id: string
    playlistId?: string
    userId?: string
    kind?: string
    reasons?: { at: string; text: string }[]
    createdAt: string
    playlistName: string | null
    user: { name: string | null; email: string } | null
  }[]
  members: {
    _id: string
    userId: string
    status: ProgramStatus
    invitedAt: string | null
    joinedAt: string | null
    user: { name: string | null; email: string } | null
    balances: Balances
  }[]
}
export const getProgramOverview = () => request<ProgramOverview>("GET", "/creators/program/admin/overview")
export const resolveProgramFlag = (id: string, decision: "cleared" | "fraud", note: string) =>
  request<{ reversed: number }>("PATCH", `/creators/program/admin/flags/${encodeURIComponent(id)}`, { decision, note })
export const removeFromProgram = (userId: string, reason: string) =>
  request<{ withheld: number }>("POST", `/creators/program/admin/${encodeURIComponent(userId)}/remove`, { reason })

export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en")}`

// ---- Payouts (P7)

export type BankDetails = {
  accountName: string
  bankCode: string
  bankName: string
  accountLast4: string
  hasTin: boolean
  paystackVerified: boolean | null
  updatedAt: string
  changedAt: string | null
}
export type Payout = {
  _id: string
  amount: number
  taxAmount: number
  netAmount: number
  status: "requested" | "paid" | "rejected"
  week: string
  bank: { bankName: string; accountLast4: string; accountName: string } | null
  createdAt: string
  paidAt: string | null
  note: string | null
}
export type CashOutStatus = {
  canCashOut: boolean
  reason: string | null
  available: number
  minPayout: number
  taxRate: number
  openRequest: Payout | null
  pausedUntil: string | null
}
export type AdminPayout = Payout & {
  creator: { _id: string; name: string | null; email: string | null }
  bank: { accountName: string; bankName: string; bankCode: string; accountNumber: string | null; tin: string | null; paystackVerified: boolean | null }
}

export const getBanks = () => request<{ banks: { code: string; name: string }[] }>("GET", "/creators/me/banks")
export const getMyBank = () => request<{ bank: BankDetails | null }>("GET", "/creators/me/bank")
export const saveMyBank = (input: { accountName: string; accountNumber: string; bankCode: string; tin?: string }) =>
  request<{ bank: BankDetails; checked: boolean }>("PUT", "/creators/me/bank", input)
export const getMyPayouts = () => request<{ status: CashOutStatus; payouts: Payout[] }>("GET", "/creators/me/payouts")
export const requestCashOut = () => request<{ payout: Payout }>("POST", "/creators/me/payouts")
export const getAdminPayouts = (status: Payout["status"]) =>
  request<{ week: string; payouts: AdminPayout[] }>("GET", `/creators/program/admin/payouts?status=${status}`)
export const markAdminPayout = (id: string, status: "paid" | "rejected", note?: string) =>
  request<{ payout: Payout }>("PATCH", `/creators/program/admin/payouts/${encodeURIComponent(id)}`, { status, note })
