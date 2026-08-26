/**
 * The detail pages hang because of this hook.
 *
 * `useSimilarContent` takes an options object with a `getDeadline` callback, and
 * every caller passes it inline:
 *
 *     useSimilarContent('jobs', job, { getDeadline: (row) => row?.dates?.… })
 *
 * That literal is a new function on every render. With it in the effect's
 * dependency array, the effect re-runs each render, fetches, calls setSimilar
 * with a fresh array, re-renders, and goes round again — a render/fetch loop
 * that pins the main thread and shows the browser's "wait for page to respond".
 *
 * The fix has to make the hook immune to an unstable callback identity, because
 * "remember to wrap it in useCallback at every call site" is not a fix.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { useSimilarContent } from "@/hooks/use-content-detail"

const fetchMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/fetch-home-list-page", () => ({ fetchHomeListPage: fetchMock }))

/** Stable across renders, so the callback identity is the only moving part. */
const item = { _id: "job-1", tags: ["design"], dates: {} }

const results = {
  items: [
    { _id: "job-2", tags: ["design"], dates: {} },
    { _id: "job-3", tags: ["design"], dates: {} },
  ],
  lastId: null,
  hasMore: false,
}

function InlineCallbackHarness() {
  // Exactly how the job, event and opportunity pages call it.
  const similar = useSimilarContent("jobs", item, {
    getDeadline: (row: any) => row?.dates?.applicationDeadline,
  })
  return <div data-testid="count">{similar.length}</div>
}

function NoOptionsHarness() {
  const similar = useSimilarContent("resources", item)
  return <div data-testid="count">{similar.length}</div>
}

/** Let any runaway loop have real time to run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 400))

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockResolvedValue(results)
  process.env.NEXT_PUBLIC_BACKEND_URL = "http://backend.test"
})

describe("useSimilarContent", () => {
  it("fetches exactly once for an inline getDeadline callback", async () => {
    const { getByTestId } = render(<InlineCallbackHarness />)

    await waitFor(() => expect(getByTestId("count").textContent).toBe("2"))
    await settle()

    // Before the fix this runs away into the hundreds.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("fetches exactly once when no options are passed at all", async () => {
    const { getByTestId } = render(<NoOptionsHarness />)

    await waitFor(() => expect(getByTestId("count").textContent).toBe("2"))
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("still applies the deadline filter it was given", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const future = new Date(Date.now() + 86_400_000).toISOString()
    fetchMock.mockResolvedValue({
      items: [
        { _id: "closed", tags: ["design"], dates: { applicationDeadline: past } },
        { _id: "open", tags: ["design"], dates: { applicationDeadline: future } },
      ],
      lastId: null,
      hasMore: false,
    })

    const { getByTestId } = render(<InlineCallbackHarness />)

    // Only the still-open row survives, so the callback is genuinely being used.
    await waitFor(() => expect(getByTestId("count").textContent).toBe("1"))
  })

  it("does not fetch for an untagged listing", async () => {
    function Untagged() {
      const similar = useSimilarContent("jobs", { _id: "x", tags: [] }, {
        getDeadline: (row: any) => row?.dates?.applicationDeadline,
      })
      return <div data-testid="count">{similar.length}</div>
    }

    render(<Untagged />)
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
