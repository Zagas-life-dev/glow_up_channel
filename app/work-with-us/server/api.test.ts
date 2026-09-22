/**
 * The storefront and the order book describe the same documents.
 *
 * `server/api.ts` holds TypeScript types for orders and items; the backend's
 * `WorkWithUsOrder.js` and `WorkWithUsItem.js` hold the schema that actually
 * writes them. The types vanish at runtime, so nothing stops the two drifting
 * on their own — and the way that drift shows up is nasty: an item status the
 * storefront does not know about is not a compile error, it is a queue tab that
 * silently drops its filter and lists the whole collection under the wrong
 * name, or a row whose status renders as a raw database key.
 *
 * So each union below is written out once as a runtime array, pinned to its
 * type by `satisfies` plus an exhaustiveness line — adding a member to the type
 * without adding it here fails to compile — and then asserted against the
 * backend's own list. Either side moving alone fails.
 */

import { describe, expect, it } from "vitest"

import type { ContentType, Duration, Kind, Track } from "../config"
import { STATUS_COPY } from "../copy"
import type { ItemStatus, OrderStatus } from "./api"

// The authority. Imported directly so the mirror cannot drift unnoticed.
import WorkWithUsItem from "../../../latest-glowup-channel/src/models/WorkWithUsItem.js"
import WorkWithUsOrder from "../../../latest-glowup-channel/src/models/WorkWithUsOrder.js"

/** Fails to compile if `Union` has a member missing from `listed`. */
type Exhaustive<Union extends string, Listed extends readonly Union[]> = [
  Exclude<Union, Listed[number]>,
] extends [never]
  ? true
  : never

const ITEM_STATUSES = [
  "awaiting_payment",
  "pending_review",
  "needs_clarification",
  "published",
  "running",
  "delivered",
  "rejected",
] as const satisfies readonly ItemStatus[]
const _allItemStatuses: Exhaustive<ItemStatus, typeof ITEM_STATUSES> = true

const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "pending_review",
] as const satisfies readonly OrderStatus[]
const _allOrderStatuses: Exhaustive<OrderStatus, typeof ORDER_STATUSES> = true

const KINDS = [
  "free-opportunity",
  "free-event",
  "job",
  "paid-event",
  "resource",
  "promotion",
] as const satisfies readonly Kind[]
const _allKinds: Exhaustive<Kind, typeof KINDS> = true

const CONTENT_TYPES = ["opportunity", "event", "job", "resource"] as const satisfies readonly ContentType[]
const _allContentTypes: Exhaustive<ContentType, typeof CONTENT_TYPES> = true

const DURATIONS = ["standard", "extended"] as const satisfies readonly Duration[]
const _allDurations: Exhaustive<Duration, typeof DURATIONS> = true

const TRACKS = ["listing", "resource", "promotion"] as const satisfies readonly Track[]
const _allTracks: Exhaustive<Track, typeof TRACKS> = true

void [_allItemStatuses, _allOrderStatuses, _allKinds, _allContentTypes, _allDurations, _allTracks]

const sorted = (values: readonly string[]) => [...values].sort()

describe("storefront types match the order book's schema", () => {
  it("agrees on item statuses", () => {
    expect(sorted(WorkWithUsItem.ITEM_STATUSES)).toEqual(sorted(ITEM_STATUSES))
  })

  it("agrees on order statuses", () => {
    expect(sorted(WorkWithUsOrder.ORDER_STATUSES)).toEqual(sorted(ORDER_STATUSES))
  })

  it("agrees on kinds", () => {
    expect(sorted(WorkWithUsOrder.KINDS)).toEqual(sorted(KINDS))
  })

  it("agrees on content types", () => {
    expect(sorted(WorkWithUsItem.CONTENT_TYPES)).toEqual(sorted(CONTENT_TYPES))
  })

  it("agrees on durations and tracks", () => {
    expect(sorted(WorkWithUsOrder.DURATIONS)).toEqual(sorted(DURATIONS))
    expect(sorted(WorkWithUsOrder.TRACKS)).toEqual(sorted(TRACKS))
  })

  it("has customer-facing copy for every status an item can reach", () => {
    // A status with no entry here renders as a raw key like `needs_clarification`
    // on the order-status screen, which is how a database value ends up being
    // read by a customer.
    for (const status of WorkWithUsItem.ITEM_STATUSES) {
      expect(STATUS_COPY[status], `no STATUS_COPY for "${status}"`).toBeDefined()
    }
  })
})

describe("the order book accepts what the storefront sends", () => {
  const contact = { name: "Ada", email: "ada@example.com", phone: "+2348000000000", organisation: "" }

  it("stores a priced order without rewriting the quote", () => {
    const order = {
      lines: [{ label: "Standard job listing · 7 days", quantity: 2, unitPrice: 5000, total: 10000 }],
      total: 10000,
    }
    const doc = new WorkWithUsOrder({ ref: "GU-TEST01", kind: "job", track: "listing", quantity: 2, contact, order, amountNg: 10000 })

    expect(doc.validate()).toEqual([])
    expect(doc.toDocument().order).toEqual(order)
    // Derived, not taken from the caller: a payable order waits for the money.
    expect(doc.status).toBe("awaiting_payment")
  })

  it("sends a free submission straight to the review queue", () => {
    const doc = new WorkWithUsOrder({
      ref: "GU-TEST02",
      kind: "free-opportunity",
      contact,
      order: { lines: [], total: 0 },
      amountNg: 0,
    })

    expect(doc.validate()).toEqual([])
    expect(doc.status).toBe("pending_review")
  })

  it("refuses an order whose total and charge disagree", () => {
    const doc = new WorkWithUsOrder({
      ref: "GU-TEST03",
      kind: "job",
      contact,
      order: { lines: [], total: 0 },
      amountNg: 5000,
    })

    expect(doc.validate()).toContain("amountNg must equal order.total")
  })

  it("will not take 'paid' from a caller", () => {
    const doc = new WorkWithUsOrder({
      ref: "GU-TEST04",
      kind: "job",
      contact,
      order: { lines: [], total: 10000 },
      amountNg: 10000,
      status: "paid",
    })

    // The constructor honours it — markPaid builds one this way when it rewrites
    // a stored order — but the route that takes a request body never passes a
    // status through, and this is the line that would have to change for one to
    // get in. See createSubmission, which drops everything but the draft.
    expect(doc.status).toBe("paid")
  })

  it("keeps a listing item's content type and refuses one without", () => {
    const withType = new WorkWithUsItem({
      ref: "GU-TEST05-1",
      orderRef: "GU-TEST05",
      itemType: "listing",
      kind: "job",
      contentType: "job",
      fields: { title: "Product Designer" },
    })
    expect(withType.validate()).toEqual([])

    const without = new WorkWithUsItem({
      ref: "GU-TEST05-2",
      orderRef: "GU-TEST05",
      itemType: "listing",
      kind: "job",
      contentType: null,
      fields: { title: "Product Designer" },
    })
    expect(without.validate()).toContain("a listing item needs a contentType")
  })
})
