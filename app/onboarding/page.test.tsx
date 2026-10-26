import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
const createUserProfile = vi.fn()
const refreshUser = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { _id: "u1", emailVerified: true },
    isLoading: false,
    isOnboardingCompleted: false,
    refreshUser,
  }),
}))
vi.mock("@/lib/api-client", () => ({
  default: { createUserProfile: (...args: unknown[]) => createUserProfile(...args) },
}))

import OnboardingPage from "./page"

/** Every answer filled in, as a returning or Back-pressing user would have it. */
const COMPLETE = {
  country: "Nigeria",
  countryCode: "NG",
  province: "Lagos",
  phoneNumber: "+2348012345678",
  phoneCountryCode: "NG",
  educationLevel: "Undergraduate",
  careerStage: "Student",
  fieldOfStudy: "Technology",
  interests: ["Scholarships & Grants"],
  communities: [],
  industrySectors: ["Technology"],
  skills: ["Python"],
  aspirations: ["Skill development"],
}

const continueButton = () => screen.getByRole("button", { name: /continue|finish setup/i })

describe("onboarding", () => {
  beforeEach(() => {
    push.mockReset()
    createUserProfile.mockReset().mockResolvedValue({})
    refreshUser.mockReset().mockResolvedValue(undefined)
    localStorage.clear()
  })
  afterEach(cleanup)

  it("lets you continue past the optional communities step without picking anything", () => {
    localStorage.setItem("onboardingFormData", JSON.stringify({ ...COMPLETE, communities: undefined }))
    render(<OnboardingPage />)

    // Steps 1-4 are already answered from the cache.
    for (let step = 1; step <= 4; step++) {
      expect(screen.getByText(`Step ${step} of 8`)).toBeTruthy()
      fireEvent.click(continueButton())
    }

    expect(screen.getByText("Step 5 of 8")).toBeTruthy()
    expect((continueButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it("walks a fully answered profile through every step and saves it", async () => {
    localStorage.setItem("onboardingFormData", JSON.stringify(COMPLETE))
    render(<OnboardingPage />)

    for (let step = 1; step <= 8; step++) {
      expect(screen.getByText(`Step ${step} of 8`)).toBeTruthy()
      expect((continueButton() as HTMLButtonElement).disabled).toBe(false)
      await act(async () => {
        fireEvent.click(continueButton())
      })
    }

    expect(createUserProfile).toHaveBeenCalledTimes(1)
    expect(refreshUser).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/dashboard")
  })

  it("keeps an answered step's Continue enabled after pressing Back", () => {
    localStorage.setItem("onboardingFormData", JSON.stringify(COMPLETE))
    render(<OnboardingPage />)

    fireEvent.click(continueButton())
    expect(screen.getByText("Step 2 of 8")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(screen.getByText("Step 1 of 8")).toBeTruthy()
    expect((continueButton() as HTMLButtonElement).disabled).toBe(false)
  })
})
