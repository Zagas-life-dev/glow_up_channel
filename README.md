# glow_up_channel

## Marketing email (admin) and Google AI Studio

The marketing email designer (`/dashboard/admin/marketing/email`) supports preselectable designs and AI-generated copy via **Google AI Studio (Gemini)**.

- **Designs**: Choose a template (Minimal, Bold promo, Newsletter, GlowUp branded); preview and send use the same template.
- **AI generation**: Optional Tone and Campaign type can be sent to Gemini to generate or improve subject and body; the AI can also suggest a design.

**Server-only env (do not use `NEXT_PUBLIC_*`):**

- `GEMINI_API_KEY` – API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Used only in `POST /api/marketing/ai-generate`. If unset, the "Generate with AI" button returns a 503 with a safe message.

Add to `.env.local` (or your host’s env):

```bash
GEMINI_API_KEY=your-api-key
```

## Promotion wallet and Paystack

Provider promotions are funded by a **wallet** (NGN). Top-up via Paystack; promoted clicks deduct from the wallet using match-based pricing (10–100 NGN per valid click).

- **Backend env** (see `latest-glowup-channel/.env.example`): `PAYSTACK_SECRET_KEY`; optional `PAYSTACK_WEBHOOK_SECRET`. Register the **wallet webhook** in the Paystack Dashboard:  
  `POST https://your-backend-url/api/wallet/paystack/webhook`  
  (for `charge.success`; references must start with `WAL-`).
- **Frontend env**: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` for Paystack redirect/popup (optional if using backend redirect URL only).
- **New collections** (indexes created on startup): `provider_wallets`, `wallet_transactions`, `promotion_clicks`. No manual migration required; ensure MongoDB user has createIndex.
