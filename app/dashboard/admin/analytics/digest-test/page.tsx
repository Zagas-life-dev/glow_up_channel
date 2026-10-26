"use client"

/**
 * Admin: the Monday digest A/B test. Assigns the groups, then hands the
 * results to DigestResultsView, which explains them in plain words.
 */

import { useCallback, useEffect, useState } from "react"
import { RiFlaskLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AnalyticsTabs } from "@/components/admin/analytics-tabs"
import { AdminEmpty, AdminSkeletonStats } from "@/components/admin/ui"
import { DigestResultsView, DIGEST_GROUP_NAMES, fmtDay } from "@/components/digest/digest-results"
import { Button } from "@/components/ui/button"
import { assignDigestGroups, fetchDigestResults, type DigestResults } from "@/lib/digest/api"

export default function DigestTestPage() {
  const [data, setData] = useState<DigestResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

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

  const assign = async () => {
    if (!window.confirm("Pick the 1,000 most active users and split them 500 / 500? Groups are frozen once made.")) return
    setAssigning(true)
    try {
      const r = await assignDigestGroups()
      if (r.assigned) toast.success(`Assigned ${r.count}: ${r.A} in A, ${r.B} in B`)
      else toast.message(r.reason === "already_assigned" ? "Groups already exist" : "No active users found")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign groups")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <AdminShell
      title="Digest A/B test"
      description={`Does a Monday digest make people track more opportunities? Half of the 1,000 most active users get it ("${DIGEST_GROUP_NAMES.A}"), half don't ("${DIGEST_GROUP_NAMES.B}").`}
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AnalyticsTabs />

        {loading && !data ? <AdminSkeletonStats /> : null}

        {data && !data.assigned ? (
          <AdminEmpty
            icon={RiFlaskLine}
            title="Groups not assigned yet"
            description={`Pick the 1,000 most active users and split them 500 / 500, balanced by country and activity. Do this before Monday ${fmtDay(data.weeks[0])}.`}
            action={
              <Button onClick={assign} disabled={assigning}>
                {assigning ? "Assigning…" : "Assign groups"}
              </Button>
            }
          />
        ) : null}

        {data?.assigned ? <DigestResultsView data={data} /> : null}
      </div>
    </AdminShell>
  )
}
