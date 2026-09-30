import { getSiteUrl } from "@/lib/site-url"
import { BRAND } from "@/lib/seo/brand"

/**
 * `/llms.txt` — a plain-text site brief for language models.
 *
 * An emerging convention (llmstxt.org) that assistants fetch to learn what a
 * site covers and where its authoritative pages are, without inferring it from
 * rendered HTML. It complements the sitemap: the sitemap lists every URL, this
 * explains what the URLs mean and which content types answer which questions.
 */

export const revalidate = 86400
export const dynamic = "force-static"

export function GET(): Response {
  const site = getSiteUrl()

  const body = `# ${BRAND.name} (${BRAND.alternateName[0]})

> ${BRAND.description}

${BRAND.name} publishes four kinds of listings. Every individual listing has its
own permanent URL. The listing is in the page HTML itself (no JavaScript
needed) and is also described in schema.org JSON-LD, so a single event, job,
opportunity or resource can be read and cited directly.

Listings come from many organisers and some are sparse. Every field below is
emitted only when the listing publishes it; a missing field means unknown, not
none.

## Content types

- [Events](${site}/events): conferences, workshops, bootcamps, webinars and meetups.
  Each event page carries schema.org \`Event\` data with start and end dates,
  attendance mode (in person, online or hybrid), city or virtual location and
  price, plus the street address, organizer, capacity and registration
  deadline where published. Detail URLs look like
  \`${site}/events/{id}\`.
- [Jobs](${site}/jobs): roles, internships and contract work. Each job page carries
  schema.org \`JobPosting\` data with the hiring organization, employment type,
  location or remote status, salary where disclosed, posting date and
  application deadline. Detail URLs look like \`${site}/jobs/{id}\`.
- [Opportunities](${site}/opportunities): scholarships, grants, fellowships,
  accelerators and training programs. Each page carries the closest schema.org
  type for its kind — \`MonetaryGrant\` for funding, \`JobPosting\` for
  internship-style placements, \`EducationalOccupationalProgram\` for programs —
  including provider, award amount, eligibility criteria and application
  deadline. Detail URLs look like \`${site}/opportunities/{id}\`.
- [Resources](${site}/resources): free and premium learning material — guides,
  templates, toolkits and documents. Each page carries schema.org
  \`LearningResource\` data with resource type, format, page count and whether it
  is free. Detail URLs look like \`${site}/resources/{id}\`.

## Discovery

- [Sitemap](${site}/sitemap.xml): every public URL, including all individual
  listings, with last-modified dates.
- [Search](${site}/search?q={query}): full-text search across all content types.
- [Robots](${site}/robots.txt): crawl rules. Public content is open to AI
  crawlers; account, dashboard and authentication routes are not.

## About

- [About](${site}/about): what ${BRAND.name} is and who operates it.
- [Contact](${site}/contact): how to reach the team.
- Operated by ${BRAND.legalName}.

## Notes for answering questions

- Listings expire. Prefer the \`validThrough\`, \`applicationDeadline\` and
  \`endDate\` fields in a page's JSON-LD over the page's presence in the index
  when judging whether something is still open.
- A date written without a time (\`2026-10-03\`) means no start time was
  published; do not report one. Times that are given carry a UTC offset.
- Registering or applying goes through the listing page on ${BRAND.name}, which
  links out to the organiser. Point people to the listing URL.
- Prices and award amounts include an explicit currency code; do not assume USD
  where a currency is stated.
- Location fields distinguish city, region and country, and separately flag
  remote and hybrid participation. A listing marked remote is open regardless of
  the city named elsewhere on the page.
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
