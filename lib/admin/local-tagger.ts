/**
 * The local tagging agent, reached from the admin's own browser.
 *
 * Tagging runs weekly on a laptop, not on a server: the agent
 * (latest-glowup-channel/scripts/local-tagger-agent.js) listens on
 * 127.0.0.1:8094 there. This page's requests go straight from the browser to
 * that port, so it only connects on the machine running the agent. Chrome may
 * ask once to allow the site to reach devices on the local network.
 *
 * The agent checks the same admin token the platform API uses.
 */

import ApiClient from "@/lib/api-client"
import type { ListingKind } from "@/lib/admin/tagging"

export const LOCAL_TAGGER_URL = process.env.NEXT_PUBLIC_LOCAL_TAGGER_URL || "http://127.0.0.1:8094"

export const AGENT_START_COMMAND = "node scripts/local-tagger-agent.js"

export type RunMode = "gemini-first" | "local-only"
export type ServerState = "stopped" | "loading" | "ready" | "crashed"
export type RunState = "idle" | "running" | "done" | "stopped" | "failed"

export interface LocalModel {
  id: string
  label: string
  note: string
  present: boolean
  sizeGb: number | null
  isDefault: boolean
}

export interface LocalRun {
  state: RunState
  id?: string
  mode?: RunMode
  model?: string
  retryGaveUp?: boolean
  startedAt?: string
  finishedAt?: string | null
  phase?: string | null
  total?: number
  done?: number
  ok?: number
  failed?: number
  complete?: number
  byProvider?: Record<string, number>
  error?: string | null
  /** Times the model was restarted after a GPU reset this run. */
  restarts?: number
  modelsUsed?: string[]
  avgSeconds?: number | null
  etaSeconds?: number | null
}

export interface AgentStatus {
  agent: { version: number; trustedBackends: string[] }
  server: {
    state: ServerState
    model: string | null
    url: string
    pid: number | null
    startedAt: string | null
    error: string | null
    gpuLayers: number
  }
  run: LocalRun
  models: LocalModel[]
  pending: { waiting: number; includingGaveUp: number }
}

export interface RunEvent {
  at: string
  kind: ListingKind
  contentId: string
  title: string
  status: "ok" | "failed" | "missing"
  provider?: string
  tags?: string[]
  missing?: string[]
  error?: string
  ms: number
}

type Envelope<T> = { success: boolean; message?: string; data?: T }

/** A reachable agent, as opposed to one that answered but refused us. */
export class AgentRefusedError extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await ApiClient.makeAuthenticatedRequest(`${LOCAL_TAGGER_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15000),
  })
  const json = (await response.json().catch(() => null)) as Envelope<T> | null
  if (response.status === 401 || response.status === 403) {
    throw new AgentRefusedError(json?.message || "The agent did not accept your sign-in")
  }
  if (!response.ok || !json?.success) throw new Error(json?.message || `Agent error ${response.status}`)
  return json.data as T
}

/** Is an agent listening? Never throws; no token needed. */
export async function pingAgent(): Promise<boolean> {
  try {
    const response = await fetch(`${LOCAL_TAGGER_URL}/health`, { signal: AbortSignal.timeout(2500) })
    const json = await response.json()
    return json?.agent === "up-local-tagger"
  } catch {
    return false
  }
}

export const fetchAgentStatus = () => call<AgentStatus>("/status")

export async function fetchRunLog(after?: string): Promise<RunEvent[]> {
  const data = await call<{ events: RunEvent[] }>(after ? `/log?after=${encodeURIComponent(after)}` : "/log")
  return data.events
}

export const startModel = (model: string) =>
  call("/server/start", { method: "POST", body: JSON.stringify({ model }), signal: AbortSignal.timeout(200000) })

export const stopModel = () => call("/server/stop", { method: "POST" })

export const startRun = (options: {
  mode: RunMode
  model: string
  retryGaveUp: boolean
  limit?: number
  stopModelAfter: boolean
}) => call<LocalRun>("/run", { method: "POST", body: JSON.stringify(options) })

export const stopRun = () => call<LocalRun>("/run/stop", { method: "POST" })
