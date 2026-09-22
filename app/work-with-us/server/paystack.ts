const PAYSTACK_API = "https://api.paystack.co"

/**
 * Why a Paystack call produced no answer.
 *
 * The three are kept apart because they send the reader somewhere completely
 * different: `unconfigured` is this deployment's own settings and no amount of
 * retrying will fix it, `unreachable` is an outage that has changed nothing,
 * and `refused` is Paystack's answer. Collapsing them is what turned an unset
 * key into "that payment did not go through" for a customer whose card had
 * already been charged.
 */
export type PaystackFailure = "unconfigured" | "unreachable" | "refused"

export type PaystackResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: PaystackFailure; error: string }

/**
 * The settings Paystack needs here, by name, or an empty list when it has them.
 *
 * Exported so a caller can say which variable is missing rather than reporting
 * a payment failure that never happened.
 */
export function missingPaystackSettings(): string[] {
  return process.env.PAYSTACK_SECRET_KEY?.trim() ? [] : ["PAYSTACK_SECRET_KEY"]
}

/**
 * One call to Paystack. `read` pulls the value out of a successful body and
 * returns null if it is not there, which is treated the same as a refusal —
 * a 200 with no authorization URL in it is not an answer we can use.
 */
async function paystack<T>(
  path: string,
  init: RequestInit,
  read: (json: any) => T | null,
): Promise<PaystackResult<T>> {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key) {
    return {
      ok: false,
      reason: "unconfigured",
      error: `This server is missing a setting it needs: ${missingPaystackSettings().join(", ")}.`,
    }
  }

  let response: Response
  try {
    response = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, ...init.headers },
    })
  } catch {
    return {
      ok: false,
      reason: "unreachable",
      error: "Could not reach Paystack. Nothing is lost — try again shortly.",
    }
  }

  const json = await response.json().catch(() => null)
  const data = response.ok ? read(json) : null
  if (data === null) {
    return {
      ok: false,
      reason: "refused",
      error: json?.message || `Paystack refused that (HTTP ${response.status})`,
    }
  }

  return { ok: true, data }
}

/**
 * Starts a payment and returns the Paystack page to send the user to.
 * `amountNg` is naira; Paystack works in kobo.
 */
export function initializePayment(params: {
  email: string
  amountNg: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<PaystackResult<string>> {
  return paystack(
    "/transaction/initialize",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountNg * 100,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    },
    (json) =>
      typeof json?.data?.authorization_url === "string" ? json.data.authorization_url : null,
  )
}

export type PaystackVerification = {
  successful: boolean
  amountNg: number
  channel?: string
}

/** Asks Paystack whether a reference was actually paid. Never trust the browser for this. */
export function verifyPayment(reference: string): Promise<PaystackResult<PaystackVerification>> {
  return paystack(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { cache: "no-store" },
    (json) =>
      json?.data
        ? {
            successful: json.data.status === "success",
            amountNg: Math.round((json.data.amount ?? 0) / 100),
            channel: json.data.channel,
          }
        : null,
  )
}
