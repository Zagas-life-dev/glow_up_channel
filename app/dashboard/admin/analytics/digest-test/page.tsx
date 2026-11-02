"use client"

/**
 * Admin: the Monday digest A/B test, cancelled on 3 Nov 2026 when Stories
 * replaced the digest. Read-only: the results of the weeks it ran, explained by
 * DigestResultsView. Stories has its own page (analytics/stories).
 */

import { useCallback, useEffect, useState } from "react"
import { RiFlaskLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AnalyticsTabs } from "@/components/admin/analytics-tabs"
import { AdminEmpty, AdminSkeletonStats } from "@/components/admin/ui"
import { DigestResultsView, DIGEST_GROUP_NAMES } from "@/components/digest/digest-results"
import { fetchDigestResults, type DigestResults } from "@/lib/digest/api"

export default function DigestTestPage() {
  const [data, setData] = useState<DigestResults | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchDigestResults())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load results")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AdminShell
      title="Digest A/B test (ended)"
      description={`Cancelled on 3 Nov 2026, when Stories replaced the digest. Half of the 1,000 most active users got a Monday digest ("${DIGEST_GROUP_NAMES.A}"), half didn't ("${DIGEST_GROUP_NAMES.B}"). These are the weeks it ran.`}
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AnalyticsTabs />

        {loading && !data ? <AdminSkeletonStats /> : null}

        {data && !data.assigned ? (
          <AdminEmpty icon={RiFlaskLine} title="No results" description="The test was cancelled before groups were assigned." />
        ) : null}

        {data?.assigned ? <DigestResultsView data={data} /> : null}
      </div>
    </AdminShell>
  )
}
