/**
 * Single source of truth for the publisher identity used in structured data.
 *
 * The platform is UP (Outside Solutions Ltd.). It was GlowUp, and the old name
 * still carries the search equity, so it stays declared as an `alternateName`
 * rather than being dropped — search and answer engines resolve a site to one
 * entity, and both names belong on that one node instead of on two competing
 * Organization objects. Change the primary name here and every page follows.
 */
/**
 * The UP logo, recoloured to the platform tokens (#FF6A00, #0B1233) by
 * scripts/recolor-brand-logo.mjs. Local copies live in public/images/brand/
 * and are what the PWA icons are generated from; these are the same files on
 * Cloudinary (folder glowup-channel/brand), for anywhere that needs a URL that
 * works off-site. Re-upload after recolouring and update the versions here.
 */
export const BRAND_LOGOS = {
  /** Navy mark on orange — the app icon. 2000×2000. */
  orange: "https://res.cloudinary.com/dd7fbnago/image/upload/v1790429904/glowup-channel/brand/up-logo-orange.png",
  /** Orange mark on navy — for dark surfaces and the launch screen. 1563×1563. */
  navy: "https://res.cloudinary.com/dd7fbnago/image/upload/v1790429905/glowup-channel/brand/up-logo-navy.png",
  /** The mark alone on transparency, navy. What sits on an orange tile. 1199×701. */
  markNavy: "https://res.cloudinary.com/dd7fbnago/image/upload/v1790430368/glowup-channel/brand/up-mark-navy.png",
  /** The mark alone on transparency, orange. What sits on a navy surface. 1199×701. */
  markOrange: "https://res.cloudinary.com/dd7fbnago/image/upload/v1790430369/glowup-channel/brand/up-mark-orange.png",
} as const

/**
 * A Cloudinary delivery URL for one of BRAND_LOGOS at a given display height,
 * at twice that for high-density screens, in whatever format the browser
 * handles best. The originals are up to 2000px; a 44px tile should not
 * download one. `format: "png"` pins the format — for email, where the client
 * that fetches the image is not the browser that negotiates formats.
 */
export function brandLogoUrl(
  url: string,
  { height, format = "auto" }: { height: number; format?: "auto" | "png" },
): string {
  const transform = `c_scale,h_${Math.round(height * 2)},f_${format},q_auto`
  return url.replace("/image/upload/", `/image/upload/${transform}/`)
}

export const BRAND = {
  name: "UP",
  alternateName: ["GlowUp", "GlowUp Channel"],
  legalName: "Outside Solutions Ltd.",
  slogan: "Get Access. Get UP.",
  description:
    "UP is a platform that helps young Africans aged 18 to 35 and older discover and access scholarships, jobs, internships, grants, events, and free learning resources in one place. Operated by Outside Solutions Ltd., UP matches each opportunity to the individual based on their skills, interests, and goals.",
  // The app icon: navy mark on orange, in the platform colours. Hosted on
  // Cloudinary so structured data, emails and link previews carry a stable,
  // absolute URL that does not depend on this site's deployment.
  logo: BRAND_LOGOS.orange,
} as const
