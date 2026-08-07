import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { confirmPayment } from "../../server/confirm"

/**
 * Paystack calls this when a payment succeeds, so an order still gets marked
 * paid if the person closes the tab instead of coming back to the site.
 *
 * Point a webhook at https://your-domain.com/work-with-us/api/webhook in the
 * Paystack dashboard. Optional — the return trip works without it.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ received: true })

  const body = await request.text()
  const signature = request.headers.get("x-paystack-signature") ?? ""
  const expected = createHmac("sha512", secret).update(body).digest("hex")

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 })
  }

  try {
    const event = JSON.parse(body)
    const reference = event?.data?.reference
    // Only our own references start with GU- ; the rest belong to other flows.
    if (event?.event === "charge.success" && typeof reference === "string" && reference.startsWith("GU-")) {
      const result = await confirmPayment(reference)
      if (!result.ok) console.error(`work-with-us webhook ${reference}: ${result.error}`)
    }
  } catch (error) {
    console.error("work-with-us webhook failed:", error)
  }

  // Always 200, or Paystack keeps retrying.
  return NextResponse.json({ received: true })
}
