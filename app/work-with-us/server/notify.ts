import { sendBasicEmail } from "@/lib/email/service"

import { naira } from "../config"
import type { SubmissionDoc } from "./db"

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function rows(pairs: [string, string][]): string {
  return pairs
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escape(label)}</td>` +
        `<td style="padding:4px 0">${escape(value)}</td></tr>`,
    )
    .join("")
}

function summarise(doc: SubmissionDoc): string {
  if (doc.order.lines.length === 0) return "No payment due"
  return doc.order.lines
    .map((line) => `${line.label} ×${line.quantity} — ${naira(line.total)}`)
    .join(", ")
}

/**
 * Tells the team a submission came in. Best-effort: a failed email must never
 * lose a submission that is already saved, so callers ignore the result.
 */
export async function notifyTeam(doc: SubmissionDoc): Promise<void> {
  const to = process.env.SES_CONTACT_RECIPIENT_EMAIL
  if (!to) return

  const paid = doc.status === "paid"
  const many = doc.entries.length > 1

  // Each listing gets its own block so nothing runs together.
  const entryBlocks = doc.entries
    .map((entry, index) => {
      const heading = many
        ? `<h3 style="font-family:sans-serif;font-size:14px;margin:20px 0 6px">Listing ${index + 1} of ${doc.entries.length}</h3>`
        : ""
      const table = `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows(
        Object.entries(entry).map(([key, value]) => [key, value] as [string, string]),
      )}</table>`
      return heading + table
    })
    .join("")

  const html = `
    <h2 style="font-family:sans-serif">${escape(doc.ref)} — ${escape(doc.kind)}</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${rows([
        ["Status", paid ? `Paid — ${naira(doc.amountNg)}` : doc.status.replace(/_/g, " ")],
        ["Order", summarise(doc)],
        ["Listings", many ? String(doc.entries.length) : ""],
        ["Revenue share", doc.revenueShare ? `${doc.revenueShare}%` : ""],
        ["Name", doc.contact.name],
        ["Organisation", doc.contact.organisation],
        ["Email", doc.contact.email],
        ["Phone", doc.contact.phone],
      ])}
    </table>
    ${entryBlocks}
  `

  await sendBasicEmail({
    to,
    subject: `${paid ? "Paid" : "New"} submission ${doc.ref} — ${doc.kind}`,
    htmlBody: html,
    replyTo: doc.contact.email,
  }).catch(() => undefined)
}

/** Confirms to the person that we have their submission. Also best-effort. */
export async function notifySubmitter(doc: SubmissionDoc): Promise<void> {
  const paid = doc.status === "paid"
  const html = `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6">
      <p>Hi ${escape(doc.contact.name.split(" ")[0] || "there")},</p>
      <p>We have your submission. Your reference is <strong>${escape(doc.ref)}</strong>.</p>
      ${paid ? `<p>Payment received: <strong>${naira(doc.amountNg)}</strong>.</p>` : ""}
      <p>Our team reviews everything before it goes live. We will be in touch shortly.</p>
      <p>— GlowUp</p>
    </div>
  `

  await sendBasicEmail({
    to: doc.contact.email,
    subject: `We got your submission (${doc.ref})`,
    htmlBody: html,
  }).catch(() => undefined)
}
