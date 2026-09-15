import { NextResponse } from "next/server"

import { promotionRunDays, type ContentType } from "../../../../config"
import { requireAdmin } from "../../../../server/admin-auth"
import { items, type ItemDoc } from "../../../../server/db"
import { publishListing, startPromotion } from "../../../../server/publish"

type Action = "approve" | "reject" | "clarify" | "deliver"

/**
 * Approve, reject, ask for a correction, or mark delivered. Approving a listing
 * publishes it to the platform using the signed-in admin's own permissions;
 * approving a promotion starts it against whatever it points at.
 *
 * None of these email the customer. Telling someone their listing is live, or
 * what needs fixing, is a message a person writes — the queue opens Gmail with
 * the right template so it goes from a real inbox and replies come back to one.
 */
export async function POST(request: Request) {
  const check = await requireAdmin(request)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })
  const caller = check.caller

  let ref = ""
  let action: Action = "approve"
  let note = ""
  try {
    const body = await request.json()
    ref = typeof body?.ref === "string" ? body.ref.trim().slice(0, 80) : ""
    action = body?.action
    note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : ""
  } catch {
    // handled below
  }
  if (!ref || !["approve", "reject", "clarify", "deliver"].includes(action)) {
    return NextResponse.json({ error: "Nothing to do" }, { status: 400 })
  }

  try {
    const collection = await items()
    const item = await collection.findOne({ ref })
    if (!item) return NextResponse.json({ error: "We could not find that item" }, { status: 404 })

    const stamp = { reviewedAt: new Date(), reviewedBy: caller.email, updatedAt: new Date() }

    if (action === "reject") {
      await collection.updateOne(
        { ref },
        { $set: { status: "rejected", adminNote: note, ...stamp } },
      )

      // A promotion pointing at a listing we just rejected can never start.
      // Flag it rather than leave it sitting in the queue looking fine.
      const blocked = await collection
        .find({ orderRef: item.orderRef, "target.listingRef": ref, status: "pending_review" })
        .toArray()
      if (blocked.length > 0) {
        await collection.updateMany(
          { orderRef: item.orderRef, "target.listingRef": ref, status: "pending_review" },
          {
            $set: {
              adminNote: `The listing this points at (${ref}) was rejected — sort out a refund or a replacement listing.`,
              updatedAt: new Date(),
            },
          },
        )
      }

      return NextResponse.json({
        ref,
        status: "rejected",
        blockedPromotions: blocked.map((row) => row.ref),
      })
    }

    // Paid and still open — we have asked the customer for something specific.
    if (action === "clarify") {
      await collection.updateOne(
        { ref },
        { $set: { status: "needs_clarification", adminNote: note, ...stamp } },
      )
      return NextResponse.json({ ref, status: "needs_clarification" })
    }

    if (action === "deliver") {
      await collection.updateOne({ ref }, { $set: { status: "delivered", ...stamp } })
      return NextResponse.json({ ref, status: "delivered" })
    }

    if (item.status === "published" || item.status === "running") {
      return NextResponse.json({ ref, status: item.status, alreadyDone: true })
    }
    if (item.status === "awaiting_payment") {
      return NextResponse.json({ error: "This one has not been paid for yet" }, { status: 400 })
    }

    // --- Approving a listing: publish it ------------------------------------
    if (item.itemType === "listing") {
      const published = await publishListing(caller, item)
      if (!published.ok) return NextResponse.json({ error: published.error }, { status: 502 })

      await collection.updateOne(
        { ref },
        {
          $set: {
            status: "published",
            publishedId: published.contentId,
            publishedAt: new Date(),
            ...stamp,
          },
        },
      )

      // A promotion waiting on this listing can now point at the real thing.
      await collection.updateMany(
        { orderRef: item.orderRef, "target.listingRef": ref },
        { $set: { "target.contentId": published.contentId, updatedAt: new Date() } },
      )

      return NextResponse.json({ ref, status: "published", contentId: published.contentId })
    }

    // --- Approving a promotion: start it ------------------------------------
    // Social and community work has nothing to run against on the platform, so
    // approving it just says the team has taken it on.
    const needsPlatform = promotionRunDays(item.promotions ?? []) !== null
    const target = needsPlatform ? await resolveTarget(collection, item) : null

    if (needsPlatform && !target) {
      // Say which of the two it is. "Publish the listing first" was shown even
      // when no target had ever been recorded, which sent reviewers looking for
      // a listing that does not exist.
      return NextResponse.json(
        {
          error: item.target?.listingRef
            ? `Publish listing ${item.target.listingRef} first — this promotion runs against it.`
            : "This promotion has no target recorded, so there is nothing to run it against. Start it by hand.",
        },
        { status: 400 },
      )
    }

    const started = target
      ? await startPromotion(caller, item, target)
      : ({ ok: true, days: null } as const)
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: 502 })

    await collection.updateOne(
      { ref },
      {
        $set: {
          status: "running",
          ...(target && {
            "target.contentId": target.contentId,
            "target.contentType": target.contentType,
          }),
          ...stamp,
        },
      },
    )
    return NextResponse.json({ ref, status: "running", days: started.days })
  } catch (error) {
    console.error("work-with-us admin action failed:", error)
    return NextResponse.json({ error: "That did not work" }, { status: 500 })
  }
}

/**
 * What a promotion should run against, if it has anything yet.
 *
 * Returns the type alongside the id because the backend needs both — an id on
 * its own cannot be looked up, since each content type lives in its own
 * collection.
 */
async function resolveTarget(
  collection: Awaited<ReturnType<typeof items>>,
  item: ItemDoc,
): Promise<{ contentId: string; contentType: ContentType } | null> {
  if (item.target?.contentId) {
    return item.target.contentType
      ? { contentId: item.target.contentId, contentType: item.target.contentType }
      : null
  }
  if (!item.target?.listingRef) return null

  // A listing on this same order: once it is published we know both halves.
  const listing = await collection.findOne({ ref: item.target.listingRef })
  if (!listing?.publishedId || !listing.contentType) return null
  return { contentId: listing.publishedId, contentType: listing.contentType }
}
