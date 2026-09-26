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

`background_color` is navy `#0B1233` — the launch screen, matching the iOS
splash images. There is no `orientation` lock (it pinned installed tablets and
foldables to portrait). `launch_handler: navigate-existing` sends a link or
notification tapped while the app is open into the open window rather than a
second copy.

### Browser chrome colour

`theme_color` in the manifest is only the pre-load default. After that the
status bar / installed title bar follows the reader's theme, matching the app's
own top bar: `#FBFAF7` light, `#070A1C` dark.

| Piece | Location |
|-------|----------|
| Per-`prefers-color-scheme` tags, first paint | `viewport.themeColor` in `app/layout.tsx` |
| Manual light/dark choice overriding the OS | `components/theme-color-sync.tsx` |
| iOS | `appleWebApp.statusBarStyle: "default"` in `app/layout.tsx` |

iOS uses `default`, not `black-translucent`: translucent always draws white
status-bar text, which vanished against the cream bar in light mode. The
viewport, theme-color and Apple tags all come from Next's `metadata` / `viewport`
exports now — don't hand-write them in `<head>` again, that produced duplicates.

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

### Updates

An installed app is resumed for days rather than reloaded, so its code drifts
behind the deployment. `components/register-sw.tsx` shows a toast — *"A new
version of UP is ready"* with **Refresh** — when either:

- `/api/version` (`app/api/version/route.ts`) reports a different build than the
  `NEXT_PUBLIC_BUILD_ID` baked into the page (set in `next.config.mjs` from the
  Vercel commit SHA). Checked on every resume and every 30 minutes while visible.
  This is the common case: most deploys don't touch `sw.js`.
- a new worker is installed and waiting.

Updated workers **wait** instead of taking over mid-session — activating deletes
the old version's caches, and a page still on the old build would then fail to
load its own chunks. Refresh posts `up-skip-waiting`, waits for
`controllerchange`, then reloads. A first install still activates immediately.

### Caching strategies

| Request | Strategy | Cache |
|---------|----------|-------|
| Documents (navigations) | Network-first → cache → `/offline.html` | `up-documents-v4` (50) |
| `/_next/static/*` | Cache-first (content-hashed, always correct) | `up-assets-v4` (120) |
| Other same-origin CSS/JS/font/image | Stale-while-revalidate | `up-assets-v4` |
| **Public listing API** | **Network-first with a 3.5s timeout → cache** | `up-api-v4` (160) |
| **Remote images** | **Cache-first, CORS-readable responses only** | `up-images-v4` (48) |
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

## 4. Logo, icons and launch screens

Two steps, both scripted:

```
pnpm brand:recolor  # node scripts/recolor-brand-logo.mjs — only when the logo art changes
pnpm icons:pwa      # node scripts/generate-pwa-icons.mjs
```

**The logo.** The supplied art lives in `assets/brand/originals/` in the old
brand values (orange ≈ `#FF6700`, navy ≈ `#0B1222`). `brand:recolor` maps each
pixel onto the platform tokens, `#FF6A00` and `#0B1233`, by its position between
the two old colours — so the shape and its anti-aliased edges are untouched and
only the colours move. Outputs:

| File | What |
|------|------|
| `public/images/brand/up-logo-orange.png` | Navy mark on orange, 2000×2000 — the app icon |
| `public/images/brand/up-logo-navy.png` | Orange mark on navy, 1563×1563 — dark surfaces, launch screen |
| `public/images/Yellow and Black Modern Media Company Logo (14).png` | The in-app logo, recoloured **in place** so its references follow |

The two brand files are also on Cloudinary (`glowup-channel/brand/`); the URLs
are `BRAND_LOGOS` in `lib/seo/brand.ts`, and `BRAND.logo` (the Organization logo
in structured data) uses the orange one. After re-running `brand:recolor`,
re-upload them and update the versioned URLs there.

`brand:recolor` also writes the mark alone on transparency, `up-mark-navy.png`
and `up-mark-orange.png` (also on Cloudinary). **Every logo in the app UI is
`<UpLogo tone="navy" | "orange" />` (`components/up/up-logo.tsx`)**, which loads
those marks from Cloudinary at the size drawn (`brandLogoUrl` asks for 2×, auto
format) — the sidebar and shell tiles, the auth pages, the landing header and
footer, the sign-up nudge. Don't reintroduce a typed "UP" as a logo. The email
template uses the navy logo as a pinned-PNG absolute URL.

**The icons** are cut from those two files by colour and re-placed on a canvas
of the exact background colour, so each variant gets its own margin:

| File | Size | Purpose |
|------|------|---------|
| `icons/icon-192.png`, `icon-512.png` | 192, 512 | `any` — rounded orange tile on transparency |
| `icons/icon-maskable-192.png`, `-512.png` | 192, 512 | `maskable` — full bleed, mark inside the 0.4 safe radius |
| `icons/apple-touch-icon.png` | 180 | iOS home screen — full bleed, opaque |
| `icons/badge-96.png` | 96 | Android notification badge — white mark, shape in alpha only |
| `splash/apple-splash-*.png` | 19 devices | iOS launch screens — the navy logo |

The script also writes `lib/pwa/apple-splash.generated.ts`, which `app/layout.tsx`
passes to `appleWebApp.startupImage`. iOS needs an exact pixel match per device
and never scales, so the list and the files must come from the same run — add a
device to `DEVICES` in the script, not to the generated file.

---

## 5. Install prompt

`components/pwa-install-banner.tsx`, drawn to the components design: a corner
card on desktop, a bottom sheet on phones.

- **Opens by itself** from the reader's second visit (one visit = one browser
  session), signed in or not, 8s after load so the gift and extreme announcement
  get first claim on the visit's single interruption (`lib/interruptions.ts`).
  Only where installing is possible: a captured `beforeinstallprompt`, or iOS.
- **Sidebar "Install app"** always opens it, skipping every gate — they asked.
- One orange **Install** when the browser can do it; otherwise the numbered
  steps for that browser are the whole card.
- Dismissal is remembered for 7 days. `appinstalled` closes it for good.

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
- (2026-09-26, production build) one manifest link and one viewport tag; both
  theme-color tags; 19 startup images; manual dark overrides the OS tags and
  "system" restores them; a mismatched `/api/version` raises the update toast
  and Refresh reloads; the sidebar install opens for a signed-out visitor;
  offline page renders in both themes. All four suites re-run and passing on v4.

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
- **Real-device check of the iOS status bar and splash.** `default` status-bar
  style plus theme-color is the documented behaviour on iOS 15+, but it has only
  been checked in Chromium. Install on an iPhone in both themes and confirm the
  bar colour and that the launch screen appears (not white).
- **Image caching is unproven against real Cloudinary URLs.** The code caches only
  CORS-readable responses and passes opaque ones through uncached, so the failure
  mode is "no image cached", not a broken image — but it has only been exercised
  against a local mock.
- **Lighthouse/PWABuilder against a deployed HTTPS origin.** All of the above was
  verified on localhost.
