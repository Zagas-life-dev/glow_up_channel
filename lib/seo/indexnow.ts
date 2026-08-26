import { getSiteUrl } from "@/lib/site-url"

/**
 * IndexNow submission.
 *
 * Bing's index is the retrieval layer for ChatGPT Search and Microsoft Copilot,
 * and an independent study found 87% of ChatGPT Search citations match Bing's
 * top results against 56% for Google's. Waiting for an organic crawl therefore
 * costs visibility on the largest answer engine; IndexNow pushes new and
 * changed URLs to Bing, Yandex, Naver, Seznam and Yep instead, typically
 * getting a crawl within about a day.
 *
 * Submission is an invitation to crawl, not a guarantee of indexing, and the
 * protocol expects meaningful changes only — never a daily resubmission of
 * every URL.
 */

/** Shared endpoint; participating engines forward submissions to each other. */
const ENDPOINT = "https://api.indexnow.org/indexnow"

/** The protocol's per-request ceiling. */
const MAX_URLS_PER_REQUEST = 10_000

/**
 * The key is also served at `/indexnow-key.txt`, and we pass `keyLocation`
 * explicitly so the file does not have to sit at the domain root under its own
 * key name.
 */
export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY?.trim() || null
}

export interface SubmitResult {
  ok: boolean
  status: number
  submitted: number
  message: string
}

/**
 * Push URLs to IndexNow. Returns a result rather than throwing so callers can
 * report partial success; a failed submission is not a reason to fail a deploy.
 */
export async function submitUrls(urls: string[]): Promise<SubmitResult> {
  const key = getIndexNowKey()
  if (!key) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: "INDEXNOW_KEY is not set; skipping submission.",
    }
  }

  const site = getSiteUrl()
  const host = new URL(site).host

  // Only URLs on this host are accepted; anything else voids the whole request.
  const urlList = Array.from(new Set(urls))
    .filter((u) => {
      try {
        return new URL(u).host === host
      } catch {
        return false
      }
    })
    .slice(0, MAX_URLS_PER_REQUEST)

  if (urlList.length === 0) {
    return { ok: false, status: 0, submitted: 0, message: "No valid URLs to submit." }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${site}/indexnow-key.txt`,
        urlList,
      }),
    })

    return {
      ok: res.ok,
      status: res.status,
      submitted: res.ok ? urlList.length : 0,
      // 200 accepted, 202 accepted pending key validation, 422 host/key mismatch.
      message: res.ok
        ? `Submitted ${urlList.length} URLs (HTTP ${res.status}).`
        : `IndexNow rejected the submission (HTTP ${res.status}).`,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: `IndexNow request failed: ${(err as Error).message}`,
    }
  }
}
