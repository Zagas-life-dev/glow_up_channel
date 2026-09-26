"use client"

/**
 * Local tagger: run AI tagging on this computer, and see how well tagging is
 * going.
 *
 * No model is hosted. After each data update an admin runs the agent
 * (latest-glowup-channel/scripts/local-tagger-agent.js) on a laptop, and this
 * page — opened in a browser on that laptop — talks to it on 127.0.0.1. The
 * "How tagging is going" half comes from the platform API and works anywhere.
 */

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiComputerLine,
  RiFileCopyLine,
  RiPlayLine,
  RiRobot2Line,
  RiStopLine,
  RiTimeLine,
} from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminEmpty, AdminSection, AdminStat, AdminStatGrid, StatusPill } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { fetchTaggingQuality, type TaggingQuality, type TaggingRunRecord } from "@/lib/admin/tagging"
import {
  AGENT_START_COMMAND,
  AgentRefusedError,
  LOCAL_TAGGER_URL,
  fetchAgentStatus,
  fetchRunLog,
  pingAgent,
  startModel,
  startRun,
  stopModel,
  stopRun,
  type AgentStatus,
  type RunEvent,
  type RunMode,
} from "@/lib/admin/local-tagger"
import { labelFor } from "@/lib/taxonomy"

type Connection = "checking" | "offline" | "refused" | "connected"

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  "gemini-backup": "Gemini (backup key)",
  local: "Local model",
}

const MODE_LABEL: Record<RunMode, string> = {
  "gemini-first": "Gemini first",
  "local-only": "Local only",
}

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

function duration(seconds: number | null | undefined): string {
  if (seconds == null) return "—"
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function when(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/* ------------------------------------------------------------------ offline */

function StartAgentHelp({ connection, onRetry }: { connection: Connection; onRetry: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_START_COMMAND)
      toast.success("Command copied")
    } catch {
      toast.error("Could not copy; select the command instead")
    }
  }

  if (connection === "refused") {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium text-foreground">The agent is running but did not accept your sign-in.</p>
        <p className="text-muted-foreground">
          It checks your token against its own <code>JWT_SECRET</code>, then asks the backends listed in{" "}
          <code>LOCAL_AGENT_TRUSTED_BACKENDS</code>. Add this platform&apos;s backend URL there, restart the agent, and
          retry.
        </p>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        No agent is answering at <code>{LOCAL_TAGGER_URL}</code>. Tagging runs on a computer, not on the server. On the
        computer that has the models:
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>
          Open a terminal in the <code>latest-glowup-channel</code> folder.
        </li>
        <li>
          Run:
          <div className="mt-1.5 flex items-center gap-2">
            <code className="rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground">
              {AGENT_START_COMMAND}
            </code>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={copy} aria-label="Copy command">
              <RiFileCopyLine className="h-4 w-4" />
            </Button>
          </div>
        </li>
        <li>Open this page in a browser on that same computer. It connects by itself within a few seconds.</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Chrome may ask to let this site reach devices on your local network. Allow it; that is how the page talks to
        the agent.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ controls */

function ModelPanel({
  status,
  model,
  onModelChange,
  onChanged,
}: {
  status: AgentStatus
  model: string
  onModelChange: (model: string) => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const running = status.run.state === "running"
  const { state, error } = status.server

  const act = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
    } catch (err: any) {
      toast.error(err?.message || "The agent refused")
    } finally {
      setBusy(false)
      onChanged()
    }
  }

  const chosen = status.models.find((m) => m.id === model)

  return (
    <AdminSection
      title="Model"
      description="Runs on this computer's GPU. A run loads the model chosen here by itself."
      actions={<StatusPill status={state} />}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={model} onValueChange={onModelChange} disabled={busy || running}>
            <SelectTrigger className="w-full rounded-xl sm:w-64">
              <SelectValue placeholder="Choose a model" />
            </SelectTrigger>
            <SelectContent>
              {status.models.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={!m.present}>
                  {m.label}
                  {m.isDefault ? " (recommended)" : ""}
                  {m.present ? "" : " — not downloaded"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              className="rounded-xl"
              disabled={busy || running || !model || (state === "ready" && status.server.model === model)}
              onClick={() => act(() => startModel(model), "Model loaded")}
            >
              {busy && state !== "ready" ? "Loading…" : state === "ready" && status.server.model !== model ? "Switch" : "Load"}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={busy || running || state === "stopped"}
              onClick={() => act(stopModel, "Model stopped")}
            >
              Stop
            </Button>
          </div>
        </div>
        {chosen ? (
          <p className="text-xs text-muted-foreground">
            {chosen.note}
            {chosen.sizeGb ? ` · ${chosen.sizeGb} GB` : ""}
          </p>
        ) : null}
        {state === "ready" || state === "loading" ? (
          <p className="text-xs text-muted-foreground">
            {status.models.find((m) => m.id === status.server.model)?.label ?? status.server.model} ·{" "}
            {status.server.gpuLayers > 0 ? "on the GPU" : "on the CPU"} · since {when(status.server.startedAt)}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </AdminSection>
  )
}

function RunPanel({ status, model, onChanged }: { status: AgentStatus; model: string; onChanged: () => void }) {
  const [mode, setMode] = useState<RunMode>("gemini-first")
  const [retryGaveUp, setRetryGaveUp] = useState(true)
  const [stopModelAfter, setStopModelAfter] = useState(true)
  const [busy, setBusy] = useState(false)
  const { run, pending } = status
  const running = run.state === "running"
  const toDo = retryGaveUp ? pending.includingGaveUp : pending.waiting

  const start = async () => {
    setBusy(true)
    try {
      await startRun({ mode, model, retryGaveUp, stopModelAfter })
      toast.success("Run started")
    } catch (err: any) {
      toast.error(err?.message || "Could not start the run")
    } finally {
      setBusy(false)
      onChanged()
    }
  }

  const stop = async () => {
    try {
      await stopRun()
      toast.success("Stopping after the current listing")
    } catch (err: any) {
      toast.error(err?.message || "Could not stop the run")
    } finally {
      onChanged()
    }
  }

  const total = run.total ?? 0
  const done = run.done ?? 0

  return (
    <AdminSection
      title="Run"
      description="Tag every listing the keyword rules left thin. Run it after each data update."
      actions={run.state !== "idle" ? <StatusPill status={run.state} /> : null}
    >
      {running ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{run.phase === "Tagging" ? `${done} of ${total} listings` : run.phase}</span>
              <span className="text-xs text-muted-foreground">
                {run.etaSeconds != null ? `about ${duration(run.etaSeconds)} left` : ""}
              </span>
            </div>
            <Progress value={percent(done, total)} />
          </div>
          <RunNumbers run={run} />
          <Button variant="outline" className="rounded-xl" onClick={stop}>
            <RiStopLine className="mr-1.5 h-4 w-4" aria-hidden />
            Stop after this listing
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as RunMode)} className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
              <RadioGroupItem value="gemini-first" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">Gemini first, then the local model</span>
                <span className="block text-xs text-muted-foreground">
                  Gemini&apos;s free quota tags the first listings; the local model takes over when it runs out.
                  Gemini is paused for the rest of the run once its quota is gone.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
              <RadioGroupItem value="local-only" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">Local model only</span>
                <span className="block text-xs text-muted-foreground">
                  No listing text leaves this computer. Slightly less accurate than Gemini.
                </span>
              </span>
            </label>
          </RadioGroup>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="retry-gave-up" className="text-sm font-normal">
                Also retry listings the AI gave up on
                <span className="block text-xs text-muted-foreground">
                  {pending.includingGaveUp - pending.waiting} used all five attempts
                </span>
              </Label>
              <Switch id="retry-gave-up" checked={retryGaveUp} onCheckedChange={setRetryGaveUp} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="stop-after" className="text-sm font-normal">
                Stop the model when the run finishes
                <span className="block text-xs text-muted-foreground">Frees about 3–5 GB of memory</span>
              </Label>
              <Switch id="stop-after" checked={stopModelAfter} onCheckedChange={setStopModelAfter} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-xl" disabled={busy || toDo === 0 || !model} onClick={start}>
              <RiPlayLine className="mr-1.5 h-4 w-4" aria-hidden />
              {toDo === 0 ? "Nothing to tag" : `Tag ${toDo.toLocaleString()} listings`}
            </Button>
            {run.state !== "idle" && run.finishedAt ? (
              <span className="text-xs text-muted-foreground">
                Last run {run.state} {when(run.finishedAt)} · {run.ok ?? 0} tagged, {run.failed ?? 0} failed
              </span>
            ) : null}
          </div>
          {run.error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {run.error}
            </p>
          ) : null}
        </div>
      )}
    </AdminSection>
  )
}

function RunNumbers({ run }: { run: AgentStatus["run"] }) {
  const ok = run.ok ?? 0
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs text-muted-foreground">Tagged</dt>
        <dd className="font-semibold tabular-nums">{ok}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Failed</dt>
        <dd className="font-semibold tabular-nums">{run.failed ?? 0}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Every required group</dt>
        <dd className="font-semibold tabular-nums">{ok ? `${percent(run.complete ?? 0, ok)}%` : "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Per listing</dt>
        <dd className="font-semibold tabular-nums">{duration(run.avgSeconds)}</dd>
      </div>
      {run.restarts ? (
        <div className="col-span-full text-xs text-amber-700 dark:text-amber-400">
          The GPU reset {run.restarts === 1 ? "once" : `${run.restarts} times`}; the model was restarted
          {run.modelsUsed && run.modelsUsed.length > 1
            ? ` and the run continued on ${run.modelsUsed[run.modelsUsed.length - 1]}`
            : ""}
          .
        </div>
      ) : null}
      {run.byProvider && Object.keys(run.byProvider).length ? (
        <div className="col-span-full text-xs text-muted-foreground">
          {Object.entries(run.byProvider)
            .map(([provider, count]) => `${PROVIDER_LABEL[provider] ?? provider}: ${count}`)
            .join(" · ")}
        </div>
      ) : null}
    </dl>
  )
}

function LiveLog({ events }: { events: RunEvent[] }) {
  if (events.length === 0) {
    return (
      <AdminSection title="Live results">
        <AdminEmpty title="Nothing yet" description="Each listing appears here as the run tags it." />
      </AdminSection>
    )
  }
  return (
    <AdminSection title="Live results" description="Newest first. Only the last 200 are kept.">
      <ul className="divide-y divide-border">
        {[...events].reverse().map((event) => (
          <li key={`${event.at}-${event.contentId}`} className="space-y-1.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium">{event.title || "(untitled)"}</p>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{(event.ms / 1000).toFixed(1)} s</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {event.kind}
              {event.status === "ok" ? ` · ${PROVIDER_LABEL[event.provider ?? ""] ?? event.provider}` : ""}
              {event.missing?.length ? ` · still missing ${event.missing.join(", ")}` : event.status === "ok" ? " · complete" : ""}
            </p>
            {event.status === "ok" && event.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {event.tags.map((id) => (
                  <span key={id} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                    {labelFor(id, "en")}
                  </span>
                ))}
              </div>
            ) : null}
            {event.status !== "ok" ? (
              <p className="line-clamp-2 text-xs text-destructive">{event.error || event.status}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminSection>
  )
}

/* ------------------------------------------------------------------ quality */

function QualityPanel({ quality }: { quality: TaggingQuality | null }) {
  if (!quality) return null
  const aiTotal = Object.values(quality.byProvider).reduce((sum, count) => sum + count, 0)
  const failed = (quality.byStatus.ai_failed ?? 0) + (quality.byStatus.ai_gave_up ?? 0)
  return (
    <div className="space-y-5">
      <AdminStatGrid>
        <AdminStat
          label="Every required group"
          value={`${percent(quality.withAllRequired, quality.total)}%`}
          hint={`${quality.withAllRequired.toLocaleString()} of ${quality.total.toLocaleString()} listings`}
          icon={RiCheckLine}
          emphasis="positive"
        />
        <AdminStat label="Average tags" value={quality.averageTags} hint="Per listing" icon={RiRobot2Line} />
        <AdminStat
          label="Waiting for AI"
          value={(quality.byStatus.needs_ai ?? 0).toLocaleString()}
          icon={RiTimeLine}
          emphasis={(quality.byStatus.needs_ai ?? 0) > 0 ? "attention" : "none"}
        />
        <AdminStat label="AI failed" value={failed.toLocaleString()} hint="Kept their keyword tags" icon={RiComputerLine} />
      </AdminStatGrid>

      <AdminSection title="Who tagged what" description="The AI that last tagged each listing. The rest kept their keyword tags.">
        {aiTotal === 0 ? (
          <AdminEmpty title="No AI tags yet" />
        ) : (
          <div className="space-y-2.5">
            {Object.entries(quality.byProvider)
              .sort((a, b) => b[1] - a[1])
              .map(([provider, count]) => (
                <div key={provider} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{PROVIDER_LABEL[provider] ?? provider}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {count.toLocaleString()} · {percent(count, quality.total)}%
                    </span>
                  </div>
                  <Progress value={percent(count, quality.total)} className="h-1.5" />
                </div>
              ))}
            <div className="flex justify-between pt-1 text-sm text-muted-foreground">
              <span>Keyword rules only</span>
              <span className="tabular-nums">{(quality.total - aiTotal).toLocaleString()}</span>
            </div>
          </div>
        )}
      </AdminSection>

      <RecentRuns runs={quality.recentRuns} />
    </div>
  )
}

function RecentRuns({ runs }: { runs: TaggingRunRecord[] }) {
  return (
    <AdminSection title="Recent runs" description="Every run of the local tagger, from any computer.">
      {runs.length === 0 ? (
        <AdminEmpty title="No runs yet" />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium sm:px-0">Started</th>
                <th className="px-2 py-2 font-medium">Mode</th>
                <th className="px-2 py-2 font-medium">Model</th>
                <th className="px-2 py-2 text-right font-medium">Tagged</th>
                <th className="px-2 py-2 text-right font-medium">Failed</th>
                <th className="px-2 py-2 text-right font-medium">Complete</th>
                <th className="px-2 py-2 text-right font-medium">Per listing</th>
                <th className="px-4 py-2 text-right font-medium sm:px-0">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="whitespace-nowrap px-4 py-2 sm:px-0">{when(run.startedAt)}</td>
                  <td className="px-2 py-2">{MODE_LABEL[run.mode] ?? run.mode}</td>
                  <td className="px-2 py-2">
                    {(run.modelsUsed ?? [run.model]).join(" → ")}
                    {run.restarts ? <span className="text-xs text-muted-foreground"> · {run.restarts} restarts</span> : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {run.ok ?? 0}/{run.total ?? 0}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{run.failed ?? 0}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{run.ok ? `${percent(run.complete ?? 0, run.ok)}%` : "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{duration(run.avgSeconds)}</td>
                  <td className="px-4 py-2 text-right sm:px-0">
                    <StatusPill status={run.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  )
}

/* ------------------------------------------------------------------ page */

export default function LocalTaggerPage() {
  const [connection, setConnection] = useState<Connection>("checking")
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [events, setEvents] = useState<RunEvent[]>([])
  const [quality, setQuality] = useState<TaggingQuality | null>(null)
  const [loadingQuality, setLoadingQuality] = useState(true)
  const [model, setModel] = useState("")
  const lastEventAt = useRef<string | undefined>(undefined)
  const wasRunning = useRef(false)

  const loadQuality = useCallback(async () => {
    setLoadingQuality(true)
    try {
      setQuality(await fetchTaggingQuality())
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tagging quality")
    } finally {
      setLoadingQuality(false)
    }
  }, [])

  const poll = useCallback(async () => {
    if (!(await pingAgent())) {
      setConnection("offline")
      setStatus(null)
      return
    }
    try {
      const next = await fetchAgentStatus()
      setStatus(next)
      setConnection("connected")
      const fresh = await fetchRunLog(lastEventAt.current)
      if (fresh.length) {
        lastEventAt.current = fresh[fresh.length - 1].at
        setEvents((previous) => [...previous, ...fresh].slice(-200))
      }
      // A run just ended: the platform-wide numbers have moved.
      const running = next.run.state === "running"
      if (wasRunning.current && !running) loadQuality()
      wasRunning.current = running
    } catch (error) {
      setConnection(error instanceof AgentRefusedError ? "refused" : "offline")
    }
  }, [loadQuality])

  useEffect(() => {
    loadQuality()
  }, [loadQuality])

  // Poll fast while something is happening, slowly otherwise.
  const busy = status?.run.state === "running" || status?.server.state === "loading"
  useEffect(() => {
    poll()
    const timer = setInterval(poll, busy ? 2000 : 5000)
    return () => clearInterval(timer)
  }, [poll, busy])

  // Start from the loaded model, else the recommended one; after that it is the admin's choice.
  useEffect(() => {
    if (model || !status) return
    const present = status.models.filter((m) => m.present)
    setModel(status.server.model || present.find((m) => m.isDefault)?.id || present[0]?.id || "")
  }, [model, status])

  return (
    <AdminShell
      title="Local tagger"
      description="Run AI tagging on this computer after each data update, and see how well tagging is going."
      onRefresh={() => {
        poll()
        loadQuality()
      }}
      refreshing={loadingQuality}
      width="wide"
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href="/dashboard/admin/tagging">
            <RiArrowLeftLine className="mr-1.5 h-4 w-4" aria-hidden />
            Tagging
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <AdminSection
          title="This computer"
          description={connection === "connected" ? `Agent connected at ${LOCAL_TAGGER_URL}` : undefined}
          actions={
            <StatusPill status={connection === "refused" ? "refused" : connection} />
          }
        >
          {connection === "connected" && status ? (
            <p className="text-sm text-muted-foreground">
              {status.pending.waiting.toLocaleString()} listings waiting for the AI
              {status.pending.includingGaveUp > status.pending.waiting
                ? `, plus ${(status.pending.includingGaveUp - status.pending.waiting).toLocaleString()} it gave up on`
                : ""}
              .
            </p>
          ) : connection === "checking" ? (
            <p className="text-sm text-muted-foreground">Looking for the agent…</p>
          ) : (
            <StartAgentHelp connection={connection} onRetry={poll} />
          )}
        </AdminSection>

        {connection === "connected" && status ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ModelPanel status={status} model={model} onModelChange={setModel} onChanged={poll} />
            <RunPanel status={status} model={model} onChanged={poll} />
          </div>
        ) : null}

        {connection === "connected" ? <LiveLog events={events} /> : null}

        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-foreground">How tagging is going</h2>
          <QualityPanel quality={quality} />
        </div>
      </div>
    </AdminShell>
  )
}
