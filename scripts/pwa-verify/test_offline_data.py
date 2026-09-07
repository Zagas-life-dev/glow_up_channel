"""Exercise the elaborated offline mode against a real production build."""
from playwright.sync_api import sync_playwright
import sys

SITE = "http://localhost:3114"
API = "http://localhost:3002"
OID = "507f1f77bcf86cd799439011"

ok = True
def check(label, cond, detail=""):
    global ok
    print(("PASS  " if cond else "FAIL  ") + label + ((" :: " + str(detail)) if detail else ""))
    if not cond:
        ok = False

# Fetch from inside the page so the service worker intercepts it, exactly as the
# app's own api-client calls would be intercepted.
FETCH = """async (u) => {
    try {
        const r = await fetch(u, { headers: { Authorization: 'Bearer fake.token.value' } })
        let body = null
        try { body = await r.clone().json() } catch (e) {}
        return { ok: r.ok, status: r.status, body: body, stamp: r.headers.get('x-up-cached-at') }
    } catch (e) { return { error: String(e) } }
}"""

CACHED_URLS = """async (prefix) => {
    const name = (await caches.keys()).find(k => k.startsWith(prefix))
    if (!name) return []
    const c = await caches.open(name)
    return (await c.keys()).map(r => r.url)
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    page.goto(SITE + "/", wait_until="load")
    page.evaluate("""async () => {
        const reg = await navigator.serviceWorker.ready
        if (reg.active && reg.active.state !== 'activated') {
            await new Promise(res => {
                reg.active.addEventListener('statechange', function h() {
                    if (reg.active.state === 'activated') { reg.active.removeEventListener('statechange', h); res() }
                })
                setTimeout(res, 5000)
            })
        }
    }""")
    check("worker controls the page", page.evaluate("() => !!navigator.serviceWorker.controller"))

    # The navigation that installs the worker is not itself controlled by it, so
    # browse a little while online first — this is what a real session looks like
    # before the network drops, and it is what fills the document cache.
    page.goto(SITE + "/opportunities", wait_until="load")
    page.goto(SITE + "/events", wait_until="load")
    page.goto(SITE + "/", wait_until="load")
    page.wait_for_timeout(1200)
    docs = page.evaluate(CACHED_URLS, "up-documents-")
    check("browsed pages are cached as documents", len(docs) >= 2,
          [u.split("3114")[-1] for u in docs])

    # --- what is allowed into the cache ----------------------------------
    for path in ["/api/opportunities", "/api/events", "/api/jobs", "/api/resources",
                 "/api/opportunities/" + OID, "/api/opportunities/categories"]:
        page.evaluate(FETCH, API + path)
    for path in ["/api/notifications", "/api/users/me", "/api/opportunities/inactive",
                 "/api/opportunities/my/opportunities", "/api/playlists"]:
        page.evaluate(FETCH, API + path)
    page.wait_for_timeout(1200)

    api_cached = page.evaluate(CACHED_URLS, "up-api-")
    paths = sorted(u.replace(API, "") for u in api_cached)

    check("public listing endpoints cached",
          all(("/api/" + s) in paths for s in ["opportunities", "events", "jobs", "resources"]), paths)
    check("public detail endpoint cached", ("/api/opportunities/" + OID) in paths)
    check("personalised endpoints NOT cached",
          not any(x in p_ for p_ in paths for x in ["notifications", "users/me", "playlists"]), paths)
    check("role-gated listing paths NOT cached",
          not any(x in p_ for p_ in paths for x in ["inactive", "my/opportunities"]), paths)

    stamped = page.evaluate("""async (prefix) => {
        const name = (await caches.keys()).find(k => k.startsWith(prefix))
        const c = await caches.open(name)
        const keys = await c.keys()
        const r = await c.match(keys[0])
        return r.headers.get('x-up-cached-at')
    }""", "up-api-")
    check("cached responses carry a timestamp", stamped is not None and stamped.isdigit(), stamped)

    # --- offline: does real data still come back -------------------------
    ctx.set_offline(True)

    r = page.evaluate(FETCH, API + "/api/opportunities")
    served = r.get("body") or {}
    listings = (served.get("data") or {}).get("opportunities")
    check("offline: cached listing data is served",
          r.get("ok") is True and served.get("success") is True
          and isinstance(listings, list) and len(listings) > 0,
          {"ok": r.get("ok"), "status": r.get("status"), "error": r.get("error"),
           "listings": len(listings) if isinstance(listings, list) else listings})

    r2 = page.evaluate(FETCH, API + "/api/opportunities?never=fetched")
    b2 = r2.get("body") or {}
    check("offline: uncached-but-allowed endpoint returns a readable offline error",
          r2.get("status") == 503 and b2.get("offline") is True and "offline" in (b2.get("message") or "").lower(),
          {k: r2.get(k) for k in ("status", "error")})

    r3 = page.evaluate(FETCH, API + "/api/notifications")
    check("offline: non-allowlisted endpoint is not answered from cache",
          r3.get("error") is not None or r3.get("ok") is False, r3)

    # --- offline banner ---------------------------------------------------
    page.goto(SITE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    banner = page.evaluate("""() => {
        const el = document.querySelector('[role="status"][aria-live="polite"]')
        return el ? el.innerText.trim() : null
    }""")
    check("offline banner is shown and names the state",
          banner is not None and "offline" in banner.lower(), banner)

    # --- offline page lists what can still be opened ----------------------
    page.goto(SITE + "/offline.html", wait_until="load")
    page.wait_for_timeout(900)
    links = page.evaluate("""() => Array.from(document.querySelectorAll('#available-list a'))
        .map(a => a.getAttribute('href'))""")
    check("offline page offers cached pages to open", len(links) > 0, links)

    ctx.set_offline(False)
    browser.close()

print()
print("RESULT:", "ALL PASSED" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)
