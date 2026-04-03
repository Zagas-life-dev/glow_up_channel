import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the GlowUp team — questions, partnerships, and support.",
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
