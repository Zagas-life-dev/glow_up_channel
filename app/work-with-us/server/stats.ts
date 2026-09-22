import { audienceSize as readAudienceSize } from "./api"

/**
 * How many people are actually on UP. Read live rather than written down,
 * because the pipeline's rule for proof copy is that the number is current and
 * verified or it does not appear at all.
 *
 * The count itself is the backend's — see `audienceSize` in
 * `latest-glowup-channel/src/services/workWithUsService.js`, which is where the
 * definition of "audience" lives. Returns null on any failure so the caller can
 * render nothing instead of guessing.
 */
export async function audienceSize(): Promise<number | null> {
  const result = await readAudienceSize()
  if (!result.ok) {
    console.error("work-with-us audience count failed:", result.error)
    return null
  }
  return result.data.users
}
