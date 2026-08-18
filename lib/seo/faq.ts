import type { JsonLdObject } from "./structured-data"

/**
 * The §7 GEO/AEO answer bank.
 *
 * These are the questions people ask about the platform in plain language, with
 * answers phrased to be quotable verbatim. They live here rather than inside
 * the landing page component so the FAQ structured data can be rendered on the
 * server. The landing page sits behind a client-side auth branch, so anything
 * declared inside it is invisible to crawlers and answer engines.
 *
 * House style for this file: no em dashes. Answer engines quote these strings
 * verbatim, so every sentence has to stand on its own punctuation.
 */
export const FAQS = [
  {
    q: "What is UP?",
    a: "UP is a platform that connects young Africans to scholarships, jobs, internships, grants, events, and resources, each matched to their individual profile and goals.",
  },
  {
    q: "Is UP free to use?",
    a: "Yes. Creating an account on UP and browsing the opportunities, jobs, events, and resources on the platform costs nothing.",
  },
  {
    q: "Who is UP for?",
    a: "UP is built for young Africans aged 18 to 35 and older, including university students, job seekers, early-career professionals, career switchers, and creators.",
  },
  {
    q: "How does UP match opportunities to me?",
    a: "UP reads your skills, interests, education, and stated goals, then uses an NLP powered algorithm to rank the order of opportunities that are most relevant to you in your For You feed.",
  },
  {
    q: "What kinds of opportunities does UP list?",
    a: "UP lists scholarships, grants, fellowships, jobs, internships, graduate programmes, events, competitions, and free learning resources.",
  },
  {
    q: "Does UP charge organizations to list opportunities?",
    a: "UP offers free listings for genuinely free opportunities, alongside paid placement and partnership options for organizations that want greater visibility and reporting.",
  },
  {
    q: "How do I apply to an opportunity found on UP?",
    a: "UP connects you directly to the opportunity's original source. When you tap Apply or Sign Up on a listing, you are taken to the organization's own application page to complete the process.",
  },
  {
    q: "Which organizations partner with UP?",
    a: "UP has partnered with institutions including Nile University, Wema Bank, the Lagos State Ministry of Science and Technology, World Trade Center Abuja, and Zedcrest.",
  },
] as const

export function buildFaqJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }
}
