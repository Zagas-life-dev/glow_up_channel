import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const auth = vi.hoisted(() => ({ value: { user: null as null | { role: string }, isLoading: false } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => auth.value }))

import { canSeeCreatorFeatures, STAFF_ONLY } from "./creator-preview"
import { CreatorPreviewGate } from "@/components/creator/creator-preview-gate"

afterEach(cleanup)

describe("creator features are staff-only for now", () => {
  it("only admin and super_admin pass while STAFF_ONLY is on", () => {
    expect(STAFF_ONLY).toBe(true)
    expect(canSeeCreatorFeatures("admin")).toBe(true)
    expect(canSeeCreatorFeatures("super_admin")).toBe(true)
    for (const role of ["user", "opportunity_seeker", "provider", "monitor", "founder_batch", "", null, undefined]) {
      expect(canSeeCreatorFeatures(role)).toBe(false)
    }
  })

  it("the page gate shows the page to staff and 'Coming soon' to everyone else", () => {
    auth.value = { user: { role: "super_admin" }, isLoading: false }
    const { unmount } = render(<CreatorPreviewGate><p>Secret dashboard</p></CreatorPreviewGate>)
    expect(screen.getByText("Secret dashboard")).toBeTruthy()
    unmount()

    auth.value = { user: { role: "user" }, isLoading: false }
    render(<CreatorPreviewGate><p>Secret dashboard</p></CreatorPreviewGate>)
    expect(screen.queryByText("Secret dashboard")).toBeNull()
    expect(screen.getByText("Coming soon")).toBeTruthy()
  })

  it("shows nothing while sign-in is loading, so nobody sees a flash", () => {
    auth.value = { user: null, isLoading: true }
    render(<CreatorPreviewGate><p>Secret dashboard</p></CreatorPreviewGate>)
    expect(screen.queryByText("Secret dashboard")).toBeNull()
    expect(screen.queryByText("Coming soon")).toBeNull()
  })
})
