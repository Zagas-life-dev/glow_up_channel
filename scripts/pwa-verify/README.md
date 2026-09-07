# PWA verification

Browser-driven checks for the service worker. These are **not** wired into
`pnpm test` — they need a production build, a running server and Playwright,
none of which vitest provides. Run them by hand after changing `public/sw.js`.

## Why they exist

Service worker bugs do not show up in unit tests or in a typecheck. Caching the
wrong endpoint is a data-leak class of bug, and "offline works" is not a claim
worth making from a code read. Each suite drives real Chromium against a real
build with the network genuinely cut.

## Running

```bash
pnpm build
pnpm start -p 3114                      # terminal 1
node scripts/pwa-verify/mock-api.js     # terminal 2 — stands in for the Express API on :3002
python scripts/pwa-verify/test_shell.py         # terminal 3
python scripts/pwa-verify/test_offline_data.py
python scripts/pwa-verify/test_slow_network.py
python scripts/pwa-verify/test_read_only.py
```

Needs `pip install playwright && playwright install chromium`. Ports are
hardcoded at the top of each file: the site on 3114, the mock API on 3002 to
match `NEXT_PUBLIC_BACKEND_URL` in `.env`.

## What each covers

| Suite | Asserts |
|-------|---------|
| `test_shell.py` | Worker activates and controls; offline page and start URL precached; visited pages replay offline; **no RSC, route-handler or non-allowlisted API response is ever cached** |
| `test_offline_data.py` | Public listing endpoints cached and replayed offline with real bodies; personalised and role-gated paths refused; cached copies timestamped; uncached-but-allowed paths return a readable 503; banner and offline-page list render |
| `test_slow_network.py` | A cold request waits for the network; a warm one falls back to cache at the timeout; the worker announces it, and the banner says "slow connection" rather than "offline" |
| `test_read_only.py` | Cached listings still **render** offline; like/save/add-to-playlist are gone and share remains; the banner says the app is read-only; reconnecting drops every cached entry and reloads; a new session marks itself refreshed |

The write guard behind the hidden buttons is unit-tested instead, in
`lib/offline-write-guard.test.ts` — it runs under `pnpm test` and needs no browser.

The allowlist assertion in `test_shell.py` duplicates `PUBLIC_API` from
`public/sw.js` on purpose — if someone widens the worker's list, this fails
rather than silently agreeing with it.
