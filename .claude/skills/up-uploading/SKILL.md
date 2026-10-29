---
name: up-uploading
description: Upload jobs, opportunities and events to UP from pasted links. Reads each link, extracts the listing, tags it with the controlled taxonomy, groups it by kind/type/location, posts it live as the uploader account, and hands back every link it could not upload. Use for /up-uploading or "upload these links to UP".
---

# /up-uploading

Input: one or more links (in the args or the message). Output: listings live on UP, plus a list of links skipped and why.

Resources are **paused**. A link that is a resource (article, guide, toolkit, course page, PDF) goes on the skipped list as "resource - paused". Do not upload it.

## Setup (once per laptop)

- Needs Node 18+. The client is `upload.mjs` in this skill's folder. Below, `UPLOAD` means `node "<this skill folder>/upload.mjs"`.
- Each person has their own upload key from the UP owner. The person saves it in `~/.up-uploader.env` as one line: `UP_UPLOAD_KEY=upk_...`. Never print, paste, ask for or store the key anywhere else (not in batches, skill files or chat). If the key is missing, stop and tell the person to get one from the owner.
- Run `UPLOAD me` first. It shows the key holder and the account. A 401 means a bad or revoked key. A 403 means the account is not an active admin; only the owner fixes that. Never change the account's role, status or permissions.
- It posts to the production backend. Every upload is real and public.

## Steps

1. **Get the tag list.** Run `UPLOAD tags`. Pick tags only from it. A tag marked `[job]` or `[event]` is only allowed on that kind.
2. **Read each link.** Use WebFetch first. If it is blocked, empty or JS-rendered, use the built-in browser `get_page_text`. If the page needs a login, is gone (404), or the listing is closed, skip the link.
   - One link can hold several listings (e.g. a careers page with 5 roles). Make one listing per role, if each role has its own details and apply link.
   - Follow the "Apply"/"Register" button to get the real apply URL when the page shows one.
3. **Classify (grouping).** Pick exactly one `kind`:
   - `job`: paid employment role at a company (full-time, part-time, contract, internship that is a job post).
   - `opportunity`: scholarship, fellowship, grant, competition, accelerator/programme, award, internship programme, volunteering, call for applications.
   - `event`: dated gathering (conference, summit, workshop, webinar, meetup, hackathon day, festival).
   - Then the sub-group field: `jobType`, `type` (opportunity) or `eventType`. Values are in the field table below.
4. **Extract fields** per the table. Use only facts on the page. Never invent a deadline, salary, location or eligibility rule. Leave a field out when the page does not say it.
5. **Tag.** Fill `canonicalTags` with the tag rules below.
6. **Write the batch** to `~/up-uploads/<YYYY-MM-DD>-<n>.json` as `{ "listings": [ ... ] }`. Each item has `kind`, `sourceUrl` (the pasted link) and body fields. Any size; the client sends 25 per request.
7. **Check.** Run `UPLOAD check ~/up-uploads/<file>.json`. The server runs every rule and the duplicate search but writes nothing. Fix each `invalid` problem from the page facts. If a problem cannot be fixed from the page (missing country, no description, closed), drop that item and add its link to skipped. Repeat until nothing is `invalid`.
8. **Upload.** Run `UPLOAD upload ~/up-uploads/<file>.json`. The server skips duplicates (same title or apply link already on UP, live or hidden), posts the rest live, and logs each one against your key. The report lands next to the batch as `<file>.upload-report.json`, with a `page` link per uploaded listing.
9. **Report back** (see Output).

## Skip a link when

- Page unreachable, login-walled, or 404.
- Listing closed: deadline or event date already past.
- No apply/register URL can be found.
- No organisation name, or no description of at least 20 characters.
- No country and not remote.
- It is a resource (paused), a news story, or not a listing.
- Already on UP (the upload step reports these as duplicates).

## Field table

Common to all kinds:

| Field | Rule |
|---|---|
| `title` | 5-200 chars. Role or programme name, no "Apply now", no org suffix unless needed. |
| `description` | 20-2000 chars. Write it in your own words from the page: what it is, who it is for, what you get, how to apply. Plain text, short paragraphs. Do not paste the page verbatim. |
| `url` | The apply/register link. Falls back to the pasted link when it is the apply page. |
| `location` | `{ country, countryCode, province?, city?, isRemote, remoteCountries? }`. Country by full name ("Nigeria") plus ISO-2 code. Remote: `isRemote: true` and `remoteCountries` (names) when the page restricts who may apply; `country: "Global"` when open worldwide. Several cities in one country: add `places: [{ country, countryCode, province?, city? }]`. Places in other countries also go in `places`; the backend makes one copy per country. |
| `dates` | ISO-8601 (`2026-11-30T23:59:59Z`). Use the timezone the page states, else end of day UTC. |
| `pricing` | `{ isPaid, amount?, currency?, period?, benefits?[] }`. Job: `isPaid` = it pays a salary, `period` from hourly/daily/weekly/monthly/annually/one-time. Opportunity: funding/stipend amount. Event: `isPaid` = ticket costs money, `amount` = ticket price. Currency as ISO code (NGN, KES, USD, ...). |
| `tags` | Up to 10 short free-text keywords from the page (each 50 chars max). |
| `industrySectors` | Any of: `Technology`, `Creative Arts & Media`, `Business & Finance`, `Healthcare & Sciences`, `Education & Training`, `Government & Public Service`. |
| `image` | Only an image URL the page itself shows for the listing (og:image is fine). Else leave out. |

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
Uploaded N / M links

Live:
1. <title> (<kind>, <country>) - <page link from report>

Skipped (send these back to me or upload by hand):
1. <pasted link> - <reason>

Duplicates (already on UP):
1. <pasted link> - <title>
```

If the upload step reports `failed`, list each under Skipped with its status and message. Do not retry a failed item more than once.
