/**
 * Every public phone number, email address and WhatsApp link the site shows,
 * in one place, read from NEXT_PUBLIC_* environment variables.
 *
 * Nothing else in the app should spell out a contact detail. Change the value
 * in the environment and every page — footer, contact, the legal pages, the
 * work-with-us flow, the email templates — moves with it.
 *
 * Next.js only inlines a NEXT_PUBLIC_* variable into the browser bundle when
 * the full `process.env.NEXT_PUBLIC_NAME` expression appears literally in the
 * source, so each one is read out by name here and nowhere else. The fallbacks
 * are the values the pages carried before this file existed, which keeps a
 * deploy with no env set behaving exactly as it did.
 */

function fromEnv(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

/** The address the public writes to: footer, contact page, legal pages. */
export const CONTACT_EMAIL = fromEnv(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  "glowupchannel.info@gmail.com",
)

/** Where paid customers and privacy requests go. Falls back to the public one. */
export const SUPPORT_EMAIL = fromEnv(
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  "support@mail.glowupchannel.com",
)

/** Internal inbox, used as the default in admin settings. */
export const ADMIN_EMAIL = fromEnv(
  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  "admin@glowupchannel.com",
)

/** The From: address on transactional mail. */
export const NOREPLY_EMAIL = fromEnv(
  process.env.NEXT_PUBLIC_NOREPLY_EMAIL,
  "noreply@updates.glowupchannel.com",
)

// ---------------------------------------------------------------------------
// Phone and WhatsApp
// ---------------------------------------------------------------------------

/** Written the way it is read out loud, for display. */
export const CONTACT_PHONE = fromEnv(
  process.env.NEXT_PUBLIC_CONTACT_PHONE,
  "08102539906",
)

/** The same number in international form, for `tel:` and dialler handoff. */
export const CONTACT_PHONE_INTL = fromEnv(
  process.env.NEXT_PUBLIC_CONTACT_PHONE_INTL,
  "+2348102539906",
)

/** Digits only, no `+` — the form wa.me links take. */
export const WHATSAPP_NUMBER = fromEnv(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  "2348102539906",
).replace(/[^0-9]/g, "")

/** The broadcast channel people join, which is not the same as the number. */
export const WHATSAPP_CHANNEL_URL = fromEnv(
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL,
  "https://whatsapp.com/channel/0029Vanm1p0InlqII9gDQl0i",
)

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** `mailto:` for any of the addresses above. Defaults to the public one. */
export function mailtoHref(email: string = CONTACT_EMAIL): string {
  return `mailto:${email}`
}

/** `tel:` always uses the international form so it dials from anywhere. */
export function telHref(phone: string = CONTACT_PHONE_INTL): string {
  return `tel:${phone}`
}

/** A chat link, optionally opening with a message already typed. */
export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * Grouped form, for code that wants to pass the whole set around or destructure
 * it. Same values as the named exports above.
 */
export const CONTACT = {
  email: CONTACT_EMAIL,
  supportEmail: SUPPORT_EMAIL,
  adminEmail: ADMIN_EMAIL,
  noreplyEmail: NOREPLY_EMAIL,
  phone: CONTACT_PHONE,
  phoneIntl: CONTACT_PHONE_INTL,
  whatsapp: WHATSAPP_NUMBER,
  whatsappUrl: whatsappHref(),
  whatsappChannel: WHATSAPP_CHANNEL_URL,
} as const
