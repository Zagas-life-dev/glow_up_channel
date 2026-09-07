/**
 * Tracker API calls.
 *
 * These live outside ApiClient on purpose: they bracket a navigation away from
 * the site, which needs `keepalive` and a fire-and-forget posture that the rest
 * of the client does not. They reuse ApiClient.makeAuthenticatedRequest so token
 * refresh still applies.
 */

import ApiClient from "@/lib/api-client"
import {
  EMPTY_BUCKETS,
  type TrackerAnswer,
  type TrackerBuckets,
  type TrackerContentType,
  type TrackerEntry,
  type TrackerReason,
  type TrackerSignal,
  type TrackerStatus,
} from "@/lib/tracker/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

interface Envelope<T> {
  success: boolean
  message?: string
  data?: T
}

async function unwrap<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null
  try {
    const json = (await response.json()) as Envelope<T>
    return json?.success ? (json.data ?? null) : null
  } catch {
    return null
  }
}

/**
 * Enrol an outbound click, the moment the user leaves for the listing.
 *
 * `keepalive` matters here: this fires in the same tick as the navigation, and
 * a normal fetch is cancelled once the document begins unloading — which on a
 * mobile in-app browser is exactly when this runs.
 *
 * Returns the entry id so the caller can reconcile the armed record. A null is
 * survivable: the caller parks the exit before this is awaited, and the return
 * path re-enrols with `replay` if the id never arrived.
 *
 * `replay` marks exactly that second attempt. It tells the server this is the
 * same pursuit being recovered, not a fresh click, so the click count stays
 * honest.
 */
export async function startTracking(
  contentType: TrackerContentType,
  contentId: string,
  source?: string,
  options?: { replay?: boolean },
): Promise<{ tracked: boolean; entryId: string | null }> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/tracker/start`, {
      method: "POST",
      body: JSON.stringify({ contentType, contentId, source, replay: !!options?.replay }),
      keepalive: true,
    })
    const data = await unwrap<{ tracked: boolean; entry?: TrackerEntry }>(response)
    return { tracked: !!data?.tracked, entryId: data?.entry?._id ?? null }
  } catch {
    // Tracking must never be the reason someone cannot reach an application.
    return { tracked: false, entryId: null }
  }
}

/**
 * Report that the user is back, and how long they were gone.
 *
 * awayMs is measured on the client because the two ends of that interval can
 * sit either side of a closed tab, which the server has no way to observe.
 */
export async function recordReturn(
  entryId: string,
  awayMs: number,
): Promise<{ shouldPrompt: boolean; entry: TrackerEntry | null }> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/tracker/${entryId}/return`,
      { method: "POST", body: JSON.stringify({ awayMs }) },
    )
    const data = await unwrap<{ shouldPrompt: boolean; entry: TrackerEntry }>(response)
    return { shouldPrompt: !!data?.shouldPrompt, entry: data?.entry ?? null }
  } catch {
    return { shouldPrompt: false, entry: null }
  }
}

/** Answer the prompt. The one moment outcome data can be captured at all. */
export async function recordOutcome(
  entryId: string,
  status: TrackerAnswer,
  options?: { reason?: TrackerReason; remindWeekday?: string },
): Promise<TrackerEntry | null> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/tracker/${entryId}/outcome`,
      {
        method: "POST",
        body: JSON.stringify({
          status,
          reason: options?.reason,
          remindWeekday: options?.remindWeekday,
        }),
      },
    )
    const data = await unwrap<{ entry: TrackerEntry }>(response)
    return data?.entry ?? null
  } catch {
    // The caller shows the failure. Throwing here would surface as an unhandled
    // rejection instead, because the sheet fires this without awaiting.
    return null
  }
}

/** Dismissing the sheet. Quiet for a few hours, not a "no". */
export async function snoozeEntry(entryId: string): Promise<void> {
  try {
    await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/tracker/${entryId}/snooze`, {
      method: "POST",
    })
  } catch {
    // A snooze that fails to persist costs one repeat prompt. Not worth surfacing.
  }
}

/** Move an entry along its lifecycle from the tracker page. */
export async function updateStatus(
  entryId: string,
  status: TrackerStatus,
): Promise<TrackerEntry | null> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/tracker/${entryId}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    )
    const data = await unwrap<{ entry: TrackerEntry }>(response)
    return data?.entry ?? null
  } catch {
    return null
  }
}

/** Entries due to be asked about, most recently clicked first. */
export async function getPending(): Promise<TrackerEntry[]> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/tracker/pending`)
    const data = await unwrap<{ entries: TrackerEntry[] }>(response)
    return Array.isArray(data?.entries) ? data.entries : []
  } catch {
    return []
  }
}

/** The tracker page, already grouped and sorted by the backend. */
export async function getTracker(includeClosed = true): Promise<TrackerBuckets> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/tracker?includeClosed=${includeClosed ? "true" : "false"}`,
  )
  const data = await unwrap<{ buckets: TrackerBuckets; total: number }>(response)
  return data?.buckets ?? EMPTY_BUCKETS
}

/** Compact outcome history the feed re-ranker folds into its scores. */
export async function getSignals(): Promise<TrackerSignal[]> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/tracker/signals`)
    const data = await unwrap<{ signals: TrackerSignal[] }>(response)
    return Array.isArray(data?.signals) ? data.signals : []
  } catch {
    return []
  }
}
