---
name: up-uploading
description: Upload jobs, opportunities and events to UP from pasted links, flyer images or raw text. Reads each item, searches the web for missing details, extracts the listing, tags it with the controlled taxonomy, groups it by kind/type/location, posts it live as the uploader account, and hands back every item it could not upload. Use for /up-uploading, "upload these to UP", or a pasted flyer/post to put on UP.
---

# /up-uploading

Input: any mix of items in the args or the message:
- **Links** to a listing page.
- **Images**: flyers, posters, screenshots of a post. Read every detail off the image yourself (title, organiser, dates, venue, eligibility, how to apply, contacts). The image is only read; it is never uploaded to UP.
- **Raw text**: a pasted post, WhatsApp/Telegram broadcast, email or caption.

Output: listings live on UP, plus a list of items skipped and why.

Resources are **paused**. An item that is a resource (article, guide, toolkit, course page, PDF) goes on the skipped list as "resource - paused". Do not upload it.

## Setup (once per laptop)

- Needs Node 18+. The client is `upload.mjs` in this skill's folder. Below, `UPLOAD` means `node "<this skill folder>/upload.mjs"`.
- Each person has their own upload key from the UP owner. The person saves it in `~/.up-uploader.env` as one line: `UP_UPLOAD_KEY=upk_...`. Never print, paste, ask for or store the key anywhere else (not in batches, skill files or chat). If the key is missing, stop and tell the person to get one from the owner.
- Run `UPLOAD me` first. It shows the key holder and the account. A 401 means a bad or revoked key. A 403 means the account is not an active admin; only the owner fixes that. Never change the account's role, status or permissions.
- It posts to the production backend. Every upload is real and public.

## Steps

1. **Get the tag list.** Run `UPLOAD tags`. Pick tags only from it. A tag marked `[job]` or `[event]` is only allowed on that kind.
2. **Read each item.**
   - Link: use WebFetch first. If it is blocked, empty or JS-rendered, use the built-in browser `get_page_text`. If the page needs a login or is gone (404), skip it. Follow the "Apply"/"Register" button to get the real apply URL.
   - Image: read it directly. Copy names, numbers, emails, dates and URLs exactly as printed; double-check digits in phone numbers and dates.
   - Raw text: read it as given.
   - One item can hold several listings (e.g. a careers page or flyer with 5 roles). Make one listing per role, if each role has its own details.
3. **Fill gaps by searching.** When a field the table needs is missing or unclear (organiser's full name, country, deadline, apply link, description detail), web-search the item: its title plus the organiser. Use the official page you find (organiser's own site first) and use its facts. Facts from the search beat a blurry or partial flyer. If the search finds an official listing page, use it as `sourceUrl` too. Never fill a field from a guess; leave it out if nothing confirms it.
4. **Classify (grouping).** Pick exactly one `kind`:
   - `job`: paid employment role at a company (full-time, part-time, contract, internship that is a job post).
   - `opportunity`: scholarship, fellowship, grant, competition, accelerator/programme, award, internship programme, volunteering, call for applications.
   - `event`: dated gathering (conference, summit, workshop, webinar, meetup, hackathon day, festival).
   - Then the sub-group field: `jobType`, `type` (opportunity) or `eventType`. Values are in the field table below.
5. **Extract fields** per the table. Use only facts from the item or the search. Never invent a deadline, salary, location or eligibility rule. Leave a field out when no source says it.
6. **Tag.** Fill `canonicalTags` with the tag rules below.
7. **Write the batch** to `~/up-uploads/<YYYY-MM-DD>-<n>.json` as `{ "listings": [ ... ] }`. Each item has `kind`, `sourceUrl` and body fields. `sourceUrl` is the pasted link; for an image or text item it is the official page found by search, else leave it out. Any size; the client sends 25 per request.
8. **Check.** Run `UPLOAD check ~/up-uploads/<file>.json`. The server runs every rule and the duplicate search but writes nothing. Fix each `invalid` problem from the item or a search. If a problem cannot be fixed (missing country, no description, closed), drop that item and add it to skipped. Repeat until nothing is `invalid`.
9. **Upload.** Run `UPLOAD upload ~/up-uploads/<file>.json`. The server skips duplicates (same title or apply link already on UP, live or hidden), posts the rest live, and logs each one against your key. The report lands next to the batch as `<file>.upload-report.json`, with a `page` link per uploaded listing.
10. **Report back** (see Output).

## Skip an item when

- Link unreachable, login-walled, or 404, and search finds no other official page.
- Image unreadable and search finds nothing.
- Listing closed: deadline or event date already past.
- No way to apply can be found: no apply/register URL, email or WhatsApp number.
- No organisation name, or no description of at least 20 characters.
- No country and not remote.
- It is a resource (paused), a news story, or not a listing.
- Already on UP (the upload step reports these as duplicates).

## Field table

Common to all kinds:

| Field | Rule |
|---|---|
| `title` | 5-200 chars. Role or programme name, no "Apply now", no org suffix unless needed. |
| `description` | 20-2000 chars. Write it in your own words from the item and search: what it is, who it is for, what you get, how to apply. Plain text, short paragraphs. Do not paste the page verbatim. |
| `url` | How to apply/register, as one link. In order of preference: the apply/register web link; else the listing page itself; else an email or WhatsApp link built as below. |
| Email apply | `https://mail.google.com/mail/?view=cm&to=<email>&su=<subject>`. Subject: the subject the listing asks for, else `Application: <title>` for jobs and opportunities or `Registration: <title>` for events. URL-encode the subject (spaces as `%20`). Example: `https://mail.google.com/mail/?view=cm&to=Sophia@africangirlguide.org&su=Application%3A%20Girls%20in%20Tech%20Fellowship`. |
| WhatsApp apply | `https://wa.me/<number>`: full international number, digits only, no `+`, spaces or leading 0. Nigerian `0811 341 7773` becomes `https://wa.me/2348113417773`. |
| Several contacts | Put the best one in `url` (web link, then email, then WhatsApp). Put the rest in the description's "How to apply" line, written out (email address, WhatsApp number). |
| `location` | `{ country, countryCode, province?, city?, isRemote, remoteCountries? }`. Country by full name ("Nigeria") plus ISO-2 code. Remote: `isRemote: true` and `remoteCountries` (names) when the page restricts who may apply; `country: "Global"` when open worldwide. Several cities in one country: add `places: [{ country, countryCode, province?, city? }]`. Places in other countries also go in `places`; the backend makes one copy per country. |
| `dates` | ISO-8601 (`2026-11-30T23:59:59Z`). Use the timezone the page states, else end of day UTC. |
| `pricing` | `{ isPaid, amount?, currency?, period?, benefits?[] }`. Job: `isPaid` = it pays a salary, `period` from hourly/daily/weekly/monthly/annually/one-time. Opportunity: funding/stipend amount. Event: `isPaid` = ticket costs money, `amount` = ticket price. Currency as ISO code (NGN, KES, USD, ...). |
| `tags` | Up to 10 short free-text keywords from the page (each 50 chars max). |
| `industrySectors` | Any of: `Technology`, `Creative Arts & Media`, `Business & Finance`, `Healthcare & Sciences`, `Education & Training`, `Government & Public Service`. |
| `image` | Only an image URL an online listing page shows (og:image is fine). Never a flyer the person pasted, since it has no URL. Else leave out. |

Per kind:

| Kind | Fields |
|---|---|
| `job` | `company` (required), `jobType` one of `full-time, part-time, contract, freelance, internship, remote, volunteer, temporary, graduate-trainee, other`, `dates.applicationDeadline`, `dates.startDate`, `requirements` (array of strings, one per requirement), `benefits` (array of strings). |
| `opportunity` | `provider` (required), `type` one of `scholarship, fellowship, grant, competition, program, internship, award, volunteering, other` (also send the same value as `category`), `dates.applicationDeadline`, `dates.startDate`, `dates.endDate`, `dates.duration` (string, e.g. "6 months"), `requirements: { educationLevel?, careerStage?, ageRange?, citizenship?, Eligible_participants?, other? }` with eligibility text in `other`. |
| `event` | `organizer` (required), `eventType` one of `conference, summit, workshop, seminar, webinar, networking, exhibition, festival, talk, hackathon, other`, `dates.startDate` (required), `dates.endDate`, `dates.registrationDeadline`, `dates.timezone` (IANA, e.g. `Africa/Lagos`), `location.address`, `location.isHybrid`, `capacity: { maxAttendees }` when stated, `requirements: { prerequisites: [] }`. Online-only events: `isRemote: true`. |

## Tag rules (`canonicalTags`)

- Ids are `facet:slug` from `tags` output only. Send 5-10. Fewer than 4 fails the check (it would get re-tagged by AI).
- Per-facet max: type 5, format 2, work 2, level 2, industry 5, skill 5, community 3.
- Required: job needs `industry` + `level`; event needs `industry` + `format`; opportunity needs `industry`.
- Allowed facets: job has no `format`; event has no `work`. `type:job` only on jobs, `type:event` only on events.
- Always add one `type:` tag that matches the kind/sub-group (job: `type:job`, plus `type:internship` or `type:graduate-trainee` when true; opportunity: `type:scholarship`, `type:grant`, `type:fellowship`, ...; event: `type:event`, plus `type:hackathon` when true).
- `level`: student / entry / mid / senior from the stated experience or audience.
- `work`: full-time / part-time / contract / remote / hybrid when the page says so.
- `community`: only when the listing targets that group (women, youth, founders, creatives, ...).
- `skill`: only skills the listing names as required.
- Tags you send are locked as provider tags. Rules and AI never overwrite them, so get them right.

## Output

Reply in this shape, nothing else:

```
Uploaded N / M items

Live:
1. <title> (<kind>, <country>) - <page link from report>

Skipped (send these back to me or upload by hand):
1. <pasted link, or "image: <short description>" / "text: <first words>"> - <reason>

Duplicates (already on UP):
1. <pasted item> - <title>
```

If the upload step reports `failed`, list each under Skipped with its status and message. Do not retry a failed item more than once.
