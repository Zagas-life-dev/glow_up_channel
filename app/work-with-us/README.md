# Work with us

The public flow at `/work-with-us` where people submit listings, buy promotion, or
go read about partnership. No account needed. Everything it uses lives in this folder.

Two documents govern this folder:

- **Official Pricing & Services Guide §2–7** — every price. `config.ts` is where
  it is written down in code.
- **Low-Ticket Self-Serve Sales Pipeline** + **Flow & Customer Communications** —
  every customer-facing word. `copy.ts` holds the site language, `admin/mail.ts`
  holds the email templates.

> **The Partner branch is currently hidden.** `PARTNER_PROGRAMME_ENABLED` in
> `lib/feature-flags.ts` is `false`, so the choice, the welcome bullet and the
> "Listing a lot?" footer link do not render, and `/founder-batch` 404s. The code
> below is unchanged and comes straight back when the flag flips — that file lists
> every gate. Nothing else in this folder is affected.

## The flow

```
Landing (hero, proof, why UP, how it works)
     │
     ▼
What are you trying to achieve?
              ├─ Submit  →  pick a type  →  (paid: 7-day or 30-day)   ─┐
              │              (resource: pick terms)  →  form           │
              │              (jobs and paid events: one form per       │
              │               listing, added on the same screen)       │
              ├─ Promote →  pick a bundle, or build your own  →  form ─┤
              └─ Partner →  pitch  →  /founder-batch  [hidden by flag] │
                                                                       ▼
                                                Check it over (cost breakdown)
                                                                       │
                                      free ─────────┬──────── paid ────┘
                                                    ▼                  ▼
                                                  Done          Paystack → back here → Done
```

## Files

| File | What it does |
| --- | --- |
| `config.ts` | **Prices, items, bundles, contact details, form fields.** Change things here, nowhere else. |
| `copy.ts` | **Every customer-facing line** — hero, selector, review terms, success page, status wording. |
| `admin/mail.ts` | The email templates the review queue opens in Gmail. |
| `page.tsx` | Moves between screens, handles the trip back from Paystack. |
| `submit-track.tsx` / `promote-track.tsx` / `partner-track.tsx` | The three branches. |
| `ui.tsx` | The shared bits — step wrapper, choice card, form fields. |
| `admin/review-queue.tsx` | The review screen, mounted at `/dashboard/admin/work-with-us`. |
| `lookup.ts` | Searches the four public list APIs, for pointing a promotion at something live. **Not wired up yet** — nothing imports it, so a promotion never records what it runs against. See "Promotion targets" below. |
| `api/submissions` | Saves an order and its items, and starts the payment if there is one. |
| `api/verify` | Confirms a payment when the person lands back on the site. |
| `api/webhook` | Confirms a payment when they don't. Optional. |
| `api/admin/items` | The review queue's list and its approve / clarify / reject / deliver action. |
| `server/api.ts` | The client for the order book. Every read and write of an order or an item goes through here. |
| `server/*` | Paystack, emails, publishing, and the request validation. |

## Where the data lives

**Not here.** The two collections belong to the backend, at
`latest-glowup-channel/src/routes/workWithUs.js` and the service under it. This
app holds no database credentials and opens no database connection; it calls
`/api/work-with-us` and proves it is us with `WORK_WITH_US_SERVICE_KEY`.

It did not start that way. The sales page and the review queue used to open
their own MongoDB client against the same cluster, which meant this host needed
`MONGODB_URI` — and the day it did not have one, the queue answered every
reviewer with "Could not read the submissions database" while the submissions
themselves sat there, intact and unreadable. A second host with database
credentials is a second host that can lose them.

What stayed on this side is what the storefront owns: the price list, the form
fields, the order maths, the Paystack conversation and the two automatic emails.
What moved is the order book — what exists, what state it is in, which
transitions are legal, and what a rejection does to the rest of the order.

Approving still publishes through the platform's ordinary create endpoints
(`/api/opportunities` and friends) with the reviewing admin's own token, so a
listing published from the queue goes through exactly the same path as one
posted by hand. The queue is told the outcome afterwards.

| Call | What it does |
| --- | --- |
| `POST /api/work-with-us/orders` | Stores a submission. Mints the reference; derives the status from the amount. |
| `GET /api/work-with-us/orders/:ref` | One order. |
| `POST /api/work-with-us/orders/:ref/paid` | Records a payment Paystack has confirmed, and releases the items. Safe to call twice. |
| `GET /api/work-with-us/audience` | The audience figure for the trust strip. |
| `GET /api/work-with-us/items` | The review queue, with counts. Admin token required. |
| `GET /api/work-with-us/items/:ref` | One item, plus whether it can be approved and what a promotion would run against. |
| `POST /api/work-with-us/items/:ref/review` | Records a decision. Attributed to the admin whose token the call carries. |

## Orders and items

Two MongoDB collections, owned by the backend. An **order** is one payment; an
**item** is one thing we owe the customer for it. They are split because their
lifecycles differ — an order is paid once and never changes, while a
five-listing batch is five separate review decisions.

```js
// work_with_us_orders
{
  ref: "GU-7K4M2X",          // also the Paystack transaction reference
  kind: "job",               // free-opportunity | free-event | job | paid-event | resource | promotion
  quantity: 5,               // how many listings were paid for
  duration: "standard",      // standard (7 days) | extended (30 days)
  bundleId: null,            // bundle-boost | bundle-distribute | bundle-campaign
  promotions: [{ id, quantity }],
  revenueShare: 20,          // resources only
  contact: { name, email, phone, organisation },
  order:   { lines, total },
  amountNg: 20000,
  status: "paid",            // awaiting_payment | paid | pending_review
  payment: { reference, channel, paidAt, amountNg },
}

// work_with_us_items — one per listing, or one for a promotion
{
  ref: "GU-7K4M2X-2",        // the order's ref plus a position
  orderRef: "GU-7K4M2X",
  itemType: "listing",       // listing | promotion
  contentType: "job",        // opportunity | event | job | resource; null on promotions
  fields: { ... },           // the filled-in form for this one item
  promotions: [{ id, label, quantity, price }],   // promotions only, priced at purchase time
  target: { title, contentId, listingRef },       // promotions only — what it runs against
  status: "pending_review",  // awaiting_payment | pending_review | needs_clarification
                             // | published | running | delivered | rejected
  publishedId: "…",          // set once an admin approves and it goes live
}
```

Nothing publishes itself. Items sit in `awaiting_payment` until the payment
confirms, then move to `pending_review` and wait for an admin. Payment is the
commercial conversion; QA is the acceptance gate — paying does not buy
publication, and the review copy on the page says so before anyone pays.

> **Note on existing data.** These two collections replaced a single
> `work_with_us_submissions` collection. Rows written before the split are not
> read by the new review queue — if there are any that still matter, they need a
> one-off migration into `work_with_us_orders` + `work_with_us_items`.

## Email: two channels, on purpose

**Unattended mail goes through SES.** Two messages, both fired by the server
because no human is present when they need to send:

- the customer's **order copy** — the order ID, the price breakdown and every
  field they submitted, sent straight back to them
- the **team notification** for a new or newly paid order

**Everything a person decides to say goes through Gmail.** Approval, a request
for a correction, a rejection, a delivery confirmation — these are a conversation,
not a notification, and the reply needs to land in a real inbox. So the review
queue does not send them. It opens Gmail with the right template already filled
in from `admin/mail.ts`, and whoever is reviewing edits the bracketed detail and
sends it from the normal account.

That is why there is no `notifyPublished` or `notifyRejected` in `server/notify.ts`.
If you add an automated email there, check first that a human is not already
sending the same thing from the queue.

Two wording rules the templates encode, from the comms doc §27 — keep them:

- Never write "your submission has an issue". Name the exact field, link or date.
- Never call an opportunity a scam. The approved wording is "unable to verify".

## Reviewing an order

`/dashboard/admin/work-with-us`. Each card carries the order ID, the customer's
details, everything they submitted, and what the customer is currently being told
about the state it is in. Four actions:

| Action | What it does |
| --- | --- |
| Approve | Publishes the listing, or starts the promotion. |
| Needs clarification | Records exactly what is missing and parks the order as open. |
| Reject | Records a policy reason; flags any promotion that was waiting on it. |
| Mark delivered | Closes out a running promotion. |

None of them email anybody — use **Email them** on the same card.

## Changing prices

All in `config.ts`:

- `LISTING_TIERS` — standard is ₦5,000 for 7 days, extended ₦15,000 for 30 days.
- `LISTING_BULK` — 5 or more standard listings drop to ₦4,000 each, so five come
  to the guide's ₦20,000 and seven to ₦28,000. Extended listings have no pack rate.
- `PROMOTION_ITEMS` — the à-la-carte menu. Prices add up as items are picked, and
  `runDays` is what a platform boost grants once an admin approves it.
- `BUNDLES` — BOOST ₦40,000, DISTRIBUTE ₦100,000, CAMPAIGN ₦250,000. Fixed price;
  `contents` is only ever displayed, never added up. A bundle and à-la-carte items
  are mutually exclusive, so the same work is never charged twice.
- `REVENUE_SHARE_OPTIONS` — 20% / 30% self-serve, and the 50/50 co-created split,
  which is `contactOnly` because it needs a written deal. `RESOURCE_TERMS` carries
  the 25% volume rate and the settlement rule.
- `PARTNER` — the founding partner price and where the button goes.

The server recomputes every total from this file before charging, so a price can't
be faked from the browser.

## Setup

Needs these in `.env`:

```
NEXT_PUBLIC_BACKEND_URL=      # the order book, and where the queue publishes
WORK_WITH_US_SERVICE_KEY=     # shared secret; must match the backend's exactly
PAYSTACK_SECRET_KEY=
SES_SENDER_EMAIL=             # already set — used for the notification emails
SES_CONTACT_RECIPIENT_EMAIL=
```

And in `latest-glowup-channel/.env`, the same secret:

```
WORK_WITH_US_SERVICE_KEY=     # byte-identical to the one above
```

Generate it once with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and
put the same string in both. `/api/work-with-us` fails closed — with the
variable missing on the backend, every call to it is refused with a 503 that
says which variable is missing, rather than the route standing open.

No `MONGODB_URI`. If you find yourself wanting one, the thing you want is an
endpoint on the backend.

Optional: add `https://your-domain.com/work-with-us/api/webhook` as a webhook in the
Paystack dashboard. Without it, an order only gets marked paid when the person makes it
back to the site after paying.

Approving a promotion that includes platform placement calls
`POST /api/promotions/admin-grant` on the backend — see `server/publish.ts`. That
route does not exist yet; until it does, those promotions have to be started by
hand. Promotions that are only community or social work do not need it.

## Promotion targets — a known gap

A promotion has to point at something before it can run: the backend's
`/api/promotions/admin-grant` needs both a `contentId` and the `contentType`
that says which collection to find it in.

Right now **nothing ever records that target**. `buildItems` writes
`target: { title, contentId: null, listingRef: null }` for every promotion, and
`parsePayload` does not carry a target through from the browser, so both stay
null. `lookup.ts` exists to let a customer pick something live, but nothing
imports it.

The effect: approving any promotion that bought platform placement — the
`boost-7`, `boost-14` and `feature-30` items, and all three bundles, which is
everything with `runDays` — fails, because there is nothing to run it against.
The reviewer is told so and can start it by hand, but the queue cannot do it.

Closing this needs a decision on where the target comes from:

- **At purchase.** Wire `lookup.ts` into `promote-track.tsx`, carry the chosen
  `contentId` and `contentType` through `parsePayload` into `buildItems`. The
  customer says what they are promoting; matches how the flow reads today.
- **At review.** Let the reviewer search and attach a target from the queue
  before approving. Smaller change, no payment-path risk, and fits the fact
  that the rest of this work is hand-delivered anyway.

Everything downstream of the target is already correct — `resolveTarget` returns
the id and type together, and `startPromotion` sends both — so either route is
the only piece missing.

There was a second bug underneath this one, now fixed. A bundle records a
`listingRef`, so the bundle case should have resolved its target the moment its
listing went live. It did not: publishing back-filled `target.contentId` and
left `target.contentType` null, and `resolveTarget` treats a recorded id as the
answer — so instead of falling through to the branch that reads both halves off
the published listing, it returned null and the promotion was refused with "no
target recorded", at exactly the point it should have started working. The
back-fill now writes both halves (see `reviewItem` in the backend's
`workWithUsService.js`), and `scripts/smoke-work-with-us.js` covers it.
