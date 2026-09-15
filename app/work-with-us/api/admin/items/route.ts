import { NextResponse } from "next/server"

import type { Filter } from "mongodb"

import { items, orders, type ItemDoc, type ItemStatus } from "../../../server/db"
import { requireAdmin } from "../../../server/admin-auth"

/**
 * Every status an item can hold. This has to stay in step with `ItemStatus` in
 * server/db.ts — a status missing from here does not narrow the query, it drops
 * the filter entirely and returns the whole collection under that tab's name.
 * The `satisfies` line makes that a build error rather than a silent wrong list.
 */
const STATUSES = [
  "pending_review",
  "needs_clarification",
  "published",
  "running",
  "delivered",
  "rejected",
  "awaiting_payment",
] as const satisfies readonly ItemStatus[]

// Exhaustiveness: fails to compile if a new ItemStatus is not listed above.
type Unlisted = Exclude<ItemStatus, (typeof STATUSES)[number]>
const _allStatusesListed: [Unlisted] extends [never] ? true : never = true
void _allStatusesListed

/** The review queue. Newest first, filtered by status — `all` for everything. */
export async function GET(request: Request) {
  const check = await requireAdmin(request)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const url = new URL(request.url)
  const status = url.searchParams.get("status") ?? "pending_review"
  const known = (STATUSES as readonly string[]).includes(status)
  const filter: Filter<ItemDoc> = known ? { status: status as ItemStatus } : {}

  // Anything that is not a status we know is treated as "everything". Say so in
  // the response so the screen can label the list honestly instead of implying
  // the rows were filtered.
  const scope = known ? status : "all"

  try {
    const collection = await items()

    const rows = await collection.find(filter).sort({ createdAt: -1 }).limit(200).toArray()

    // Pull in each order once so the list can show what was paid.
    const refs = [...new Set(rows.map((row) => row.orderRef))]
    const orderRows = refs.length
      ? await (await orders()).find({ ref: { $in: refs } }).toArray()
      : []
    const byRef = new Map(orderRows.map((order) => [order.ref, order]))

    const counts = await collection
      .aggregate<{ _id: ItemStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray()

    const byStatus = Object.fromEntries(counts.map((entry) => [entry._id, entry.count]))
    const total = counts.reduce((sum, entry) => sum + entry.count, 0)

    return NextResponse.json({
      scope,
      items: rows.map((row) => {
        const order = byRef.get(row.orderRef)
        return {
          ...row,
          _id: String(row._id),
          order: order
            ? {
                amountNg: order.amountNg,
                status: order.status,
                revenueShare: order.revenueShare,
                paidAt: order.payment?.paidAt ?? null,
              }
            : null,
        }
      }),
      counts: byStatus,
      // How many submissions exist at all, so the screen can tell "nothing has
      // ever come in" apart from "nothing is waiting on you right now".
      total,
      truncated: rows.length === 200,
    })
  } catch (error) {
    console.error("work-with-us admin list failed:", error)
    return NextResponse.json(
      { error: "Could not read the submissions database. Check MONGODB_URI on this server." },
      { status: 500 },
    )
  }
}
