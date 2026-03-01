import { SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-sesv2"
import { getSesClient } from "./ses-client"

export type BasicEmailParams = {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  replyTo?: string | string[]
}

export type ContactEmailParams = {
  fromEmail: string
  name?: string
  message: string
}

export type WelcomeEmailParams = {
  to: string
  name?: string
}

export type CampaignEmailParams = {
  recipients: string[]
  subject: string
  htmlBody: string
  textBody?: string
}

export type EmailResult =
  | {
      success: true
      messageId?: string
    }
  | {
      success: false
      error: string
    }

function normalizeRecipients(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to]
}

function normalizeReplyTo(replyTo?: string | string[]): string[] | undefined {
  if (!replyTo) return undefined
  return Array.isArray(replyTo) ? replyTo : [replyTo]
}

export async function sendBasicEmail(params: BasicEmailParams): Promise<EmailResult> {
  try {
    const { client, config } = getSesClient()

    const toAddresses = normalizeRecipients(params.to)
    const replyToAddresses = normalizeReplyTo(params.replyTo)

    const input: SendEmailCommandInput = {
      FromEmailAddress: config.senderEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      ReplyToAddresses: replyToAddresses,
      Content: {
        Simple: {
          Subject: {
            Data: params.subject,
          },
          Body: {
            Html: {
              Data: params.htmlBody,
            },
            ...(params.textBody
              ? {
                  Text: {
                    Data: params.textBody,
                  },
                }
              : {}),
          },
        },
      },
    }

    const command = new SendEmailCommand(input)
    const response = await client.send(command)

    return {
      success: true,
      messageId: response.MessageId,
    }
  } catch (error: unknown) {
    console.error("Error sending SES email:", error)
    const message = error instanceof Error ? error.message : "Unknown SES error"
    return {
      success: false,
      error: message,
    }
  }
}

export async function sendContactEmail(params: ContactEmailParams): Promise<EmailResult> {
  const { message, fromEmail, name } = params

  const { config } = getSesClient()
  const contactRecipient = process.env.SES_CONTACT_RECIPIENT_EMAIL || config.senderEmail

  const subject = `New contact message from ${name || fromEmail}`

  const safeMessage = message.trim()

  const htmlBody = `
    <html>
      <body>
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${name ? `${name} &lt;${fromEmail}&gt;` : fromEmail}</p>
        <p><strong>Email:</strong> ${fromEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
      </body>
    </html>
  `

  const textBody = `New contact message

From: ${name ? `${name} <${fromEmail}>` : fromEmail}
Email: ${fromEmail}

Message:
${safeMessage}
`

  return sendBasicEmail({
    to: contactRecipient,
    subject,
    htmlBody,
    textBody,
    replyTo: fromEmail,
  })
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<EmailResult> {
  const { to, name } = params

  const subject = "Welcome to GlowUp"

  const greetingName = name || "there"

  const htmlBody = `
    <html>
      <body>
        <h1>Welcome, ${greetingName} 👋</h1>
        <p>Thanks for joining GlowUp. We're excited to be part of your journey.</p>
        <p>You&apos;ll start receiving curated opportunities, resources, and tools to help you grow.</p>
      </body>
    </html>
  `

  const textBody = `Welcome, ${greetingName}!

Thanks for joining GlowUp. We're excited to be part of your journey.

You'll start receiving curated opportunities, resources, and tools to help you grow.
`

  return sendBasicEmail({
    to,
    subject,
    htmlBody,
    textBody,
  })
}

export async function sendCampaignEmail(params: CampaignEmailParams): Promise<EmailResult> {
  const { recipients, subject, htmlBody, textBody } = params

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      error: "No recipients provided for campaign email",
    }
  }

  for (const email of recipients) {
    const result = await sendBasicEmail({
      to: email,
      subject,
      htmlBody,
      textBody,
    })

    if (!result.success) {
      return result
    }
  }

  return {
    success: true,
  }
}


