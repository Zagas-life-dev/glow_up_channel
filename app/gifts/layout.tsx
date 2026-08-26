import type { Metadata } from "next"

/**
 * Gifts are members-only and never public content, so this whole subtree opts
 * out of indexing. Without it a shared gift URL could end up in search results
 * advertising a page every crawler gets a sign-in wall on.
 */
export const metadata: Metadata = {
  title: "Gifts",
  description: "Free resources from the UP team, for members.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: undefined },
}

export default function GiftsLayout({ children }: { children: React.ReactNode }) {
  return children
}
