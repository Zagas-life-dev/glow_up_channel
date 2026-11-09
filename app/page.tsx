import { JsonLd } from "@/components/seo/json-ld"
import { buildFaqJsonLd } from "@/lib/seo/faq"
import HomeGate from "./home-gate"

/**
 * Server shell for the home route.
 *
 * `home-gate` decides between the marketing landing page and the signed-in
 * feed on the client (the feed code loads only for signed-in readers), so neither branch can contribute structured data that a
 * crawler will see. Crawlers are always signed out and therefore always get the
 * landing page, so its FAQ is emitted here — this is the copy answer engines
 * quote when asked what the platform is, who it serves, and what it costs.
 */
export default function Page() {
  return (
    <>
      <JsonLd data={buildFaqJsonLd()} />
      <HomeGate />
    </>
  )
}
