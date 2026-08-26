import { getIndexNowKey } from "@/lib/seo/indexnow"

/**
 * Serves the IndexNow key file.
 *
 * IndexNow verifies ownership by fetching this file and checking that its
 * contents match the key in the submission. Its location is declared as
 * `keyLocation` in each request, so it does not need to sit at the domain root.
 *
 * The key is not a secret: it only proves that whoever submits URLs for this
 * host also controls the host.
 */
export const dynamic = "force-dynamic"

export function GET(): Response {
  const key = getIndexNowKey()
  if (!key) return new Response("Not found", { status: 404 })

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
