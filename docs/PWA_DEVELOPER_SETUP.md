# PWA developer setup – requirements checklist

This doc maps **PWABuilder / web.dev** PWA requirements to how GlowUp is set up and what you need for store submission.

---

## 1. HTTPS

**Requirement:** The PWA must be served over HTTPS.

**GlowUp:** Configure your host (Vercel, Netlify, etc.) so the production site uses HTTPS. No code changes needed.

---

## 2. Web App Manifest

**Requirement:** A valid manifest that defines app name, icons, display mode, etc.

**GlowUp:**

| Item | Location |
|------|----------|
| Manifest source | **`app/manifest.ts`** (Next.js turns this into a manifest route) |
| Manifest URL | **`/manifest.webmanifest`** (served at the app root) |
| Link in HTML | **`<link rel="manifest" href="/manifest.webmanifest" />`** in `app/layout.tsx` |

The manifest includes: `name`, `short_name`, `description`, `start_url`, `display: standalone`, `theme_color`, `background_color`, `scope`, and `icons`. No separate `manifest.json` file is required; `/manifest.webmanifest` is valid for stores.

---

## 3. Service worker

**Requirement:** A service worker for offline behavior and/or network handling.

**GlowUp:**

| Item | Location |
|------|----------|
| Service worker file | **`public/sw.js`** (served as `/sw.js`) |
| Registration | **`components/register-sw.tsx`** registers `/sw.js` with scope `/` on the client |

The current worker handles **push notifications** (install, activate, push, notificationclick). For full offline caching of pages/assets, you can extend `public/sw.js` with a fetch handler and a cache strategy.

---

## 4. Icons

**Requirement:** High‑resolution icons as specified in the manifest so the home screen icon is not a screenshot.

**GlowUp:**

- **Manifest** (`app/manifest.ts`): Uses `/images/logo-icon-transparent.svg` (any + maskable) and PNG entries for **192×192** and **512×512**.
- **Layout** (`app/layout.tsx`): Sets `icons` in metadata and `apple-touch-icon` to `/images/logo-icon-transparent.png`.

**For store submission:** Ensure these files exist under `public/images/`:

- `logo-icon-transparent.png` – used for 192×192 and 512×512 in the manifest and for Apple touch icon. Export at least **512×512** (and optionally 192×192) from your design tool or generate from the SVG.

If you only have the SVG, you can add PNGs by exporting 192×192 and 512×512 from the SVG (e.g. via build script or image tool).

---

## Quick reference

| Requirement | Status | Where |
|-------------|--------|--------|
| HTTPS | Deployment | Host config (e.g. Vercel) |
| Manifest | Done | `app/manifest.ts` → `/manifest.webmanifest` |
| Manifest link in HTML | Done | `app/layout.tsx` |
| Service worker | Done | `public/sw.js` + `RegisterSw` |
| Icons | Configured | Manifest + `public/images/`; add PNGs if missing |

After deploying over HTTPS, you can validate the PWA with [PWABuilder](https://www.pwabuilder.com/) or [Lighthouse](https://developer.chrome.com/docs/lighthouse/) (Progressive Web App section).
