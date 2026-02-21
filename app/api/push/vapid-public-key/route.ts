import { NextResponse } from "next/server"

/**
 * Returns the VAPID public key for web push subscription.
 * Generate keys with: npx web-push generate-vapid-keys
 * Set in .env: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (server-only for sending)
 */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 503 }
    )
  }
  return NextResponse.json({ publicKey: key })
}
