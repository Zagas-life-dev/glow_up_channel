import { db } from "./db"

/**
 * How many people are actually on UP. Read live rather than written down,
 * because the pipeline's rule for proof copy is that the number is current and
 * verified or it does not appear at all.
 *
 * Rejected and suspended accounts are excluded — they are not an audience
 * anyone is buying access to. Pending accounts are counted: they have signed up
 * and can be reached, they are just not approved to post.
 *
 * The backend indexes users on `{ status: 1, createdAt: -1 }`, which this count
 * uses. Returns null on any failure so the caller can render nothing instead of
 * guessing.
 */
export async function audienceSize(): Promise<number | null> {
  try {
    const users = (await db()).collection("users")
    return await users.countDocuments({
      isActive: { $ne: false },
      status: { $nin: ["rejected", "suspended"] },
    })
  } catch (error) {
    console.error("work-with-us audience count failed:", error)
    return null
  }
}
