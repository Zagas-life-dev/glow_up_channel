import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

/**
 * Crawler rules.
 *
 * Private areas (dashboard, auth flows, personal settings) stay disallowed for
 * everyone. Everything public is open — including to AI answer engines, which
 * are named explicitly below.
 *
 * Naming them matters: several of these bots ignore wildcard `User-agent: *`
 * grants for AI use and look for their own token, so an unnamed bot may skip
 * the site rather than assume permission. Listing each one is what makes an
 * individual event or job eligible to be cited in a ChatGPT, Perplexity,
 * Claude, Copilot or AI Overviews answer.
 */

/** Paths that must never be indexed, regardless of crawler. */
const PRIVATE_PATHS = [
  "/dashboard/",
  "/api/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/onboarding",
  "/redirect",
  "/under-construction",
  "/promotions-demo",
  "/profile/settings",
]

/**
 * AI crawlers granted access to public content.
 *
 * Two distinct jobs are represented here, and both are wanted:
 *  - retrieval/citation bots (OAI-SearchBot, Perplexity, Claude-SearchBot,
 *    Google-Extended) decide whether listings can appear in AI answers;
 *  - corpus bots (GPTBot, ClaudeBot, CCBot, Applebot-Extended) affect whether
 *    the platform is known to future models at all.
 *
 * Remove a token from this list to opt that crawler out.
 */
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google AI surfaces (Gemini grounding, AI Overviews)
  "Google-Extended",
  // Microsoft Copilot
  "msnbot",
  // Apple Intelligence
  "Applebot",
  "Applebot-Extended",
  // Others that feed assistant answers or training corpora
  "Amazonbot",
  "DuckAssistBot",
  "Meta-ExternalAgent",
  "CCBot",
  "cohere-ai",
  "YouBot",
]

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
