# glow_up_channel

## Promotion wallet and Paystack

Provider promotions are funded by a **wallet** (NGN). Top-up via Paystack; promoted clicks deduct from the wallet using match-based pricing (10–100 NGN per valid click).

- **Backend env** (see `latest-glowup-channel/.env.example`): `PAYSTACK_SECRET_KEY`; optional `PAYSTACK_WEBHOOK_SECRET`. Register the **wallet webhook** in the Paystack Dashboard:  
  `POST https://your-backend-url/api/wallet/paystack/webhook`  
  (for `charge.success`; references must start with `WAL-`).
- **Frontend env**: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` for Paystack redirect/popup (optional if using backend redirect URL only).
- **New collections** (indexes created on startup): `provider_wallets`, `wallet_transactions`, `promotion_clicks`. No manual migration required; ensure MongoDB user has createIndex.
