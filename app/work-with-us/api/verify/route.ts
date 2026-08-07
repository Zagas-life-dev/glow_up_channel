import { NextResponse } from "next/server"

import { confirmPayment } from "../../server/confirm"

/**
 * Confirms a payment after Paystack sends the person back. Asks Paystack
 * directly rather than trusting the query string, and is safe to call twice.
 */
export async function POST(request: Request) {
  let reference = ""
  try {
    const body = await request.json()
    reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 80) : ""
  } catch {
    // falls through to the check below
  }
  if (!reference) {
    return NextResponse.json({ error: "Missing payment reference" }, { status: 400 })
  }

  try {
    const result = await confirmPayment(reference)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({
      ref: result.ref,
      amountNg: result.amountNg,
      alreadyPaid: result.alreadyPaid,
    })
  } catch (error) {
    console.error("work-with-us verify failed:", error)
    return NextResponse.json({ error: "We could not confirm that payment" }, { status: 500 })
  }
}
