import { afterEach, describe, expect, it, vi } from "vitest"

import ApiClient from "@/lib/api-client"
import { getSignals } from "@/lib/tracker/api"

describe("getSignals", () => {
  afterEach(() => vi.restoreAllMocks())

  it("does not call the backend when signed out", async () => {
    vi.spyOn(ApiClient, "isAuthenticated").mockReturnValue(false)
    const request = vi.spyOn(ApiClient, "makeAuthenticatedRequest")
    await expect(getSignals()).resolves.toEqual([])
    expect(request).not.toHaveBeenCalled()
  })

  it("fetches signals when signed in", async () => {
    vi.spyOn(ApiClient, "isAuthenticated").mockReturnValue(true)
    const request = vi.spyOn(ApiClient, "makeAuthenticatedRequest").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { signals: [] } }), { status: 200 }),
    )
    await getSignals()
    expect(request).toHaveBeenCalledTimes(1)
    expect(String(request.mock.calls[0][0])).toContain("/api/tracker/signals")
  })
})
