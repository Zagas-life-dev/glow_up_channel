---
name: work-with-up
description: Runs the Work with us desk for UP. Pulls every order waiting on us by API, checks each free listing's link and facts and publishes the good ones (or asks for a fix / rejects with the exact reason), reviews paid Boost / Distribute / Campaign orders and says which are safe to approve, ranks leads (Work with us customers plus organisations already posting on UP) by who is worth pitching a paid package to, and drafts every reply and pitch as a ready-to-send Gmail link. Sends nothing and never approves a paid order. Use for /work-with-up, "work with us", "check the work with us orders", "who should we pitch", "leads report".
---

# /work-with-up

Input: nothing (full run), or one of `free`, `paid`, `leads` to run only that part.

Output: free listings published or answered, plus one report at `~/up-work-with-up/<date>/report.html` with paid-order verdicts, ranked leads, and every reply ready to send.

The free-listing part is **fully automatic**: approve, ask for a fix, or reject without stopping to ask. Only unsure items come back under "Needs you", untouched.

## Public name is UP

Everything an UP skill creates, posts, approves or edits shows **UP** as its public name. Never "Claude", "claude" or "claude.ai" in a listing, note, reply, pitch or report a customer could see. Replies are signed "UP" (the house sign-off in `admin/mail.ts`). The login email stays `claude.ai@up.com`.

## Setup (once per laptop)

- Node 18+. The client is `wwu.mjs` in this skill's folder. Below, `W` means `node "<this skill folder>/wwu.mjs"`.
- Same personal key as /up-uploading, from `~/.up-uploader.env` (`UP_UPLOAD_KEY=upk_...`). Never print, paste, ask for or store the key anywhere else. Missing: stop and tell the person to get one from the UP owner.
- Run `W me` first. 401 = bad or revoked key. 403 = the account is not an active admin; only the owner fixes that. Never change the account's role or permissions.
- A 404 on `work-with-up/*` means the backend with `controllers/workWithUpController.js` is not deployed yet. Say so and stop.
- It works on **production**. A publish is public at once.
- Read `../up-uploading/SKILL.md` "Field table" and "Tag rules", and `../up-approving/SKILL.md` "Checks per listing", before the first free listing. The same bar applies here. Run `node "../up-uploading/upload.mjs" tags` for the tag list.

## What it may do without asking

- Approve (publish), clarify, or reject **free** listing items through `W apply`. The server refuses anything on a paid order.
- Never: approve, reject or touch a paid order (payment is re-checked with Paystack on the admin page `/dashboard/admin/work-with-us`); send any email, WhatsApp or DM; delete an order; edit a live listing; change prices; touch promotions billing code.

## Wording rules (from the comms doc, keep them)

- Never write "your submission has an issue". Name the exact field, link or date.
- Never call anything a scam. The approved wording is "unable to verify".
- Free listings: drop any line about payment from a template ("Your payment has been received" is for paid orders only).
- Short, warm, plain English. Nigerian business tone: respectful, direct, no slang.

## Step 0: pull

`W all`. Read `~/up-work-with-up/<date>/queue.json` and `leads.json`. Each queue item has `fields` (the whole form), `order` (`free`, `amountNg`, `bundleId`, `paidAt`), `contact`, `history` (past orders, paid total, published, rejected with us) and `reviewableHere`.

Split the queue three ways:
- **Free** = `reviewableHere: true`.
- **Paid** = `order.free: false` and status `pending_review` or `needs_clarification`.
- **Resources** (`contentType: "resource"`, free or not) are paused: never reviewed by key. List them under "Needs you" with a short holding reply ("resources are opening soon, we'll be in touch").
- **Unpaid** = `awaiting_payment`. Over 3 days old: a payment nudge draft. Test or gibberish orders go under "Needs you" as junk (/up-maintaining clears them on the owner's yes).

## A. Free listings (automatic)

Spin up subagents when the Agent tool is available: one `general-purpose` agent per 10 free items, all in one message so they run in parallel. Give each the items (from queue.json), the paths of the two skill files above, and these instructions. With no Agent tool, do the batches yourself one after another.

For each item, the first check that fails decides it:
1. **Belongs on UP** (up-approving check B). Party, sale, MLM, giveaway, news, spam, test: `reject`, note `not for UP: <what it is>`.
2. **Link works and matches.** Open `fields.link` (WebFetch, then the built-in browser if blocked). Dead, parked, unrelated or a login wall with no other way to apply: search the title + organisation for the real page. Found: use it. Not found: `clarify`, note `The link <url> does not open the <title> page. Please send the working application link.`
3. **Facts check out.** Organisation real, dates in the future, details match the source. Can't confirm the organisation exists: `reject`, note `unable to verify <organisation>`. Deadline passed: `reject`, note `the deadline (<date>) has passed`.
4. **Enough to publish.** Missing a field the source can't fill (deadline is fine to leave out: the server sets +30 days): `clarify`, naming the exact field.
5. Otherwise `approve` with a `listing`: the cleaned upload body exactly as /up-uploading builds it (`kind` = the item's `contentType`, title, organisation field, `url`, description rewritten clean, location, dates, `canonicalTags`). Fix spelling and casing; keep the facts.

Each agent returns plan entries `{ ref, action, note?, listing?, why }` plus the reply draft for that item (section D). Merge them into `~/up-work-with-up/<date>/plan.json` as `{ "items": [...] }` (drop `why` into the report, not the plan).

Then: `W check plan.json`. Fix every `invalid`; for a `duplicate`, the listing is already live, so `reject` with note `already live on UP: <existingTitle>` and send them the live link. Re-check until clean, then `W apply plan.json`. Retry a `failed` item once. A `published_not_recorded` goes first under "Needs you" with its id, so nobody publishes it twice.

## B. Paid orders (verdict only)

For each paid item, check and write a verdict for the owner:
- **Paid?** `order.paidAt` set. (The owner's approve button re-checks Paystack.)
- **What it runs against.** `target.contentId` set, or `target.listingRef` pointing at an item in this order. None: verdict says "no target recorded: find the live listing and start by hand", and names the live listing if you can find it on UP.
- **Content fit.** Same checks as A (belongs, link, facts).
- **Start date.** At least 5 working days after the order for Distribute and Campaign.

Verdict: `Approve`, `Ask for <exact thing>`, or `Can't deliver: <reason>` (plus refund note). Draft the matching reply. Never call the review route for these.

## C. Leads (who to pitch)

Two pools:
- **Work with us customers**: every contact in queue.json, plus `history`.
- **Platform posters**: `leads.json`, organisations with live listings in the last 90 days, by views.

Spin up one subagent for the top 30 platform posters (web research in parallel is the slow part). For each, find: what the organisation is, size (multinational, big local brand, government programme, NGO, startup, individual), whether it recruits or runs programmes often, and its **public** partnerships / marketing / HR contact page or email from its own website. Never collect a private person's personal email or phone, and never guess an address.

Score each lead 0-100:
| Signal | Points |
| --- | --- |
| Big brand, bank, telco, multinational, government or donor programme | +30 |
| Posts often (3+ listings in 90 days, or a repeat Work with us customer) | +20 |
| Their listings already pull views (`viewsPerListing` in the top quarter) | +15 |
| Deadline or event within 30 days (a reason to boost now) | +15 |
| Has paid us before (`history.spentNg > 0`) | +10 |
| Reachable public business contact found | +10 |
| Individual, unverified, or rejected before | -30 |

Hot = 70+, Warm = 40-69, Cold = below 40. Show Hot and Warm only; Cold stays in `leads-scored.json`.

Match a package (prices from the UP Rate Card, all + 7.5% VAT):
- **Boost ₦20,000**: one listing, closing within 30 days, small or mid organisation.
- **Distribute ₦50,000**: a big brand or a programme with a national intake; or 3+ listings at once.
- **Campaign ₦125,000**: multinationals, banks, telcos, government and donor programmes, multi-country recruiting.
- **Tailored**: anything bigger. Point them to WhatsApp / "Reach out".

For each Hot and Warm lead write a pitch (D).

## D. Replies and pitches (drafts only)

Every draft is a real, finished message: no brackets left, the order ID in every operational email, signed "UP".

- Free approved: the `approved` template from `app/work-with-us/admin/mail.ts` (or its wording below if the repo isn't here), with the live page link from the apply report and no payment line. For a Hot/Warm lead, add one soft line about Boost.
- Free clarify: the `clarification` template, the exact thing named, no payment line.
- Free reject: `cannot-verify` for unverifiable, `rejected` ("Cannot deliver") for everything else.
- Paid: the template matching the verdict.
- Unpaid over 3 days: one short nudge: their order is saved, here is how to finish paying, or reply on WhatsApp.
- Pitch: 80-120 words. Open with their own listing and its real numbers on UP ("your Graduate Trainee role has had 1,240 views on UP this month"), say what the matched package adds, the price + VAT, one call to action (reply, or `https://www.glowupchannel.com/work-with-us`). No pressure lines, no fake scarcity.

Write each body to `~/up-work-with-up/<date>/mail/<ref-or-slug>.txt`, then `W mail <to> "<subject>" <file>` gives the Gmail compose link. Put the link on the item's "Open in Gmail" button. A pitch with no public email gets a "Copy" button only and the contact page link.

## E. Report

One self-contained HTML file at `~/up-work-with-up/<date>/report.html` (never published online; it holds customer contacts and must not go in the repo). UP look: navy `#0B1233`, orange `#FF6A00`, white cards, mobile friendly, a Copy button on every draft. Sections in this order:

1. **Top line**: published P · asked to fix C · rejected R · paid waiting W · Hot leads H · estimated pipeline ₦X (sum of matched packages for Hot leads).
2. **Needs you**: paid orders to approve on the admin page (link), anything unsure, junk orders, `published_not_recorded`.
3. **Paid orders**: title, buyer, package, amount, days waiting, verdict, reply button.
4. **Free listings done**: title, outcome, live link or the exact note, reply button.
5. **Leads**: Hot then Warm, each with score, why (the signals), package, pitch, Gmail / Copy button.
6. **Unpaid**: nudges.

Open it in the built-in browser to check it renders, then hand back the path.

## Output (chat)

```
Work with us - <date>
Published P · Fix asked C · Rejected R · Paid waiting W · Hot leads H (~₦X pipeline)

Needs you:
1. <the one thing> - <where>

Report: <full path to report.html>
```

End with one line: the single most valuable next action (usually: approve paid order X, or send the pitch to the top lead).
