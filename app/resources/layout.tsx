import type { Metadata } from "next"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  alternates: { canonical: "/resources" },
  keywords: [
    "resources",
    "free resources",
    "guides",
    "templates",
    "toolkits",
    "learning materials",
    "career resources",
    "study materials",
  ],
  openGraph: {
    type: "website",
    url: "/resources",
    siteName: "UP",
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
  },
}

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
