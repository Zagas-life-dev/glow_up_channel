import { SESv2Client } from "@aws-sdk/client-sesv2"

let cachedClient: SESv2Client | null = null

export type SesClientConfig = {
  region: string
  senderEmail: string
}

export function getSesClient(): { client: SESv2Client; config: SesClientConfig } {
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const senderEmail = process.env.SES_SENDER_EMAIL

  if (!region || !accessKeyId || !secretAccessKey || !senderEmail) {
    throw new Error("Amazon SES is not fully configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and SES_SENDER_EMAIL environment variables.")
  }

  if (!cachedClient) {
    cachedClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  return {
    client: cachedClient,
    config: {
      region,
      senderEmail,
    },
  }
}

