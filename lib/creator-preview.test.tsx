import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, renderHook, waitFor } from "@testing-library/react"

const auth = vi.hoisted(() => ({ value: { user: null as null | { role: string }, isLoading: false } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => auth.value }))
const program = vi.hoisted(() => ({ getMyProgram: vi.fn() }))
vi.mock("@/lib/creator", () => program)

import { canSeeCreatorFeatures, STAFF_ONLY, isInCreatorProgram, useCreatorProgramStatus } from "./creator-preview"
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

describe('Creator dashboard link: only once you are in the program', () => {
  it('invited and member count as added; removed and never-invited do not', () => {
    expect(isInCreatorProgram('invited')).toBe(true)
    expect(isInCreatorProgram('member')).toBe(true)
    for (const s of ['not_invited', 'removed', null, undefined]) expect(isInCreatorProgram(s)).toBe(false)
  })

  it('reads the program status for allowed users, once per session', async () => {
    auth.value = { user: { role: 'admin', _id: 'u-admin' } as never, isLoading: false }
    program.getMyProgram.mockResolvedValue({ status: 'member' })
    const a = renderHook(() => useCreatorProgramStatus())
    await waitFor(() => expect(a.result.current).toBe('member'))
    const b = renderHook(() => useCreatorProgramStatus())
    await waitFor(() => expect(b.result.current).toBe('member'))
    expect(program.getMyProgram).toHaveBeenCalledTimes(1)
  })

  it('never asks for users who cannot see creator features yet', async () => {
    program.getMyProgram.mockClear()
    auth.value = { user: { role: 'user', _id: 'u-plain' } as never, isLoading: false }
    const { result } = renderHook(() => useCreatorProgramStatus())
    expect(result.current).toBeNull()
    expect(program.getMyProgram).not.toHaveBeenCalled()
  })
})
