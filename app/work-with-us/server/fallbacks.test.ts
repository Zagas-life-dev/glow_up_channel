/**
 * What /work-with-us does when it is not fully configured, or when something it
 * depends on is down.
 *
 * The rule these pin down is that neither of those may look like a failure of
 * the thing the customer was doing. A host with no `WORK_WITH_US_SERVICE_KEY`
 * once answered readers with a message about a database they had no access to;
 * a Paystack call that could not be made was reported as a payment that did not
 * go through, to people whose cards had already been charged. Both are the same
 * mistake — collapsing "we could not ask" into "the answer is no" — and both
 * are invisible to the type checker, because the honest and the dishonest
 * message are the same string type.
 *
 * So: a missing variable is named, an outage says nothing is lost, and the two
 * automatic emails cannot take an order down with them.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { audienceSize as readAudience, missingSettings, type OrderDoc } from "./api"
import { notifySubmitter, notifyTeam } from "./notify"
import { initializePayment, verifyPayment } from "./paystack"
import { audienceSize } from "./stats"

/** Everything here logs on purpose; the log is not what is under test. */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/** Leaves the storefront with no way to reach the order book. */
function unconfigureBackend() {
  vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "")
  vi.stubEnv("BACKEND_URL", "")
  vi.stubEnv("WORK_WITH_US_SERVICE_KEY", "")
}

describe("a missing setting is named, not guessed at", () => {
  it("reports every unset variable at once, not just the first", () => {
    unconfigureBackend()
    // Reporting one at a time means fixing it one deploy at a time.
    expect(missingSettings()).toEqual(["NEXT_PUBLIC_BACKEND_URL", "WORK_WITH_US_SERVICE_KEY"])
  })

  it("counts a blank variable as unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "   ")
    vi.stubEnv("BACKEND_URL", "")
    vi.stubEnv("WORK_WITH_US_SERVICE_KEY", "key")
    expect(missingSettings()).toEqual(["NEXT_PUBLIC_BACKEND_URL"])
  })

  it("says nothing is missing once both are set", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://backend.test")
    vi.stubEnv("WORK_WITH_US_SERVICE_KEY", "key")
    expect(missingSettings()).toEqual([])
  })

  it("answers a read with the variable to set, and does not call out", async () => {
    unconfigureBackend()
    const fetched = vi.spyOn(globalThis, "fetch")

    const result = await readAudience()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(503)
    expect(result.error).toContain("NEXT_PUBLIC_BACKEND_URL")
    expect(result.error).toContain("WORK_WITH_US_SERVICE_KEY")
    // No request is attempted, so this cannot read as an outage either.
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe("the sales page survives its dependencies", () => {
  it("drops the trust strip's number rather than failing when nothing is configured", async () => {
    unconfigureBackend()
    // Proof copy is a real number or absent — never a placeholder, and never an
    // exception that takes the page with it.
    await expect(audienceSize()).resolves.toBeNull()
  })

  it("drops it the same way when the backend is unreachable", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://backend.test")
    vi.stubEnv("WORK_WITH_US_SERVICE_KEY", "key")
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))

    await expect(audienceSize()).resolves.toBeNull()
  })
})

describe("Paystack failures keep their three meanings apart", () => {
  const order = {
    email: "ada@example.com",
    amountNg: 5000,
    reference: "GU-TEST01",
    callbackUrl: "https://up.test/work-with-us",
  }

  it("calls an unset key configuration, not a declined payment", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "")

    const started = await initializePayment(order)

    expect(started.ok).toBe(false)
    if (started.ok) return
    expect(started.reason).toBe("unconfigured")
    expect(started.error).toContain("PAYSTACK_SECRET_KEY")
  })

  it("calls an unreachable Paystack an outage, and says nothing is lost", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_key")
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))

    const checked = await verifyPayment("GU-TEST01")

    expect(checked.ok).toBe(false)
    if (checked.ok) return
    expect(checked.reason).toBe("unreachable")
    expect(checked.error).toContain("Nothing is lost")
  })

  it("calls Paystack saying no a refusal, and passes its words on", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid key" }), { status: 401 }),
    )

    const checked = await verifyPayment("GU-TEST01")

    expect(checked.ok).toBe(false)
    if (checked.ok) return
    expect(checked.reason).toBe("refused")
    expect(checked.error).toContain("Invalid key")
  })

  it("treats a 200 with no authorization url as a refusal rather than a success", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: {} }), { status: 200 }),
    )

    const started = await initializePayment(order)

    expect(started.ok).toBe(false)
    if (!started.ok) expect(started.reason).toBe("refused")
  })
})

describe("the automatic emails cannot take an order down with them", () => {
  it("resolve even when the order they are handed cannot be rendered", async () => {
    vi.stubEnv("SES_CONTACT_RECIPIENT_EMAIL", "team@up.test")
    // Missing `order`, so building either message throws partway through. Both
    // callers await these in a Promise.all, where one rejection would take the
    // other with it and surface as a submission that failed after it was saved.
    const broken = { ref: "GU-TEST01", contact: {} } as unknown as OrderDoc

    await expect(
      Promise.all([notifyTeam(broken, []), notifySubmitter(broken, [])]),
    ).resolves.toHaveLength(2)

    // Resolving is only right if it swallowed something. Both failures are
    // logged against the reference, so a deploy whose mail has never worked is
    // findable rather than merely quiet.
    expect(console.error).toHaveBeenCalledTimes(2)
    expect(vi.mocked(console.error).mock.calls.map(([message]) => message)).toEqual([
      "work-with-us GU-TEST01: team email failed:",
      "work-with-us GU-TEST01: customer email failed:",
    ])
  })

  it("skips the team email quietly when its recipient is unset", async () => {
    vi.stubEnv("SES_CONTACT_RECIPIENT_EMAIL", "")
    const fetched = vi.spyOn(globalThis, "fetch")
    const doc = {
      ref: "GU-TEST01",
      status: "paid",
      kind: "job",
      amountNg: 5000,
      revenueShare: null,
      contact: { name: "Ada", email: "ada@example.com", phone: "", organisation: "" },
      order: { lines: [], total: 0 },
    } as unknown as OrderDoc

    await expect(notifyTeam(doc, [])).resolves.toBeUndefined()
    expect(fetched).not.toHaveBeenCalled()
  })
})
