import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Work with us",
  description:
    "Submit an opportunity, job, event or resource, promote what you are building, or become a GlowUp partner.",
}

export default function WorkWithUsLayout({ children }: { children: React.ReactNode }) {
  return children
}
