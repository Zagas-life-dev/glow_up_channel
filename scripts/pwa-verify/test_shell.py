"""Drive a real Chromium against the production build to prove the SW works."""
from playwright.sync_api import sync_playwright
import sys

BASE = "http://localhost:3114"
ok = True

def check(label, cond, detail=""):
    global ok
    print(("PASS  " if cond else "FAIL  ") + label + ((" :: " + str(detail)) if detail else ""))
    if not cond:
        ok = False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    page.goto(BASE + "/", wait_until="load")
    # Wait for the worker to install, activate and take control.
    # serviceWorker.ready resolves while activate's waitUntil is still running,
    # so wait for the controller rather than trusting the first state read.
    state = page.evaluate("""async () => {
        const reg = await navigator.serviceWorker.ready
        if (reg.active && reg.active.state !== 'activated') {
            await new Promise(res => {
                reg.active.addEventListener('statechange', function h() {
                    if (reg.active.state === 'activated') { reg.active.removeEventListener('statechange', h); res() }
                })
                setTimeout(res, 5000)
            })
        }
        return { active: !!reg.active, scope: reg.scope, state: reg.active && reg.active.state,
                 controlled: !!navigator.serviceWorker.controller }
    }""")
    check("service worker activates", state["active"] and state["state"] == "activated", state)

    caches = page.evaluate("async () => await caches.keys()")
    check("precache created", any(c.startswith("up-precache-") for c in caches), caches)
    precached = page.evaluate("""async () => {
        const c = await caches.open((await caches.keys()).find(k => k.startsWith('up-precache-')))
        return (await c.keys()).map(r => new URL(r.url).pathname)
    }""")
    check("offline page precached", "/offline.html" in precached, precached)

    # Visit a second page so the document cache has something in it, then
    # reload so this page is served by the worker rather than by first-load.
    page.goto(BASE + "/opportunities", wait_until="load")
    page.goto(BASE + "/", wait_until="load")
    page.wait_for_timeout(1500)

    docs = page.evaluate("""async () => {
        const k = (await caches.keys()).find(x => x.startsWith('up-documents-'))
        if (!k) return []
        const c = await caches.open(k)
        return (await c.keys()).map(r => new URL(r.url).pathname)
    }""")
    check("documents cached on visit", "/opportunities" in docs or "/" in docs, docs)

    assets = page.evaluate("""async () => {
        const k = (await caches.keys()).find(x => x.startsWith('up-assets-'))
        if (!k) return []
        const c = await caches.open(k)
        return (await c.keys()).length
    }""")
    check("build assets cached", assets > 0, str(assets) + " entries")

    # --- go offline -------------------------------------------------------
    ctx.set_offline(True)

    r = page.goto(BASE + "/opportunities", wait_until="domcontentloaded")
    body = page.evaluate("() => document.body.innerText")
    check("offline: previously visited page still renders",
          r is not None and r.status == 200 and "You're offline" not in body,
          "status=%s" % (r.status if r else None))

    r2 = page.goto(BASE + "/a-page-never-visited-before", wait_until="domcontentloaded")
    body2 = page.evaluate("() => document.body.innerText")
    check("offline: unvisited page shows the offline notice",
          r2 is not None and r2.status == 200 and "You're offline" in body2,
          "status=%s | %s" % (r2.status if r2 else None, body2.strip()[:60].replace("\n", " ")))

    # Public listing data is cached on purpose now (see the offline suite). What
    # must still never be stored: RSC payloads, this origin's own route handlers,
    # and any API path outside the allowlist.
    PUBLIC = r"^/api/(opportunities|events|jobs|resources)(/([a-f0-9]{24}|categories|types|featured))?$"
    forbidden = page.evaluate("""async (pattern) => {
        const allowed = new RegExp(pattern, 'i')
        const site = location.origin
        const bad = []
        for (const k of await caches.keys()) {
            const c = await caches.open(k)
            for (const req of await c.keys()) {
                const u = new URL(req.url)
                if (u.searchParams.has('_rsc')) { bad.push(req.url); continue }
                if (!u.pathname.startsWith('/api/')) continue
                // Same-origin /api/* are the Next route handlers: never cacheable.
                if (u.origin === site || !allowed.test(u.pathname)) bad.push(req.url)
            }
        }
        return bad
    }""", PUBLIC)
    check("no RSC, route-handler or non-allowlisted API responses cached",
          forbidden == [], forbidden)

    ctx.set_offline(False)
    browser.close()

print()
print("RESULT:", "ALL PASSED" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)
