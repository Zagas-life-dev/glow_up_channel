/**
 * Single source of truth for the publisher identity used in structured data.
 *
 * The platform is UP (Outside Solutions Ltd.). It was GlowUp, and the old name
 * still carries the search equity, so it stays declared as an `alternateName`
 * rather than being dropped — search and answer engines resolve a site to one
 * entity, and both names belong on that one node instead of on two competing
 * Organization objects. Change the primary name here and every page follows.
 */
export const BRAND = {
  name: "UP",
  alternateName: ["GlowUp", "GlowUp Channel"],
  legalName: "Outside Solutions Ltd.",
  slogan: "Get Access. Get UP.",
  description:
    "UP is a platform that helps young Africans aged 18 to 35 and older discover and access scholarships, jobs, internships, grants, events, and free learning resources in one place. Operated by Outside Solutions Ltd., UP matches each opportunity to the individual based on their skills, interests, and goals.",
  logo: "/images/Yellow and Black Modern Media Company Logo (14).png",
} as const
