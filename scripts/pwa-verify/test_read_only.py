"""Offline is read-only: cached listings still render, write controls do not.

Also covers the two moments the caches are thrown away — reconnecting after an
outage, and starting a new session — since both are only observable in a real
browser with a real service worker.
"""
from playwright.sync_api import sync_playwright
import sys

SITE = "http://localhost:3114"
API = "http://localhost:3002"

ok = True
def check(label, cond, detail=""):
    global ok
    print(("PASS  " if cond else "FAIL  ") + label + ((" :: " + str(detail)) if detail else ""))
    if not cond:
        ok = False

WAIT_FOR_SW = """async () => {
    const reg = await navigator.serviceWorker.ready
    if (reg.active && reg.active.state !== 'activated') {
        await new Promise(res => {
            reg.active.addEventListener('statechange', function h() {
                if (reg.active.state === 'activated') { reg.active.removeEventListener('statechange', h); res() }
            })
            setTimeout(res, 5000)
        })
    }
}"""

# Action buttons carry an aria-label; counting them is how "the control is gone"
# is asserted without depending on which icon library rendered it.
COUNT_ACTIONS = """() => {
    const labels = Array.from(document.querySelectorAll('[aria-label]'))
        .map(el => (el.getAttribute('aria-label') || '').toLowerCase())
    const has = (needle) => labels.filter(l => l.includes(needle)).length
    return { like: has('like'), save: has('save'), playlist: has('playlist'), share: has('share') }
}"""

CACHE_NAMES = "async () => await caches.keys()"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    page.goto(SITE + "/", wait_until="load")
    page.evaluate(WAIT_FOR_SW)

    # Browse online so the listing page and its data are both cached.
    page.goto(SITE + "/opportunities", wait_until="load")
    page.wait_for_timeout(2500)

    online_cards = page.evaluate(
        "() => document.body.innerText.includes('Cached opportunity')")
    check("listings render while online", online_cards)

    online_actions = page.evaluate(COUNT_ACTIONS)
    check("write controls present while online",
          online_actions["save"] > 0 and online_actions["like"] > 0, online_actions)

    # --- offline ----------------------------------------------------------
    ctx.set_offline(True)
    page.goto(SITE + "/opportunities", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    offline_cards = page.evaluate(
        "() => document.body.innerText.includes('Cached opportunity')")
    check("cached listings still render offline", offline_cards)

    offline_actions = page.evaluate(COUNT_ACTIONS)
    check("like is hidden offline", offline_actions["like"] == 0, offline_actions)
    check("save is hidden offline", offline_actions["save"] == 0, offline_actions)
    check("add-to-playlist is hidden offline", offline_actions["playlist"] == 0, offline_actions)
    check("share survives offline (clipboard/share sheet need no network)",
          offline_actions["share"] > 0, offline_actions)

    banner = page.evaluate("""() => {
        const el = document.querySelector('[role="status"][aria-live="polite"]')
        return el ? el.innerText.trim() : null
    }""")
    check("banner says offline and explains the app is read-only",
          banner is not None and "offline" in banner.lower()
          and ("read" in banner.lower() or "not save" in banner.lower()), banner)

    # --- reconnect clears the caches and reloads --------------------------
    # The oldest API entry's timestamp is the evidence: if the caches were really
    # dropped and refilled, every entry afterwards is newer than this.
    OLDEST_STAMP = """async () => {
        const name = (await caches.keys()).find(k => k.startsWith('up-api-'))
        if (!name) return null
        const cache = await caches.open(name)
        const keys = await cache.keys()
        const stamps = []
        for (const key of keys) {
            const res = await cache.match(key)
            const at = Number(res && res.headers.get('x-up-cached-at'))
            if (Number.isFinite(at) && at > 0) stamps.push(at)
        }
        return stamps.length ? Math.min(...stamps) : null
    }"""

    before_stamp = page.evaluate(OLDEST_STAMP)
    check("listing data was cached during the outage", before_stamp is not None, before_stamp)

    reloaded = []
    page.on("load", lambda _: reloaded.append(1))
    ctx.set_offline(False)
    page.evaluate("() => window.dispatchEvent(new Event('online'))")
    # Banner settles for 1.5s, clears caches, then reloads.
    page.wait_for_timeout(7000)

    check("page reloads itself once the connection returns", len(reloaded) > 0,
          "%d load event(s)" % len(reloaded))

    after_stamp = page.evaluate(OLDEST_STAMP)
    check("every cached entry was replaced after reconnecting",
          before_stamp is not None and after_stamp is not None and after_stamp > before_stamp,
          "oldest entry %s -> %s" % (before_stamp, after_stamp))

    # --- a new session refreshes too --------------------------------------
    fresh = ctx.new_page()
    fresh.goto(SITE + "/opportunities", wait_until="load")
    fresh.wait_for_timeout(2500)
    session_flag = fresh.evaluate("() => sessionStorage.getItem('up:caches-refreshed')")
    check("entering the app marks the session as refreshed", session_flag == "1", session_flag)

    renders_fresh = fresh.evaluate(
        "() => document.body.innerText.includes('Cached opportunity')")
    check("a new session still renders listings after the refresh", renders_fresh)

    browser.close()

print()
print("RESULT:", "ALL PASSED" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)
