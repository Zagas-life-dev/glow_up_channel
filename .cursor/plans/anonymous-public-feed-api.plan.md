# Anonymous Public Feed API – Plan (revised)

## Goal

- **Single API** for anonymous users: **100 items** (30 opp, 28 events, 27 jobs, 15 resources), interleaved **R → J → E → O**.
- **Store the feed in the DB** so the API serves a **cached list** (no recompute on every request).
- **Anonymous ID** in localStorage; send with feed request; backend tracks anon as a “user” and can store **anon engagement data** (e.g. views, content opened).
- **On signup: merge** all tracked anon data into the new account (engagements, views, etc.).
- Engagement (like, save, show more) continues to show the existing **sign-up popup**.

---

## 1. Backend: Public feed endpoint and DB cache

- **Route:** `GET /api/feed/anonymous` (no auth). Optional header or query: `X-Anon-Id` / `anonId`.
- **Feed source:** Serve from a **DB cache** (required). Do not recompute the 100-item list on every request.
  - **Collection:** e.g. `public_feed_cache` with one document: `{ _id: 'default', feed: [ { type, _id, ...normalizedItem }, ... ], updatedAt }`.
  - **Build/refresh:** A job or a lazy refresh (e.g. if `updatedAt` is older than TTL, e.g. 5–15 min) should:
    - Fetch 15 resources, 27 jobs, 28 events, 30 opportunities (active only) from the four collections.
    - Interleave in order R, J, E, O (round-robin until caps reached).
    - Normalize each item to the shape FeedCard expects; write the array to `public_feed_cache`.
  - **API handler:** Read from `public_feed_cache` and return `{ success: true, data: { feed } }`. If cache is empty or missing, trigger a one-off build (or return empty and let a job fill it).
- **Anon tracking:** If `anonId` is present, upsert `anon_visitors` (e.g. `{ anonId, firstSeen, lastSeen }`) and optionally record that this anon requested the feed (for analytics).

**Files:** New controller (e.g. `publicFeedController.js`), new route (e.g. `routes/feed.js`), register route; optionally a small service or cron to refresh the cache.

---

## 2. Backend: Anonymous engagement storage and merge on signup

- **Store anon engagement:** When an anon views content or attempts an action (e.g. “view” or “attempted like”), store it keyed by **anonId** (not userId). Use a collection such as `anon_engagements`: e.g. `{ anonId, contentId, contentType: 'opportunity'|'event'|'job'|'resource', action: 'view'|'attempted_like'|..., createdAt }`. No auth required for writes; anonId from header/body.
- **Merge on signup:** When the user **signs up** (or completes registration / first login), call a **merge** step:
  - **Option A – in register flow:** Registration API accepts optional `anonId` in body. After creating the user, call an internal **mergeAnonToUser(anonId, userId)** that:
    - Finds all `anon_engagements` for that `anonId`.
    - For each, create or update the corresponding real user engagement (e.g. insert into `post_engagements` with `userId` for community posts; or into a unified “content views” store for opportunities/jobs/events/resources if that exists). Avoid duplicates (e.g. by contentId + userId).
    - Optionally mark anon record as merged (e.g. set `mergedIntoUserId` on `anon_visitors`) or delete anon engagement rows after merge.
  - **Option B – dedicated endpoint:** After signup, frontend calls `POST /api/auth/merge-anon` with `{ anonId }` and auth token. Backend does the same merge logic.
- **Data to merge:** At minimum, merge **views** and **attempted engagements** (e.g. content they opened or tried to like) into the new user’s engagement history so recommendations and feed can use it.

**Files:** New or existing anon engagement model/collection; merge service or function; hook in `authController` (e.g. after `_registerUser` or in a route that runs right after first login) or new route `POST /api/auth/merge-anon`; ensure anon engagement writes are called from the public feed or a small anon-tracking API when anon views/attempts action.

---

## 3. Frontend: Anon ID and feed for guests

- **Anonymous ID:** Generate (e.g. UUID) once, store in **localStorage** under `glowup-anon-id`. Send with every public-feed request (e.g. `X-Anon-Id` or `anonId` query).
- **Home feed when !isAuthenticated:** Call `GET /api/feed/anonymous` with anon ID; display returned `feed` array with existing **FeedCard**; no pagination needed for the single cached page (or keep `hasMore: false`).
- **Send anonId on signup:** When user submits signup, include `anonId` from localStorage in the registration request body so the backend can merge (if using Option A). After successful signup, clear or keep `glowup-anon-id` (optional: keep for “merged” flag or remove).
- **Engagement:** Existing behavior: anon engagement (like, save, show more) triggers **sign-up popup**; no new popup logic.

**Files:** [app/page.tsx](app/page.tsx) (fetch logic for anon feed + anonId); signup form or auth client (send `anonId` on register); optional small helper to get/set anon ID.

---

## 4. Interleave and cache build (reference)

- **Counts:** 15 resources, 27 jobs, 28 events, 30 opportunities (100 total).
- **Order:** Round-robin R, J, E, O (index `i` → use `i % 4` to pick type; when one list is exhausted, take next non-empty in order R→J→E→O until 100 or all exhausted).
- **Cache document:** Store the **normalized** items (with `type` and all fields FeedCard needs) so the API is a simple read from DB.

---

## 5. Todos

| # | Task | Notes |
|---|------|--------|
| 1 | **Backend: Add `public_feed_cache` and cache-build logic** | One document (e.g. `_id: 'default'`) with `feed[]` and `updatedAt`. Build: fetch 15/27/28/30 from the four collections (active only), interleave R-J-E-O, normalize for FeedCard, write to cache. Lazy refresh or cron by TTL. |
| 2 | **Backend: Add `GET /api/feed/anonymous`** | No auth. Read feed from `public_feed_cache`; return `{ success, data: { feed } }`. Accept optional `X-Anon-Id` or `anonId`; upsert `anon_visitors` if present. |
| 3 | **Backend: Anon engagement storage** | Collection `anon_engagements` (e.g. `anonId`, `contentId`, `contentType`, `action`, `createdAt`). Endpoint or internal path to record anon view/attempted action when anon requests feed or views content (no auth). |
| 4 | **Backend: Merge anon → user on signup** | In register flow (or `POST /api/auth/merge-anon`): accept `anonId`; load `anon_engagements` for that anonId; create equivalent engagements for the new `userId` (e.g. in `post_engagements` or existing content-engagement store); mark anon as merged or delete anon rows. |
| 5 | **Frontend: Anon ID in localStorage** | Get or generate UUID, store under `glowup-anon-id`; expose to fetch and to signup. |
| 6 | **Frontend: Home feed for anon** | When `!isAuthenticated`, call `GET /api/feed/anonymous` with anon ID; set feed state from `data.feed`; render with FeedCard; keep existing sign-up popup on engage. |
| 7 | **Frontend: Send anonId on signup** | Include `anonId` (from localStorage) in registration request body so backend can merge; optionally clear anon ID after successful signup. |

---

## Summary

- **Feed:** Always served from **DB cache** (no per-request recompute). Cache built with 100 items (15 R, 27 J, 28 E, 30 O), interleaved R-J-E-O.
- **Anon:** Identified by **anonId** (localStorage); backend tracks in `anon_visitors` and `anon_engagements`.
- **Signup:** Backend **merges** all anon engagement data into the new user account so the account “inherits” the anon’s history.
- **UX:** Anon sees the same feed UI; engagement still shows the existing sign-up popup.
