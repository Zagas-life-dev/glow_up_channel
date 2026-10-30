---
name: up-approving
description: Review and approve every job, opportunity and event waiting on UP (Pending and Hidden). Pulls the queue by API, checks each listing's link and facts against the web, fills missing fields and dates, re-tags it with the controlled taxonomy, deletes duplicates, closed listings and anything that doesn't belong on UP (parties, spam, news), then approves the rest live. Use for /up-approving, "approve the pending listings", "clear the moderation queue".
---

# /up-approving

Input: nothing, or a kind (`job`, `opportunity`, `event`) to do only that kind.

Output: the queue is cleared. Each listing is approved live after its fixes, deleted with a reason, or handed back under "Needs you".

The run is **fully automatic**. Do not stop to ask before approving or deleting. Only listings you are unsure about come back to the person, and those are left untouched.

Resources are **paused**. The queue leaves them out.

## Setup (once per laptop)

- Needs Node 18+. The client is `approve.mjs` in this skill's folder. Below, `APPROVE` means `node "<this skill folder>/approve.mjs"`.
- Uses the same personal key as /up-uploading, from `~/.up-uploader.env` (`UP_UPLOAD_KEY=upk_...`). Never print, paste, ask for or store the key anywhere else. If it is missing, stop and tell the person to get one from the UP owner.
- Run `APPROVE me` first. A 401 means a bad or revoked key. A 403 means the account is not an active admin; only the owner fixes that. Never change the account's role, status or permissions.
- It works on the production backend. Approvals are public at once. **Deletes are permanent.** The server keeps a backup of each deleted listing in `approval_log`, but nobody restores it without the owner.
- The field table and tag rules are the same as in `../up-uploading/SKILL.md`. Read that file's "Field table" and "Tag rules" sections before the first listing.

## Steps

1. **Get the tag list.** Run `APPROVE tags`. Pick tags only from it.
2. **Pull the queue.** Run `APPROVE pending` (or `APPROVE pending <kind>`). It saves every not-live listing, oldest first, as `~/up-approvals/<date>/queue-01.json`, `queue-02.json`, ... with 25 listings per file. Each row has `kind`, `id`, `state` (`pending` or `hidden`), `listing` (the stored document) and `duplicates` (similar listings in the same country, each with `_id`, `state`, `title`, `organization`, `link`, `reasons`).
3. **Work one queue file at a time.** Decide every listing in it with the checks below, in order. The first check that fails decides it. Keep a running list of ids you have deleted, so you never approve or re-decide one in a later file.
4. **Write the plan** for that file to `~/up-approvals/<date>/plan-NN.json` as `{ "items": [ ... ] }`:
   - Approve: `{ "kind", "id", "action": "approve", "updates": { ...only changed fields }, "reason": "<what you fixed>" }`. Send `location`, `dates`, `pricing` and `requirements` whole when you change any part of them, because they replace the stored object. Always send `canonicalTags`.
   - Delete: `{ "kind", "id", "action": "delete", "reason": "<one reason from the list below>" }`.
   - Add `"allowDuplicate": true` only when you checked a flagged match and it is a different listing (other role, other city, other edition). Name the match in `reason`.
5. **Check.** Run `APPROVE check <plan>`. Nothing is written. Fix each `invalid` problem from the listing or a search, then run check again. If a problem can't be fixed, change the item to a delete with the matching reason, or move it to "Needs you". For a `duplicate` result, open the match it names and decide: delete this one, or `allowDuplicate` if they are different listings.
6. **Apply.** Run `APPROVE apply <plan>`. The report lands next to the plan as `<plan>.apply-report.json`, with a `page` link per approved listing. Do not retry a `failed` item more than once.
7. Go to the next queue file. When all are done, report back (see Output).

## Checks per listing

**A. Duplicate.** Look at `duplicates`, then at the queue itself. Two listings are the same when they have the same organisation **and** the same role, programme or edition. Country copies are never flagged.
- Same as a `live` match: delete this one. Reason: `duplicate of live <id>`.
- Same as other `pending`/`hidden` listings only: keep the best one, which has the official link, the most complete details and the latest valid deadline. Approve it. Delete the rest. Reason: `duplicate of <kept id>`.
- Flagged, but a different listing: carry on, and later approve with `allowDuplicate: true`.

**B. Belongs on UP.** UP lists jobs, opportunities (scholarships, fellowships, grants, competitions, programmes, internships, awards, volunteering) and events that help people's careers and growth (conferences, workshops, webinars, meetups, hackathons, career fairs, industry festivals). Delete with reason `not for UP: <what it is>` when it is:
- a party, club night, concert, hangout or other purely social event;
- a sale, product promo, giveaway, raffle, MLM or "pay to get a job" scheme;
- a news story, blog post or announcement with nothing to apply to or attend;
- spam, gibberish or a test post;
- a resource (article, guide, course page). Resources are paused, so delete with reason `resource - paused`.
When a listing mixes both (for example a tech summit with an after-party), keep it. Remove the party part from the description, and say so in `reason`.

**C. Right kind.** The API can't move a listing to another kind. If a listing is filed as the wrong kind (for example an event stored as an opportunity), delete it with reason `wrong kind: re-uploaded as <kind>`. Then add it to a batch for the /up-uploading steps and upload it as the right kind. List it under "Re-uploaded".

**D. Link works.** Open the apply link (`url`, or an older field such as `applicationLink`): WebFetch first, then the built-in browser `get_page_text` if the page is blocked, empty or JS-rendered.
- It works and is the real apply/register page: keep it.
- It is a landing page with an Apply/Register button: follow the button and use that page as `url`.
- It is dead, login-walled or unrelated: web-search the title and the organisation for the official page. If you find it, use it as `url`. If not, use an email or WhatsApp apply link built per the field table. If there is no way to apply at all, delete with reason `no working apply link`.

**E. Still open and up to date.** Compare the listing with the live page and a web search (the organisation's own site first). Facts from the source win.
- The deadline or event date has passed and there is no new edition: delete with reason `closed (<date>)`.
- The source shows a new deadline, date, venue, pay, eligibility or title: update those fields.
- Job or opportunity with no closing date anywhere: leave `applicationDeadline` out. The server sets it to today + 30 days and returns `defaultDeadline`.
- Event with no start date anywhere: delete with reason `no event date`.

**F. Fill and fix.** Bring the listing up to the field table:
- the organisation field (`company` / `provider` / `organizer`);
- the sub-group field (`jobType` / `type` + `category` / `eventType`);
- `location` with country name and ISO code, or `isRemote`;
- `pricing`, `requirements` and `industrySectors` when the source states them.
- Rewrite `description` in your own words when it is thin, scraped junk, all caps, broken HTML or a pasted page. It must be 20-2000 chars and say what it is, who it is for, what they get and how to apply.
- Fix the title: no "Apply now", no emoji, no shouting, 5-200 chars.
- Never invent a fact. Leave a field out when no source confirms it.

**G. Tag.** Send a full `canonicalTags` set every time, using the /up-uploading tag rules: 5-10 tags, per-facet limits, required facets, one `type:` tag. These tags are saved as admin tags and are never re-tagged, so get them right. Replace any stored tag that is wrong for the listing.

**Unsure.** If you can't tell whether two listings are the same, or whether a listing belongs on UP, leave it out of the plan. Put it under "Needs you" with the question. Never delete on a guess.

## Output

Reply in this shape, nothing else:

```
Queue: N listings (J jobs, O opportunities, E events)
Approved A · Deleted D · Re-uploaded R · Needs you U

Approved:
1. <title> (<kind>, <country>) - <page link> - <what you fixed, short> [add "closes <date> (default +30 days)" when the report has defaultDeadline]

Deleted:
1. <title> (<kind>, id) - <reason>

Re-uploaded as another kind:
1. <title> - <old kind> → <new kind> - <new page link>

Needs you:
1. <title> (<kind>, id) - <the one question>

Failed:
1. <title> (<kind>, id) - <status and message>
```

Leave out a section that is empty. With more than 15 approved, list the first 15 and write "+ N more in ~/up-approvals/<date>/". Do the same for deleted.
