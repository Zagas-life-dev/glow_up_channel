import type { Metadata } from "next"

import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"

export const metadata: Metadata = {
  title: "Work with us",
  // The description is what search engines and link previews quote, so it must
  // not advertise the partner programme while the flow is hidden.
  description: PARTNER_PROGRAMME_ENABLED
    ? "Distribute jobs, opportunities and events to a young African audience through UP's platform, community and social channels. Choose what you need, pay online, or become a partner."
    : "Distribute jobs, opportunities and events to a young African audience through UP's platform, community and social channels. Choose what you need and pay online — no sales call.",
}

export default function WorkWithUsLayout({ children }: { children: React.ReactNode }) {
  return children
}
