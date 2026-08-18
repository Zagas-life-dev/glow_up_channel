import { notFound } from "next/navigation"

import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"

/**
 * Gate for the partner pitch and its payment flow.
 *
 * A server layout rather than a check inside the page: this runs before the
 * client bundle, so while the programme is off the route 404s outright instead
 * of rendering the pitch and hiding it afterwards. Hiding the buttons that link
 * here is not enough on its own — the URL has been shared, and it opens a
 * Paystack checkout.
 */
export default function FounderBatchLayout({ children }: { children: React.ReactNode }) {
  if (!PARTNER_PROGRAMME_ENABLED) notFound()
  return children
}
