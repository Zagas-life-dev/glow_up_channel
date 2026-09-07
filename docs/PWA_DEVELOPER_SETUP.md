# PWA setup

How the installable-app layer is wired, and what is verified working.

Everything below was checked against a production build (`next build` + `next start`)
driven by a real Chromium, not inferred from the source.

---

## 1. HTTPS

Required for service workers. `localhost` counts as a secure context, so the
worker registers in local production testing; anywhere else needs real HTTPS.
Host config, no code.

---

## 2. Manifest

| Item | Location |
|------|----------|
| Source | `app/manifest.ts` |
| Served at | `/manifest.webmanifest` (prerendered static at build) |
| Link tag | **emitted by Next.js automatically** from the `app/manifest.ts` convention |

Do not add a `<link rel="manifest">` to `app/layout.tsx` — Next.js already emits
one, and a hand-written tag produced a duplicate in the rendered `<head>`.

`id` is pinned to `/` so a future change to `start_url` doesn't read as a
different app to already-installed users.

---

## 3. Service worker

| Item | Location |
|------|----------|
| Worker | `public/sw.js` → `/sw.js` |
| Registration | `components/register-sw.tsx`, mounted in `app/layout.tsx` |
| Offline page | `public/offline.html` |

**Registration is production-only.** In development the worker is not registered
and any existing registration on the origin is torn down, because a worker that
caches build output will happily serve a stale bundle after a code change. If
you need to exercise it locally, run `pnpm build && pnpm start`.

### Caching strategies

| Request | Strategy | Cache |
|---------|----------|-------|
| Documents (navigations) | Network-first → cache → `/offline.html` | `up-documents-v3` (50) |
| `/_next/static/*` | Cache-first (content-hashed, always correct) | `up-assets-v3` (120) |
| Other same-origin CSS/JS/font/image | Stale-while-revalidate | `up-assets-v3` |
| **Public listing API** | **Network-first with a 3.5s timeout → cache** | `up-api-v3` (160) |
| **Remote images** | **Cache-first, CORS-readable responses only** | `up-images-v3` (48) |
| `?_rsc=` payloads, same-origin `/api/*` | **Never cached** | — |
| Any API path outside the allowlist | **Never cached** | — |

`/offline.html` and `/` are precached on install. `/` is there because the
navigation that installs the worker is not itself controlled by it — without it,
a user who installs the app and immediately loses signal has nothing to open.

### What may be cached from the API, and why that is safe

Caching a shell without data produced an app that opened and then sat empty:
every listing fetch went to the API on another origin and failed. So listing data
is cached too, but only from a closed list:

```
/api/{opportunities,events,jobs,resources}
/api/{opportunities,events,jobs,resources}/<24-hex ObjectId>
/api/{opportunities,events,jobs,resources}/{categories,types,featured}
```

The safety argument is structural, not a judgement call. Those routes are mounted
in Express with **no `authenticateToken` and no `optionalAuth`**, so `req.user` is
never populated and every caller gets identical bytes. The client does attach a
Bearer token to them — `makeAuthenticatedRequest` does that uniformly — but the
token cannot change the response, so one user's cached copy can never contain
another's data.

> **If you widen `PUBLIC_API`, check the Express route first.** The moment an
> allowlisted route gains `authenticateToken` or `optionalAuth`, its response can
> vary per user and caching it becomes a cross-user data leak.
> `scripts/pwa-verify/test_shell.py` duplicates the allowlist so that widening the
> worker without updating the test fails loudly.

Sign-out posts `up-clear-caches` to the worker, which drops the document, API and
image caches. Only public data is ever stored, so that is belt-and-braces — it is
what keeps the guarantee true on a shared device if the list above ever drifts.

### The timeout, and why it is not just for offline

The API strategy serves the cached copy when the network has not answered in
3.5s. The request is not cancelled — it keeps running and refreshes the cache —
so this only bounds what the user waits for.

That matters beyond aeroplane mode. The feed fans out to four endpoints per load
and the audience is on high-latency mobile data, where the difference between a
usable screen and a spinner is exactly this fallback. It is also why the banner
distinguishes "offline" from "slow connection": the second is the common case and
users otherwise read it as the app being broken.

### Offline is read-only

Nothing is queued for replay, so a write with no connection can only fail. The
app takes the controls away rather than letting people press them:

| Layer | Where | Covers |
|-------|-------|--------|
| Enforcement | `assertWritableOffline` in `lib/api-client.ts` | Every write. Non-GET requests throw `ApiClient.OFFLINE_WRITE_MESSAGE` before touching the network — including the multipart uploads and the auth calls, which use raw `fetch` and so restate the guard rather than inheriting it. |
| Presentation | `useReadOnly()` from `hooks/use-online-status.ts` | Like, save, add-to-playlist and post are hidden in `components/engagement-actions.tsx` and `components/feed-card.tsx`. |

Share deliberately survives: it is the OS share sheet or the clipboard, and
neither needs the network. Its analytics call was already `.catch`-swallowed.

The two layers are not redundant. Hiding a control is presentation and only
covers the surfaces someone remembered to gate; the API guard covers the rest and
turns a deep `Failed to fetch` into a sentence. If a write queue is ever added,
`useReadOnly()` is the one place that has to change.

### When the caches are thrown away

Cached listings go stale invisibly — a deadline passes, an event is cancelled —
so rather than expiring entries individually the whole set is dropped at the two
points where the user's expectation resets. Both live in
`lib/offline/cache-control.ts`, and both are conditional on being online, since
clearing while offline would destroy the only readable content.

| Moment | What happens |
|--------|--------------|
| Connection returns | The banner holds for 1.5s (a connection coming back is often one flapping), then clears the caches and reloads. What was on screen was saved during the outage, so it is the content most likely to be wrong. |
| New session | `refreshCachesOnEntry()` clears once per session on entry. No reload — the page is already loading and its own requests refill the caches. |
| Sign-out | `ApiClient.logout()` clears as well. |

The worker acknowledges the clear over a `MessageChannel`, which is what lets the
reconnect path wait before reloading — otherwise the new page could be answered
from caches that were still being deleted.

Clearing on entry matters most on a slow connection: with the cache empty the
first load waits for the network instead of being answered from yesterday's copy
the moment the timeout elapses.

### Telling the user

`components/offline-banner.tsx` shows a bar for three states — offline, serving
cached data on a slow connection (with the age of that data), and back online.
The signal arrives as a `postMessage` from the worker when it actually serves a
cached response, so no request path in the app has to know the feature exists and
`lib/api-client.ts` is untouched by it.

`public/offline.html` reads the document cache and lists the pages that will
actually open, so being offline is a detour rather than a wall.

**Bumping the worker:** change `VERSION` in `public/sw.js`. Activation deletes
every `up-*` cache that isn't in the current set.

---

## 4. Icons

Generated, not hand-exported:

```
pnpm icons:pwa      # node scripts/generate-pwa-icons.mjs
```

Source is the app icon, `public/images/Yellow and Black Modern Media Company
Logo (14).png` — the UP wordmark the navbar, footer and sidebar already use.
Output is `public/icons/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192 | `any` |
| `icon-512.png` | 512×512 | `any` |
| `icon-maskable-192.png` | 192×192 | `maskable` |
| `icon-maskable-512.png` | 512×512 | `maskable` |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `badge-96.png` | 96×96 | Android notification badge |

Three things the script exists to get right:

- **Declared sizes match the real bitmaps.** The manifest previously declared
  `512x512` for a file that was actually 500×500.
- **`any` and `maskable` are not the same image.** `any` keeps the artwork as
  designed, rounded corners and all. `maskable` is full-bleed, because the
  platform crops it to its own shape and a transparent corner under that mask
  reads as a hole. Measured rather than guessed: the wordmark spans 59.6% × 34.8%
  of the canvas, a half-diagonal of 0.345 against Android's 0.400 safe radius, so
  it survives the crop at full size and needs no shrinking.
- **The masked variants are built from a crop of the source's interior.** The
  rounded corner carries a slightly lighter rim (`28,35,50` against the
  `11,18,34` ground) which, composited onto a full-bleed background, survives as
  a ghost outline of the original rounded square — the exact artefact a mask
  would then show off. Cropping inside the corner arcs removes it and re-centres
  the wordmark, which sits 2.5px right and 7.5px low in the source.

The badge is a white silhouette carried entirely in the alpha channel, built from
the wordmark's own orange pixels — Android keeps only the alpha, so the full tile
would reduce to a featureless filled square.

The icon's ground, `#0B1222`, is also the manifest `background_color` and the
app's dark `--page` token, so the icon, the splash screen and the app agree.

> That source file is also the in-app logo used by the navbar, footer and
> carousel. Don't rename it without updating those ~14 references *and* the path
> in `scripts/generate-pwa-icons.mjs`.

---

## 5. Install prompt

`components/pwa-install-banner.tsx` handles both paths: `beforeinstallprompt` on
Android/desktop, and per-browser "Add to Home Screen" instructions on iOS, which
has no programmatic install.

---

## Verified

Driven against a production build in headless Chromium — 37 checks across four
suites in `scripts/pwa-verify/` (see its README to run them):

- cached listings still **render** offline, with like/save/playlist gone and
  share intact, and the banner explaining the app is read-only
- reconnecting drops every cached entry and reloads (proved by the oldest
  cache timestamp moving forward), and a new session marks itself refreshed
- the API write guard refuses POST/PUT/PATCH/DELETE and sign-in while offline
  without touching the network, and still allows reads (`lib/offline-write-guard.test.ts`)
- worker activates, controls the page, and precaches the offline page and `/`
- browsed pages replay offline; an unvisited route falls back to the offline notice
- public listing endpoints are cached and replay offline with real bodies
- personalised (`/api/users/me`, `/api/notifications`, `/api/playlists`) and
  role-gated (`/inactive`, `/my/opportunities`) paths are refused
- no RSC payload or same-origin route handler is ever cached
- an uncached-but-allowed path offline returns a readable 503 rather than
  "Failed to fetch"
- on a slow network a warm request falls back to cache at the timeout (3.5s
  against a 6s server) and the banner says "slow connection", not "offline"
- Chrome parses the manifest with zero errors

## Not done yet

- **Offline writes are refused, not queued.** That is the deliberate design (see
  "Offline is read-only"), not an oversight — but it does mean a save made in a
  tunnel is lost rather than deferred. Queue-and-replay would need Background Sync
  plus a decision about the rules in `docs/SAVED_ITEMS_BACKWARD_COMPATIBILITY.md`.
- **Write controls are gated on the two shared components, not every surface.**
  `EngagementActions` and `FeedCard` cover the listing and detail pages; forms
  elsewhere (provider posting, profile settings, submissions) still render their
  buttons and fail through the API guard with a clear message rather than hiding
  up front.
- **Cached listings can outlive their deadline.** An opportunity that closed while
  the user was offline still shows. The cached copy is timestamped, so the detail
  page could warn on stale-and-dated content; it does not yet.
- **`screenshots` in the manifest.** Without them Chrome shows the basic install
  banner instead of the richer dialog. Needs real device captures.
- **Image caching is unproven against real Cloudinary URLs.** The code caches only
  CORS-readable responses and passes opaque ones through uncached, so the failure
  mode is "no image cached", not a broken image — but it has only been exercised
  against a local mock.
- **Lighthouse/PWABuilder against a deployed HTTPS origin.** All of the above was
  verified on localhost.
