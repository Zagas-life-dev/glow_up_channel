"use client"
// TEMPORARY: renders the digest results with live numbers from 26 Oct. Delete after checking.
import { DigestResultsView } from "@/components/digest/digest-results"
const data = {"experiment":"digest-2026-10","assigned":true,"weeks":["2026-10-26","2026-11-02","2026-11-09","2026-11-16"],"groups":{"A":{"users":500,"pushOn":30},"B":{"users":500,"pushOn":32}},"overall":{"trackerAddsPerUserWeek":{"A":0.016,"B":0.01},"liftPct":60},"byWeek":[{"week":"2026-10-26","partial":true,"trackerAddsPerUser":{"A":0.016,"B":0.01},"trackerAdds":{"A":8,"B":5},"trackerAddsFromDigest":0,"activeRate":{"A":1,"B":0.6},"savesPerUser":{"A":0,"B":0},"funnel":{"pushSent":32,"pushOpened":0,"shown":2,"clicked":0,"saved":0,"trackedAll":0,"itemClicks":0,"engagementRate":0,"shownPushOn":1,"shownPushOff":1}}]}
export default function Page() {
  return <div className="mx-auto max-w-5xl space-y-5 p-6"><DigestResultsView data={data} /></div>
}
