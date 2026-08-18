/**
 * One-off: move pre-split Work with us rows into the orders/items collections.
 *
 * `work_with_us_submissions` used to hold one document per submission, mixing
 * the payment and the things we owed the customer for it. That is now two
 * collections — `work_with_us_orders` (one per payment) and `work_with_us_items`
 * (one per listing or promotion) — because a five-listing batch is five separate
 * review decisions against a single payment.
 *
 * Rows written before the split are invisible to the review queue until they
 * come across. This does that.
 *
 *   node scripts/migrate-work-with-us.mjs --dry-run   # report, change nothing
 *   node scripts/migrate-work-with-us.mjs             # migrate
 *
 * Safe to run twice: an order whose ref already exists is skipped, so a partial
 * run can simply be re-run. Nothing is deleted — the old collection is left
 * exactly as it is, so this is reversible by dropping the two new collections.
 */

import fs from "node:fs"
import path from "node:path"
import { MongoClient } from "mongodb"

// --- env -------------------------------------------------------------------

for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  }
}

const DRY_RUN = process.argv.includes("--dry-run")

// Kept in step with app/work-with-us/config.ts. Duplicated rather than imported
// because this is a plain node script and that file is TypeScript.
const CONTENT_TYPE_FOR_KIND = {
  "free-opportunity": "opportunity",
  "free-event": "event",
  "paid-event": "event",
  job: "job",
  resource: "resource",
  promotion: null,
}

function trackForKind(kind) {
  if (kind === "promotion") return "promotion"
  if (kind === "resource") return "resource"
  return "listing"
}

/**
 * Old rows predate durations and bundles, so those take the defaults they would
 * have had: everything sold then was the 7-day listing, and no bundle existed.
 */
function toOrder(doc) {
  return {
    ref: doc.ref,
    track: doc.track ?? trackForKind(doc.kind),
    kind: doc.kind,
    quantity: doc.quantity ?? (doc.entries?.length || 1),
    duration: "standard",
    bundleId: null,
    promotions: doc.promotions ?? [],
    revenueShare: doc.revenueShare ?? null,
    contact: doc.contact,
    order: doc.order ?? { lines: [], total: 0 },
    amountNg: doc.amountNg ?? 0,
    status: doc.status,
    ...(doc.payment && { payment: doc.payment }),
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  }
}

/**
 * The old status vocabulary was the order's, not the item's. "paid" and
 * "pending_review" both meant the same thing for the work itself — waiting on a
 * human — so both land on pending_review.
 */
function itemStatusFor(orderStatus) {
  return orderStatus === "awaiting_payment" ? "awaiting_payment" : "pending_review"
}

function toItems(doc) {
  const status = itemStatusFor(doc.status)
  const base = {
    orderRef: doc.ref,
    kind: doc.kind,
    contact: doc.contact,
    status,
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  }

  if (doc.kind === "promotion") {
    const fields = doc.entries?.[0] ?? {}
    return [
      {
        ...base,
        ref: `${doc.ref}-1`,
        itemType: "promotion",
        contentType: null,
        fields,
        // Old rows stored only { id, quantity }; label and price were never
        // snapshotted, so the queue shows the id and the price it was sold at
        // has to come off the order lines.
        promotions: (doc.promotions ?? []).map((promo) => ({
          id: promo.id,
          label: promo.id,
          quantity: promo.quantity ?? 1,
          price: 0,
        })),
        target: { title: fields.title ?? "", contentId: null, listingRef: null },
      },
    ]
  }

  return (doc.entries ?? []).map((fields, index) => ({
    ...base,
    ref: `${doc.ref}-${index + 1}`,
    itemType: "listing",
    contentType: CONTENT_TYPE_FOR_KIND[doc.kind] ?? null,
    fields,
  }))
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local or the environment.")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()

  try {
    const db = client.db(process.env.MONGODB_DB || undefined)
    const submissions = db.collection("work_with_us_submissions")
    const orders = db.collection("work_with_us_orders")
    const items = db.collection("work_with_us_items")

    const total = await submissions.countDocuments({})
    if (total === 0) {
      console.log("Nothing in work_with_us_submissions — no migration needed.")
      return
    }

    console.log(`${total} row(s) in work_with_us_submissions${DRY_RUN ? "  (dry run)" : ""}\n`)

    let migrated = 0
    let skipped = 0
    let itemCount = 0

    for await (const doc of submissions.find({}).sort({ createdAt: 1 })) {
      if (!doc.ref) {
        console.warn(`  skip  ${doc._id}  — no ref, cannot be keyed`)
        skipped += 1
        continue
      }
      if (await orders.findOne({ ref: doc.ref })) {
        console.log(`  skip  ${doc.ref}  — already migrated`)
        skipped += 1
        continue
      }

      const order = toOrder(doc)
      const itemDocs = toItems(doc)
      if (itemDocs.length === 0) {
        console.warn(`  warn  ${doc.ref}  — no entries, order only`)
      }

      if (!DRY_RUN) {
        await orders.insertOne(order)
        if (itemDocs.length > 0) await items.insertMany(itemDocs)
      }

      console.log(
        `  ${DRY_RUN ? "would" : "moved"}  ${doc.ref}  ${doc.kind}  ` +
          `${itemDocs.length} item(s)  ${order.status}`,
      )
      migrated += 1
      itemCount += itemDocs.length
    }

    console.log(
      `\n${DRY_RUN ? "Would migrate" : "Migrated"} ${migrated} order(s) and ` +
        `${itemCount} item(s). Skipped ${skipped}.`,
    )
    if (DRY_RUN) console.log("Nothing was written. Re-run without --dry-run to apply.")
    else console.log("The old collection was left untouched.")
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message)
  process.exit(1)
})
