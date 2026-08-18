import { NextResponse } from "next/server"

import type { Filter } from "mongodb"

import { items, orders, type ItemDoc, type ItemStatus } from "../../../server/db"
import { requireAdmin } from "../../../server/admin-auth"

const STATUSES: ItemStatus[] = [
  "pending_review",
  "published",
  "running",
  "delivered",
  "rejected",
  "awaiting_payment",
]

/** The review queue. Newest first, filtered by status. */
export async function GET(request: Request) {
  const caller = await requireAdmin(request)
  if (!caller) return NextResponse.json({ error: "Admins only" }, { status: 403 })

  const url = new URL(request.url)
  const status = url.searchParams.get("status") ?? "pending_review"
  const filter: Filter<ItemDoc> = STATUSES.includes(status as ItemStatus)
    ? { status: status as ItemStatus }
    : {}

  try {
    const rows = await (await items())
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    // Pull in each order once so the list can show what was paid.
    const refs = [...new Set(rows.map((row) => row.orderRef))]
    const orderRows = await (await orders())
      .find({ ref: { $in: refs } })
      .toArray()
    const byRef = new Map(orderRows.map((order) => [order.ref, order]))

    const counts = await (await items())
      .aggregate<{ _id: ItemStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray()

    return NextResponse.json({
      items: rows.map((row) => ({
        ...row,
        _id: String(row._id),
        order: byRef.get(row.orderRef)
          ? {
              amountNg: byRef.get(row.orderRef)!.amountNg,
              status: byRef.get(row.orderRef)!.status,
              revenueShare: byRef.get(row.orderRef)!.revenueShare,
              paidAt: byRef.get(row.orderRef)!.payment?.paidAt ?? null,
            }
          : null,
      })),
      counts: Object.fromEntries(counts.map((entry) => [entry._id, entry.count])),
    })
  } catch (error) {
    console.error("work-with-us admin list failed:", error)
    return NextResponse.json({ error: "Could not load submissions" }, { status: 500 })
  }
}
