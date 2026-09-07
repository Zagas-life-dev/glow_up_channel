from playwright.sync_api import sync_playwright
import sys
SITE="http://localhost:3114"; API="http://localhost:3002"
ok=True
def check(l,c,d=""):
    global ok
    print(("PASS  " if c else "FAIL  ")+l+((" :: "+str(d)) if d else ""))
    if not c: ok=False

with sync_playwright() as p:
    b=p.chromium.launch(headless=True); ctx=b.new_context(); page=ctx.new_page()
    page.goto(SITE+"/", wait_until="load")
    page.evaluate("async()=>{await navigator.serviceWorker.ready}")
    page.goto(SITE+"/", wait_until="load")
    page.evaluate("""()=>{ window.__stale=[]
        navigator.serviceWorker.addEventListener('message', e=>{
            if(e.data && e.data.type==='up-serving-cached') window.__stale.push(e.data) }) }""")

    URL = API + "/api/opportunities?slow=1"
    # First call has nothing cached, so it waits out the slow server in full.
    first = page.evaluate("""async (u)=>{ const t=performance.now()
        const r=await fetch(u); await r.json(); return {ms: performance.now()-t, status:r.status} }""", URL)
    check("cold slow request waits for the network", first["ms"] > 5000 and first["status"]==200,
          "%.0fms" % first["ms"])

    # Second call has a cached copy, so the timeout should cut it short.
    second = page.evaluate("""async (u)=>{ const t=performance.now()
        const r=await fetch(u); const j=await r.json(); return {ms: performance.now()-t, status:r.status, ok:j.success} }""", URL)
    check("warm slow request falls back to cache before the server answers",
          second["ms"] < 5000 and second["status"]==200 and second["ok"] is True,
          "%.0fms (server takes 6000ms, timeout is 3500ms)" % second["ms"])

    page.wait_for_timeout(600)
    stale = page.evaluate("()=>window.__stale")
    check("worker announces it served a cached copy", len(stale) > 0 and stale[0]["kind"]=="api", stale)

    banner = page.evaluate("""()=>{const el=document.querySelector('[role="status"][aria-live="polite"]')
        return el? el.innerText.trim(): null}""")
    check("banner explains the slow connection rather than claiming offline",
          banner is not None and "slow" in banner.lower(), banner)
    b.close()
print(); print("RESULT:", "ALL PASSED" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)
