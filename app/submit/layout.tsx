import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Submit",
  description: "Submit content or listings to GlowUp.",
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children
}
