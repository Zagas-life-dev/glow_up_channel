import { sendBasicEmail, type BasicEmailParams } from "@/lib/email/service"

import { naira } from "../config"
import type { ItemDoc, OrderDoc } from "./api"

/**
 * Sends one of the two, and says so when it does not go.
 *
 * `sendBasicEmail` reports a missing AWS_* or SES_SENDER_EMAIL the same way it
 * reports a refused address — as a returned failure, not a thrown one — and the
 * result used to be discarded here. Logged instead, because a deploy whose mail
 * has quietly never worked looks exactly like one whose customers never write
 * back, and the message names the variable.
 */
async function send(what: string, ref: string, params: BasicEmailParams): Promise<void> {
  const result = await sendBasicEmail(params)
  if (!result.success) console.error(`work-with-us ${ref}: ${what} email not sent — ${result.error}`)
}

/**
 * Wraps one of the two so it can never reject, whatever goes wrong — including
 * while the message is still being built. Both callers run them through
 * `Promise.all`, where one rejection would take the other down with it and
 * surface as a failed order.
 */
function quietly(what: string, ref: string, run: () => Promise<void>): Promise<void> {
  return run().catch((error: unknown) => {
    console.error(`work-with-us ${ref}: ${what} email failed:`, error)
  })
}

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

function table(pairs: [string, string][]): string {
  return `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows(pairs)}</table>`
}

function summarise(doc: OrderDoc): string {
  if (doc.order.lines.length === 0) return "No payment due"
  return doc.order.lines
    .map((line) => `${line.label} ×${line.quantity} — ${naira(line.total)}`)
    .join(", ")
}

function signOff(body: string): string {
  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.6">${body}<p>— UP</p></div>`
}

/**
 * Tells the team an order came in. Best-effort: a failed email must never lose
 * an order that is already saved, so callers ignore the result.
 */
export function notifyTeam(doc: OrderDoc, itemDocs: ItemDoc[]): Promise<void> {
  return quietly("team", doc.ref, () => teamEmail(doc, itemDocs))
}

async function teamEmail(doc: OrderDoc, itemDocs: ItemDoc[]): Promise<void> {
  const to = process.env.SES_CONTACT_RECIPIENT_EMAIL
  if (!to) return

  const paid = doc.status === "paid"
  const many = itemDocs.length > 1

  // Each item gets its own block so nothing runs together.
  const itemBlocks = itemDocs
    .map((item, index) => {
      const heading = many
        ? `<h3 style="font-family:sans-serif;font-size:14px;margin:20px 0 6px">${escape(item.ref)} — ${escape(item.itemType)} ${index + 1} of ${itemDocs.length}</h3>`
        : ""
      const promos = (item.promotions ?? [])
        .map((promo) => `${promo.label} ×${promo.quantity}`)
        .join(", ")
      return (
        heading +
        table([
          ...Object.entries(item.fields).map(([key, value]) => [key, value] as [string, string]),
          ["promotion", promos],
        ])
      )
    })
    .join("")

  const html = `
    <h2 style="font-family:sans-serif">${escape(doc.ref)} — ${escape(doc.kind)}</h2>
    ${table([
      ["Status", paid ? `Paid — ${naira(doc.amountNg)}` : doc.status.replace(/_/g, " ")],
      ["Order", summarise(doc)],
      ["Items", many ? String(itemDocs.length) : ""],
      ["Revenue share", doc.revenueShare ? `${doc.revenueShare}%` : ""],
      ["Name", doc.contact.name],
      ["Organisation", doc.contact.organisation],
      ["Email", doc.contact.email],
      ["Phone", doc.contact.phone],
    ])}
    ${itemBlocks}
  `

  await send("team", doc.ref, {
    to,
    subject: `${paid ? "Paid" : "New"} submission ${doc.ref} — ${doc.kind}`,
    htmlBody: html,
    replyTo: doc.contact.email,
  })
}

/**
 * The customer's copy of the order — comms doc §06. They get back everything
 * they sent us plus the order ID, so neither side has to ask the other what was
 * in it. Also best-effort: a failed email must not lose a saved order.
 */
export function notifySubmitter(doc: OrderDoc, itemDocs: ItemDoc[] = []): Promise<void> {
  return quietly("customer", doc.ref, () => submitterEmail(doc, itemDocs))
}

async function submitterEmail(doc: OrderDoc, itemDocs: ItemDoc[]): Promise<void> {
  const paid = doc.status === "paid"

  const lines = doc.order.lines
    .map(
      (line) =>
        `<tr><td style="padding:4px 12px 4px 0">${escape(line.label)}${line.quantity > 1 ? ` ×${line.quantity}` : ""}</td>` +
        `<td style="padding:4px 0;text-align:right">${naira(line.total)}</td></tr>`,
    )
    .join("")

  const orderTable = lines
    ? `<table style="width:100%;font-family:sans-serif;font-size:14px;border-collapse:collapse;margin:8px 0">
         ${lines}
         <tr><td style="padding:8px 12px 0 0;border-top:1px solid #ddd"><strong>Total</strong></td>
             <td style="padding:8px 0 0;border-top:1px solid #ddd;text-align:right"><strong>${naira(doc.amountNg)}</strong></td></tr>
       </table>`
    : "<p>Nothing to pay for this one.</p>"

  // Everything they typed, sent straight back so they have their own record.
  const submitted = itemDocs
    .map((item, index) => {
      const heading =
        itemDocs.length > 1
          ? `<h3 style="font-size:14px;margin:20px 0 6px">${index + 1}. ${escape(item.fields.title || item.ref)}</h3>`
          : ""
      const promos = (item.promotions ?? [])
        .map((promo) => `${promo.label} ×${promo.quantity}`)
        .join(", ")
      return (
        heading +
        table([
          ...Object.entries(item.fields).map(([key, value]) => [key, value] as [string, string]),
          ["promotion", promos],
          ["reference", item.ref],
        ])
      )
    })
    .join("")

  const html = signOff(`
    <p>Hi ${escape(doc.contact.name.split(" ")[0] || "there")},</p>
    <p>Thanks for choosing UP.</p>
    <p>
      ${paid ? `We've received your payment of <strong>${naira(doc.amountNg)}</strong> and the details you submitted.` : "We've received the details you submitted."}
      Your order is now with UP for review — we check the submission, links, dates and assets before
      anything goes live.
    </p>
    <p>If we need anything from you, we'll email you with the specific item to fix or provide.</p>

    <h3 style="font-size:14px;margin:24px 0 6px">Your order</h3>
    ${table([
      ["Order ID", doc.ref],
      ["Status", paid ? "Paid — awaiting review" : "Awaiting review"],
      ["Revenue share", doc.revenueShare ? `${doc.revenueShare}%` : ""],
    ])}
    ${orderTable}

    ${submitted ? `<h3 style="font-size:14px;margin:24px 0 6px">What you sent us</h3>${submitted}` : ""}

    <p style="margin-top:24px">No action is needed from you right now. Keep this email — quote
    <strong>${escape(doc.ref)}</strong> if you get in touch.</p>
  `)

  await send("customer", doc.ref, {
    to: doc.contact.email,
    subject: paid
      ? `Payment received — your order is with UP (${doc.ref})`
      : `We've got your submission (${doc.ref})`,
    htmlBody: html,
  })
}

/*
 * There is deliberately no "published" or "rejected" email here. Everything the
 * customer hears from a person — approval, clarification, rejection, delivery —
 * is composed by hand in Gmail from the review queue, using the templates in
 * `admin/mail.ts`. Only the two unattended emails above are sent by the server.
 */
