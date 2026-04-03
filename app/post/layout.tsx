import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create post",
  description: "Share an update with the GlowUp community.",
}

export default function PostComposerLayout({ children }: { children: React.ReactNode }) {
  return children
}
