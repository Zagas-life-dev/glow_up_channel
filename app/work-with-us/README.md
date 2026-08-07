# Work with us

The public flow at `/work-with-us` where people submit listings, buy promotion, or
go read about partnership. No account needed. Everything it uses lives in this folder.

## The flow

```
Welcome  →  What would you like to do?
              ├─ Submit  →  pick a type  →  (resource: pick terms)  →  form  ─┐
              │              (jobs and paid events: one form per listing,     │
              │               added and removed on the same screen)           │
              ├─ Promote →  pick items   →  form                              ─┤
              └─ Partner →  pitch  →  /founder-batch                           │
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
| `config.ts` | **Prices, items, contact details, form fields.** Change things here, nowhere else. |
| `page.tsx` | Moves between screens, handles the trip back from Paystack. |
| `submit-track.tsx` / `promote-track.tsx` / `partner-track.tsx` | The three branches. |
| `ui.tsx` | The shared bits — step wrapper, choice card, form fields. |
| `api/submissions` | Saves a submission, and starts the payment if there is one. |
| `api/verify` | Confirms a payment when the person lands back on the site. |
| `api/webhook` | Confirms a payment when they don't. Optional. |
| `server/*` | Database, Paystack, emails, and the request validation. |

## Setup

Needs these in `.env`:

```
MONGODB_URI=            # same one the backend uses
PAYSTACK_SECRET_KEY=
SES_SENDER_EMAIL=       # already set — used for the notification emails
SES_CONTACT_RECIPIENT_EMAIL=
```

Optional: add `https://your-domain.com/work-with-us/api/webhook` as a webhook in the
Paystack dashboard. Without it, an order only gets marked paid when the person makes it
back to the site after paying.

## Where submissions go

One MongoDB collection, `work_with_us_submissions`. Nothing else is touched.

```js
{
  ref: "GU-7K4M2X",          // also the Paystack transaction reference
  kind: "job",               // free-opportunity | free-event | job | paid-event | resource | promotion
  quantity: 5,               // how many listings were paid for
  promotions: [{ id, quantity }],
  revenueShare: 20,          // resources only
  contact: { name, email, phone, organisation },
  entries: [{ ... }, { ... }],  // one filled-in form per listing
  order:   { lines, total },
  amountNg: 10000,
  status: "paid",            // awaiting_payment | paid | pending_review
  payment: { reference, channel, paidAt, amountNg },
}
```

`pending_review` and `paid` both mean **waiting on you** — nothing publishes itself.

## Changing prices

All in `config.ts`:

- `LISTING_PRICING` — jobs and paid events. Currently ₦2,500 each, and ₦2,000 each from
  5 listings up.
- `PROMOTION_ITEMS` — the promotion menu. Prices add up as items are picked.
- `REVENUE_SHARE_OPTIONS` — the 20% / 30% resource terms.
- `PARTNER` — the founding partner price and where the button goes.

The server recomputes every total from this file before charging, so a price can't be
faked from the browser.
