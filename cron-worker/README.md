# UP push worker

Cloudflare Worker that (1) wakes the Express backend for the scheduled push jobs and
(2) sends Web Push from a queue, in parallel, with retries.

Live: https://up-push-worker.up-push-worker.workers.dev (`/health`)

## Flow

- **Schedule:** cron `*/5 * * * *` -> if a job is due (UTC table in `src/index.js`) ->
  `POST {EXPRESS_URL}/api/internal/push/run/:job` with `X-Cron-Secret`.
- **Sending:** Express `webPushService` -> `POST /send` (`X-Worker-Secret`) -> Queue `up-push`
  -> consumer sends with VAPID. 404/410 -> `POST /api/internal/push/expired` deletes the device.
- If the Worker is unreachable, Express sends directly as before. No push is lost.

## Cut-over (do all three together, or pushes double-send)

Set on the Cloud Run service:

| Var | Value |
|---|---|
| `CRON_SECRET` | `CRON_SECRET` from `.secrets.local` |
| `PUSH_WORKER_URL` | `https://up-push-worker.up-push-worker.workers.dev` |
| `PUSH_WORKER_SECRET` | `WORKER_SECRET` from `.secrets.local` |
| `PUSH_CRON_MODE` | `external` (turns off the in-process node-cron) |

Deploy the backend revision that contains `src/routes/internalPush.js` first or at the
same time. Until then the Worker's job calls just get 404, which is harmless.

## Worker secrets (already set)

`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (must match the Express pair, or every existing
device stops receiving), `WORKER_SECRET`, `CRON_SECRET`. Rotate with
`npx wrangler secret put <NAME>`.

## Commands

```
npm install
npx wrangler deploy
npx wrangler tail          # live logs
```
