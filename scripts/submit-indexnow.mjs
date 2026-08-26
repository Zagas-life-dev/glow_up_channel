#!/usr/bin/env node
/**
 * Push the sitemap's URLs to IndexNow (Bing, and therefore ChatGPT Search and
 * Copilot, plus Yandex/Naver/Seznam/Yep).
 *
 * Run after a deploy that publishes or changes listings:
 *   INDEXNOW_KEY=<key> node scripts/submit-indexnow.mjs
 *
 * Options:
 *   --site=https://www.example.com   override the site origin
 *   --limit=500                      submit only the first N URLs
 *   --dry-run                        print what would be sent, send nothing
 *
 * The protocol expects submissions on meaningful change, not a daily blanket
 * resubmission of every URL, so prefer running this on publish events.
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=")
    return [k, v ?? "true"]
  }),
)

const site = (
  args.get("site") ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.glowupchannel.com"
).replace(/\/$/, "")

const key = process.env.INDEXNOW_KEY?.trim()
const dryRun = args.has("dry-run")
const limit = Number(args.get("limit") || 0)

if (!key && !dryRun) {
  console.error("INDEXNOW_KEY is not set. Set it, or pass --dry-run.")
  process.exit(1)
}

const sitemapUrl = `${site}/sitemap.xml`
process.stdout.write(`Reading ${sitemapUrl}\n`)

const res = await fetch(sitemapUrl)
if (!res.ok) {
  console.error(`Could not read sitemap: HTTP ${res.status}`)
  process.exit(1)
}

const xml = await res.text()
let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/&amp;/g, "&").trim(),
)
if (limit > 0) urls = urls.slice(0, limit)

if (urls.length === 0) {
  console.error("Sitemap contained no URLs.")
  process.exit(1)
}

// Report the shape of what we're submitting; a content type showing zero here
// means the sitemap itself is incomplete, which is worth knowing before a push.
const byType = {}
for (const u of urls) {
  const seg = new URL(u).pathname.split("/")[1] || "(root)"
  byType[seg] = (byType[seg] || 0) + 1
}
process.stdout.write(`Found ${urls.length} URLs:\n`)
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${k.padEnd(16)} ${v}\n`)
}

if (dryRun) {
  process.stdout.write("\n--dry-run: nothing submitted.\n")
  process.exit(0)
}

const body = {
  host: new URL(site).host,
  key,
  keyLocation: `${site}/indexnow-key.txt`,
  urlList: urls,
}

const submit = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
})

// 200 accepted; 202 accepted pending key validation; 422 host/key mismatch.
process.stdout.write(`\nIndexNow responded HTTP ${submit.status}\n`)
if (submit.status === 202) {
  process.stdout.write(
    `Pending key validation. Confirm ${site}/indexnow-key.txt returns the key.\n`,
  )
}
process.exit(submit.ok ? 0 : 1)
