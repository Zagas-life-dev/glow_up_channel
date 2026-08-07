const PAYSTACK_API = "https://api.paystack.co"

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set")
  return key
}

/**
 * Starts a payment and returns the Paystack page to send the user to.
 * `amountNg` is naira; Paystack works in kobo.
 */
export async function initializePayment(params: {
  email: string
  amountNg: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<string> {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountNg * 100,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  })

  const json = await response.json().catch(() => null)
  const url = json?.data?.authorization_url
  if (!response.ok || !url) {
    throw new Error(json?.message || "Could not start the payment")
  }
  return url as string
}

export type PaystackVerification = {
  successful: boolean
  amountNg: number
  channel?: string
}

/** Asks Paystack whether a reference was actually paid. Never trust the browser for this. */
export async function verifyPayment(reference: string): Promise<PaystackVerification> {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  })

  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.data) {
    throw new Error(json?.message || "Could not confirm the payment")
  }

  return {
    successful: json.data.status === "success",
    amountNg: Math.round((json.data.amount ?? 0) / 100),
    channel: json.data.channel,
  }
}
