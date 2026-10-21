import { buildPushPayload } from "@block65/webcrypto-web-push"
import { dueJobs } from "./schedule.js"

/**
 * UP push worker.
 *
 *   scheduled  wakes Express for the notification jobs (times in src/schedule.js, UTC).
 *   POST /send Express hands over { messages: [{ subscription, payload }] }; they
 *              are queued so a send is parallel and retried, not a serial loop.
 *   queue      sends each Web Push with VAPID; a 404/410 tells Express to drop
 *              that device.
 */

const MAX_BATCH = 100 // Queue sendBatch limit

async function callExpress(env, path, body) {
  return fetch(`${env.EXPRESS_URL.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Cron-Secret": env.CRON_SECRET },
    body: JSON.stringify(body ?? {}),
  })
}

async function runJob(env, job) {
  // Cold start on Cloud Run can take a while; one retry covers a slow first hit.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await callExpress(env, `/api/internal/push/run/${job}`)
      console.log(`job ${job} attempt ${attempt}: ${res.status}`)
      if (res.ok) return
    } catch (e) {
      console.warn(`job ${job} attempt ${attempt} failed: ${e.message}`)
    }
  }
}

async function sendOne(env, msg) {
  const { subscription, payload } = msg
  const built = await buildPushPayload(
    {
      data: JSON.stringify({
        title: payload.title || "UP",
        body: payload.body ?? "",
        url: payload.url || "/",
        tag: payload.tag || "glowup-push",
      }),
      options: { ttl: 86400, urgency: "high" },
    },
    subscription,
    { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
  )
  return fetch(subscription.endpoint, built)
}

export default {
  async scheduled(event, env, ctx) {
    const jobs = dueJobs(new Date(event.scheduledTime))
    if (jobs.length) ctx.waitUntil(Promise.all(jobs.map((j) => runJob(env, j))))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === "/health") return Response.json({ ok: true })

    if (url.pathname === "/send" && request.method === "POST") {
      if (!env.WORKER_SECRET || request.headers.get("X-Worker-Secret") !== env.WORKER_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
      let body
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 })
      }
      const messages = (body?.messages || []).filter(
        (m) => m?.subscription?.endpoint && m.subscription.keys?.p256dh && m.subscription.keys?.auth && m.payload
      )
      for (let i = 0; i < messages.length; i += MAX_BATCH) {
        await env.PUSH_QUEUE.sendBatch(messages.slice(i, i + MAX_BATCH).map((body) => ({ body })))
      }
      return Response.json({ queued: messages.length })
    }

    return new Response("Not found", { status: 404 })
  },

  async queue(batch, env) {
    await Promise.all(
      batch.messages.map(async (message) => {
        const endpoint = message.body.subscription.endpoint
        try {
          const res = await sendOne(env, message.body)
          if (res.status === 404 || res.status === 410) {
            await callExpress(env, "/api/internal/push/expired", { endpoint }).catch(() => {})
            return message.ack()
          }
          if (res.status === 429 || res.status >= 500) {
            // Back off: 30s, 60s, 90s ... capped by max_retries.
            return message.retry({ delaySeconds: 30 * message.attempts })
          }
          if (!res.ok) {
            // 400/401/403/413: VAPID or payload problem. Retrying cannot fix it.
            console.warn(`push rejected ${res.status} for ${endpoint.slice(0, 60)}…: ${(await res.text()).slice(0, 200)}`)
          }
          message.ack()
        } catch (e) {
          console.warn(`push send threw: ${e.message}`)
          message.retry({ delaySeconds: 30 * message.attempts })
        }
      })
    )
  },
}
