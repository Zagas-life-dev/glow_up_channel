import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  getMySubscriptions: vi.fn(),
  unsubscribeFromCreator: vi.fn(),
  subscribeToCreator: vi.fn(),
}))
vi.mock("@/lib/subscriptions", () => mocks)
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))

import { SubscriptionsTab, searchCreators, creatorName } from "./subscriptions-tab"
import type { SubscribedCreator } from "@/lib/subscriptions"

const ada: SubscribedCreator = {
  creatorId: "ada",
  firstName: "Ada",
  lastName: "Obi",
  profileImage: null,
  subscriberCount: 12,
  alsoPlaylists: false,
  since: "2026-11-10T10:00:00Z",
  publicPlaylistCount: 4,
  playlists: [
    { _id: "p1", name: "Scholarships for engineers", itemCount: 6, coverImage: null, saveCount: 3, updatedAt: null },
    { _id: "p2", name: "Remote internships", itemCount: 1, coverImage: null, saveCount: 0, updatedAt: null },
  ],
}
const tunde: SubscribedCreator = { ...ada, creatorId: "tunde", firstName: "Tunde", lastName: null, subscriberCount: 1, publicPlaylistCount: 0, playlists: [] }

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("searchCreators", () => {
  it("matches creator names first, then their playlist names", () => {
    expect(searchCreators([tunde, ada], "").map((c) => c.creatorId)).toEqual(["tunde", "ada"])
    expect(searchCreators([tunde, ada], "tunde").map((c) => c.creatorId)).toEqual(["tunde"])
    expect(searchCreators([tunde, ada], "internships").map((c) => c.creatorId)).toEqual(["ada"])
    expect(searchCreators([tunde, ada], "zzz")).toEqual([])
  })
  it("names fall back when a creator has none", () => {
    expect(creatorName({ firstName: null, lastName: null })).toBe("UP creator")
    expect(creatorName(ada)).toBe("Ada Obi")
  })
})

describe("SubscriptionsTab", () => {
  it("shows each creator with counts and their newest playlists", async () => {
    mocks.getMySubscriptions.mockResolvedValue({ creators: [ada, tunde] })
    const onCount = vi.fn()
    render(<SubscriptionsTab search="" onCount={onCount} />)
    expect(await screen.findByText("Ada Obi")).toBeTruthy()
    expect(screen.getByText("Scholarships for engineers").closest("a")?.getAttribute("href")).toBe("/playlists/p1")
    expect(screen.getByText("See all 4 playlists")).toBeTruthy()
    expect(screen.getByText(/No public playlists yet/)).toBeTruthy()
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(2))
  })

  it("unsubscribe flips the button, counts down, and can be undone", async () => {
    mocks.getMySubscriptions.mockResolvedValue({ creators: [ada] })
    mocks.unsubscribeFromCreator.mockResolvedValue({ subscribed: false, alsoPlaylists: false, subscriberCount: 11 })
    mocks.subscribeToCreator.mockResolvedValue({ subscribed: true, alsoPlaylists: false, subscriberCount: 12, playlistsSubscribed: 0 })
    const onCount = vi.fn()
    render(<SubscriptionsTab search="" onCount={onCount} />)
    fireEvent.click(await screen.findByRole("button", { name: /Subscribed/ }))
    await waitFor(() => expect(screen.getByRole("button", { name: /^Subscribe$/ })).toBeTruthy())
    expect(mocks.unsubscribeFromCreator).toHaveBeenCalledWith("ada")
    expect(screen.getByText(/11 subscribers/)).toBeTruthy()
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(0))
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe$/ }))
    await waitFor(() => expect(screen.getByRole("button", { name: /Subscribed/ })).toBeTruthy())
    expect(mocks.subscribeToCreator).toHaveBeenCalledWith("ada", false)
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(1))
  })

  it("empty state points to Discover", async () => {
    mocks.getMySubscriptions.mockResolvedValue({ creators: [] })
    render(<SubscriptionsTab search="" />)
    expect(await screen.findByText("No subscriptions yet")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Find creators in Discover" }).getAttribute("href")).toBe("/playlists")
  })
})
