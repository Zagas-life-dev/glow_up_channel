import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manage subscription",
  description: "Manage your GlowUp Premium subscription and billing.",
  robots: { index: false, follow: false },
}

export default function PremiumManageLayout({ children }: { children: React.ReactNode }) {
  return children
}
