---
name: up-playlist
description: Build and refresh public playlists on UP from what is live on the platform. Reads every live job, opportunity and event with its views and saves, picks themes people will want now (by country and global/remote), makes up to 10 new lists of 8-15 items, refreshes the lists it made before (dead items out, fresh ones in) and deletes its old lists that have nothing live left. Use for /up-playlist, "make playlists", "refresh the playlists".
---

# /up-playlist

Input: nothing, or a focus (a country, a kind, or a theme such as "scholarships") to bias this run toward.

Output: new public playlists live on UP, old ones refreshed, empty ones deleted, and a short report.

The run is **fully automatic**. Do not stop to ask before creating, updating or deleting. Anything you are unsure about comes back under "Needs you" and is left untouched.

## Setup (once per laptop)

- Needs Node 18+. The client is `playlist.mjs` in this skill's folder. Below, `PL` means `node "<this skill folder>/playlist.mjs"`.
- Uses the same personal key as /up-uploading, from `~/.up-uploader.env` (`UP_UPLOAD_KEY=upk_...`). Never print, paste, ask for or store the key anywhere else. If it is missing, stop and tell the person to get one from the UP owner.
- Run `PL me` first. A 401 means a bad or revoked key. A 403 means the account is not an active admin; only the owner fixes that. Never change the account's role, status or permissions.
- It works on the production backend. Lists are public at once and show in Discover. Every list is owned by the key's account (`claude.ai@up.com`).

## What the server enforces

You can't break these, but plan to them so `check` passes first time:

- A list holds **8-15 live items** after every create or update.
- Only listings live right now can be added. Item titles and organisations are copied from the listing by the server.
- An update always drops items whose listing is no longer live (expired, taken down, deleted).
- Name 1-50 chars and unique among this account's lists. Description 20-200 chars. Up to 10 hashtags.
- The key only touches lists its own account made. A list can be deleted **only** when it has no live item left.
- Resources and gifts are never added.

Everyone else's dead lists are not this skill's job. The Worker runs `playlistCleanup` on the first and last day of every month: it deletes any public list with no live listing that has been dead and untouched (no edit, view, share, click or like) for 30+ days, and private lists only when they hold no items. Deleted lists are backed up in `playlist_cleanup_log`.

## Steps

1. **Read the platform.** Run `PL catalog`. It saves every live listing to `~/up-playlists/<date>/catalog.json` and prints counts, top countries, top tags, how many close within 7 days, and the most engaged listings. Each row has `kind`, `id`, `title`, `org`, `subtype`, `category`, `country`, `countryCode`, `city`, `isRemote`, `closes`, `tags`, `views`, `saves`, `likes`, `playlistAdds`, `createdAt`.
2. **Read the lists.** Run `PL mine`. It saves `~/up-playlists/<date>/playlists.json` with `mine` (this account's lists; every item marked `live`) and `popular` (the 50 most-saved public lists by other people). Lists flagged `EMPTY` have no live item; `LOW` have fewer than 8.
3. **Plan the old lists first** (see "Refreshing"). Then **pick new themes** (see "Picking themes") for up to 10 new lists.
4. **Fill each list** (see "Filling a list").
5. **Write the plan** to `~/up-playlists/<date>/plan.json` as `{ "items": [ ... ] }`:
   - Create: `{ "action": "create", "name", "description", "hashtags": [...], "add": [{ "kind", "id" }, ...], "why": "<signal behind this theme>" }`
   - Update: `{ "action": "update", "id", "add": [...], "remove": [contentId, ...], "name"?, "description"?, "hashtags"? }`. Send only what changes. Dead items drop out on their own; `remove` is for live items that no longer fit.
   - Delete: `{ "action": "delete", "id", "reason": "no live items" }`
   - `why` is for your report; the server ignores it.
6. **Check.** Run `PL check <plan>`. Nothing is written. Fix every `invalid` item (swap a not-live id, add or cut items to land in 8-15, rename a clashing name) and run check again.
7. **Apply.** Run `PL apply <plan>`. The report lands next to the plan as `plan.apply-report.json` with a `page` link per list. Do not retry an item more than once.
8. Report back (see Output).

## Refreshing old lists

For every list in `mine`, in order:

- `liveCount` is 0: **delete** it. Reason `no live items`.
- Otherwise update it: dead items drop on their own. Top it back up to at least 8 (aim for 10-12) with live listings that fit its theme and are not already in it. Prefer the newest and the most engaged. Keep its name unless the theme has drifted.
- If it can't reach 8 because not enough live listings fit, leave it out of the plan and put it under "Needs you" with how many fit.
- A list with good `saves`/`views` keeps its name and theme. Never rename a list people have saved.

## Picking themes

A theme is a group of listings a person would follow as one list: one audience, one goal, one place. Look for the strongest signals, in this order:

1. **Volume.** A tag, subtype, category or city with many live listings (for example `industry:data-ai` jobs in NG, fully funded master's scholarships, Lagos tech events this month).
2. **Engagement.** Clusters whose listings have high `saves`, `views`, `likes` or `playlistAdds`. These are proven demand.
3. **Urgency.** Many listings closing within 7-14 days on one theme ("Closing this week: …").
4. **What will trend.** Web-search what people in the top countries are looking for this month: application seasons (scholarship intakes, graduate-trainee cycles, NYSC, summer internships opening), big events coming up, hiring waves. Only make a list for a trend when the catalog has 8+ live listings to back it.
5. **Gaps.** A theme with demand that no list in `mine` or `popular` covers yet.

Split by country:
- **Country lists** use listings in that country (plus remote listings open to it if the theme needs them). Put the country or city in the name ("Lagos tech jobs hiring now").
- **Global lists** use remote listings or international opportunities open across countries ("Fully funded master's abroad").
- Spread the run across the top countries by volume, with at least 2 global lists when the catalog supports them.

Avoid:
- A theme that duplicates one of this account's lists. Refresh that list instead.
- Copying a `popular` name. Learn what works from them; name yours differently.
- Vague themes ("Great opportunities", "Jobs for you").
- Mixing kinds unless the theme needs it ("Break into tech: jobs, bootcamps and meetups" is fine).

## Filling a list

- 8-15 items; aim for 10-12. Every item clearly fits the theme.
- Best first: order `add` by fit, then engagement (`saves` weighs most), then newness. The list keeps that order.
- Skip listings that close within 2 days. They will be dead before most people see the list.
- No more than 3 items from the same organisation in one list.
- One listing may sit in at most 2 lists made in this run.
- **Name**: up to 50 chars, plain and specific, Title or sentence case, no emoji, no hype ("Remote design jobs, open now", "Abuja events: tech & startups"). 
- **Description**: 20-200 chars. Who it is for and what they get. No "Click here".
- **Hashtags**: 3-6, lowercase, no `#` sign, no spaces (`scholarships`, `remotejobs`, `lagos`).

## Output

Reply in this shape, nothing else:

```
Catalog: N live (J jobs, O opportunities, E events) across C countries
Created K · Refreshed R · Deleted D · Needs you U

Created:
1. <name> (<country or Global>, <items> items) - <page link> - <why>

Refreshed:
1. <name> - <page link> - dropped <n> dead, added <n>

Deleted:
1. <name> - no live items

Needs you:
1. <name or theme> - <the one question>
```

Leave out an empty section.
