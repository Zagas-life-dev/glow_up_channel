# Push notifications: plan to take advantage

## Current state

- **Frontend**
  - **VAPID**: `GET /api/push/vapid-public-key` returns public key (env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
  - **Subscribe**: `POST /api/push/subscribe` with `Authorization: Bearer <token>` and body `{ subscription: PushSubscriptionJSON }`. Forwards to backend `POST /api/users/me/push-subscription` if `NEXT_PUBLIC_BACKEND_URL` is set.
  - **Unsubscribe**: `POST /api/push/unsubscribe` (no body); forwards to backend `DELETE /api/users/me/push-subscription`.
  - **Hook**: `hooks/use-push-notifications.ts` — register `/sw.js`, request permission, subscribe with VAPID key, POST subscription to Next.js API (which forwards to backend). Exposes `subscribe`, `unsubscribe`, `isSubscribed`, `permission`, `isSupported`, `error`.
  - **UI**: Profile → Settings → Notifications tab: Email toggle + Push toggle (calls `push.subscribe()` / `push.unsubscribe()`).
  - **Service worker**: `public/sw.js` — on `push` event parses JSON `{ title, body, url?, tag? }`, shows notification with icon/badge; on `notificationclick` focuses existing client or opens `url` (origin-relative).

- **Backend (expected)**
  - Store subscription: `POST /api/users/me/push-subscription` with `{ subscription }` (and optionally associate with user from `Authorization`).
  - Remove subscription: `DELETE /api/users/me/push-subscription`.
  - **Not yet in this repo**: No code that actually **sends** push notifications (web-push with VAPID private key). Backend must implement sending when relevant events occur.

- **Gaps**
  1. Backend may not persist subscriptions or may not have a “send push” path.
  2. No defined **triggers** (when to send).
  3. No **user preferences** (e.g. “remind me for saved opportunities” vs “only events”).
  4. Push is only enabled from Settings; no **contextual prompts** (e.g. after saving an opportunity or installing PWA).
  5. No **in-app notification center** (optional; can be a later phase).

---

## Goal

Use push notifications to:

- Re-engage users with timely, relevant updates.
- Increase return visits (events, deadlines, new content).
- Support Locked In and other habits (reminders, streaks).
- Keep users informed without relying only on email.

---

## 1. Backend: subscription storage and sending

### 1.1 Persist subscriptions

- **Endpoint**: `POST /api/users/me/push-subscription`  
  - Body: `{ subscription: PushSubscriptionJSON }`.  
  - Identify user from JWT; store subscription (e.g. in a `PushSubscription` or `UserPushSubscription` collection/keyed by user + endpoint so you can upsert).
- **Endpoint**: `DELETE /api/users/me/push-subscription`  
  - Remove subscription(s) for the authenticated user (by endpoint or all for user).
- **Model**: Store at least `endpoint`, `keys` (p256dh, auth), `user`/userId, and optionally `userAgent`, `createdAt` so you can invalidate old ones.

### 1.2 Send a push (web-push)

- Use **web-push** (e.g. `web-push` npm) with:
  - **VAPID**: private key from env (e.g. `VAPID_PRIVATE_KEY`); same key pair as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the frontend.
- **Payload format** (must match what `sw.js` expects):
  ```json
  {
    "title": "GlowUp",
    "body": "Short message text",
    "url": "/opportunities/123",
    "tag": "opportunity-123"
  }
  ```
- **Helper**: e.g. `sendPushToUser(userId, { title, body, url, tag })` that:
  - Loads all subscriptions for that user.
  - Sends the same payload to each (or dedupe by endpoint).
  - Catches 410/404 and removes that subscription from DB.
- **Rate / batching**: Avoid sending many pushes in a tight loop; optionally batch or throttle per user.

### 1.3 Optional: notification preferences

- Add user preferences (e.g. on User or UserProfile):  
  `pushOpportunities`, `pushEvents`, `pushJobs`, `pushResources`, `pushLockedInReminders`, `pushChannelPosts`, `pushConnectionPosts` (when someone you're connected with posts to community), `pushFunReminders` (goals/motivational), etc. (booleans or “none”/“high”/“all”).
- When triggering a notification, check the corresponding preference before calling `sendPushToUser`.

---

## 2. When to send (trigger events)

Choose a first set of triggers that add clear value; then expand.

| Trigger | Description | Payload example |
|--------|-------------|------------------|
| **Saved opportunity deadline** | X days (e.g. 1 or 3) before application deadline for an opportunity the user saved. | “Application closes in 1 day: [title]” → `/opportunities/[id]` |
| **Saved event starting** | Remind when a saved event is soon (e.g. 1 day before). | “Event tomorrow: [title]” → `/events/[id]` |
| **New match / recommendation** | New opportunity/event/job/resource that scores highly for the user (e.g. daily or on publish). | “New for you: [title]” → content URL |
| **Locked In** | Reminder to start a session or “You haven’t locked in today” (if no session yet). | “Time to lock in?” → `/locked-in` |
| **Channel activity** | New post in a channel the user joined. | “[Channel]: new post” → `/channels/[slug]` |
| **Application / registration update** | Status change on application or event registration. | “Your application was viewed” / “You’re registered for [event]” → relevant page |
| **Job deadline** | For saved or applied jobs, deadline approaching. | “Apply by tomorrow: [title]” → `/jobs/[id]` |

Implementation on the backend:

- **Scheduled jobs** (e.g. cron): daily (or twice daily) job that:
  - Finds saved opportunities/events/jobs with deadlines in the next 1–3 days.
  - For each user who saved the item and has push enabled (and preference for that type), call `sendPushToUser(userId, { title, body, url, tag })`.
- **Event-driven**: When a new opportunity/event/job/resource is created (or goes live), optionally notify users who match (e.g. by interests/location); respect “new match” preference and frequency (e.g. at most one “new for you” per day).
- **Locked In**: Cron that checks “users who have used Locked In before but have no session today” and sends one reminder per day if preference on.
- **Channels**: On new channel post, notify channel members who have “channel posts” push enabled.

### 2.2 Connections and community

- **Connection posted**: When someone the user is **connected with** (e.g. followed, or in their network) makes a **post to the community**, notify the user. Payload e.g. "[Name] just posted in Community" → `/community` or post deep link. Backend: when a community post is created, resolve the author's connections/followers; for each connected user who has "connection posts" preference on, send one push.
- **Channel activity**: New post in **any channel the user is in** (member). Payload e.g. "[Channel name]: new post" → `/channels/[slug]`. On new channel post, notify all channel members who have "channel posts" push enabled.

### 2.3 Fun and motivational (lightweight re-engagement)

- **Goals / motivational**: Occasional fun, encouraging messages (e.g. once per day or a few times per week). Rotate copy. Examples: "You've got goals to achieve — small step today?" → `/` or `/locked-in`; "Your future self will thank you"; "Time to glow up?"; "Lock in for 25 — you've got this."
- **Streak / progress**: After they complete a Locked In session or hit a small milestone. E.g. "You showed up today — keep going." → `/locked-in/history`.
- **General reminder**: Gentle nudge if they haven't visited in 2–3 days (and have push on). E.g. "Your next opportunity might be a tap away." → `/`.

**Implementation for fun/motivational:** Add preference e.g. `pushFunReminders` or `pushMotivational` (opt-in). Cap at most one "fun" push per day (or 3–5 per week). Use a small rotating list; track per-user "last fun push" so you don't send more than 1/day.

### 2.4 Three-day reminders

- Send **3-day** reminders in addition to 1-day for saved opportunities, events, and jobs (e.g. "Application closes in 3 days: [title]", "Event in 3 days: [title]"). Same cron job; include items due in 1 day and in 3 days, with different copy/tags.

---

## 3. Frontend improvements

### 3.1 Keep existing flow

- Settings → Notifications → Push toggle remains the main place to enable/disable; it already calls the hook and backend (via Next.js proxy).

### 3.2 Optional: contextual prompt

- After a high-intent action (e.g. user saves an opportunity or adds event to calendar), show a small inline or modal prompt: “Get deadline reminders on this device? Enable push in Settings.”
- Or after PWA install (if you detect install), one-time prompt: “Turn on notifications to get reminders and new opportunities?”
- Reuse `usePushNotifications`; only suggest, don’t auto-subscribe.

### 3.3 Optional: granular preferences

- In Settings → Notifications, add toggles per category (e.g. “Saved opportunities & events”, “New recommendations”, “Locked In reminders”, “Channel posts”). Persist via existing profile/preferences API; backend uses these when deciding whether to send each trigger type.

### 3.4 Optional: in-app notification center

- Add route `/notifications` that lists recent in-app events (e.g. “Application viewed”, “New post in [channel]”). Can be backed by the same events that trigger push, or a separate activity feed. Push payloads can still open deep links (e.g. `/opportunities/123`) without requiring this page.

---

## 4. Service worker and payload

- **Already in place**: `sw.js` expects JSON with `title`, `body`, `url`, and optional `tag`.
- **Backend**: Always send this shape; use `tag` to avoid duplicate toasts for the same event (e.g. same opportunity id).
- **URLs**: Use paths relative to origin (e.g. `/opportunities/123`, `/locked-in`). SW uses `self.location.origin + url` when opening.

---

## 5. Implementation phases

### Phase 1 – Backend foundation (no frontend change)

1. Implement or verify `POST/DELETE /api/users/me/push-subscription` (store/remove subscription per user).
2. Add web-push send helper using VAPID private key; implement `sendPushToUser(userId, payload)`.
3. Add one simple trigger (e.g. “Saved opportunity deadline in 1 day”) and a daily cron that finds such items and sends one push per user per opportunity (respecting push-enabled and optional preference).

### Phase 2 – More triggers and preferences

1. Add Locked In daily reminder (optional preference).
2. Add “saved event starting soon” and “job deadline soon”.
3. Add user preferences for push categories; backend checks them before sending.
4. Add 3-day reminders for saved opportunities, events, jobs (in addition to 1-day).
5. Connection posts: when a user posts to community, notify their connections (preference: "When connections post").
6. Channel posts: when there's a new post in any channel the user is in, notify (preference: "Channel posts").
7. (Optional) New-content or “new for you” digest (e.g. once per day).

### Phase 3 – Fun and motivational

1. Add pushFunReminders preference; backend job that sends at most one fun/motivational message per day per user (rotating copy).
2. Optional streak/progress push after Locked In session complete.
3. Optional "haven't visited in 2–3 days" gentle reminder.

### Phase 4 – Frontend polish

1. Add granular push toggles in Settings → Notifications (including "When connections post", "Fun reminders & goals") and persist via API.
2. Optional contextual prompt after save or PWA install.
3. Optional `/notifications` page for history.

### Phase 5 – Advanced

1. Channel post notifications for members.
2. Application/registration status updates.
3. A/B test copy and timing for reminders.

---

## 6. Checklist (backend)

- [ ] Store push subscription per user (POST/DELETE).
- [ ] Env: `VAPID_PRIVATE_KEY` (and optionally public in backend for validation).
- [ ] `web-push` (or equivalent) send with payload `{ title, body, url, tag }`.
- [ ] Remove subscription on 410/404 from push service.
- [ ] Cron or job: “saved opportunity/event/job deadline soon” → send push.
- [ ] (Optional) User preferences for push types; check before send.
- [ ] (Optional) Locked In reminder job; channel post notification; connection-post notification; 3-day deadline reminders; fun/motivational reminders (with preference and 1/day cap).

---

## 7. Checklist (frontend)

- [ ] No change required for basic flow (Settings already subscribes and forwards to backend).
- [ ] (Optional) Prompt after save/PWA install to enable push.
- [ ] (Optional) Per-category toggles in Settings and API for preferences.
- [ ] (Optional) `/notifications` page.

---

## Summary

You already have subscription flow, SW, and Settings UI. To take real advantage of push:

1. **Backend**: Persist subscriptions and implement sending with web-push; add at least one trigger (e.g. saved-opportunity deadline).
2. **Triggers**: Add more over time (events, Locked In, channels, applications, **3-day reminders**, **when connections post to community**, **fun/motivational** reminders).
3. **Preferences**: Store and respect per-user, per-type preferences.
4. **Frontend**: Optional prompts and granular toggles; optional notification center.

This plan keeps the existing frontend and SW as-is and focuses new work on backend sending logic and trigger design, then enriches with preferences and UX as needed.
