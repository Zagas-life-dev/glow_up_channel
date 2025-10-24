import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

function createEmailTemplate(subject: string, content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; color: #333333;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header with Logo -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; background-color: #000000; border-bottom: 2px solid #FF8C00;">
                  <img src="/images/logo-icon-transparent.png" alt="Glowup Logo" style="max-width: 180px; height: auto;">
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h1 style="margin: 0 0 20px 0; font-size: 24px; line-height: 30px; color: #000000; text-align: center;">${subject}</h1>
                  <div style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #333333;">
                    ${content}
                  </div>
                  <p style="margin: 30px 0 15px 0; text-align: center;">
                    <a href="https://www.glowupchannel.com/" style="display: inline-block; padding: 12px 24px; background-color: #FF8C00; color: #000000; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 14px;">Explore Now</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #000000; text-align: center; color: #ffffff; font-size: 14px; border-top: 2px solid #FF8C00;">
                  <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Glowupchannel. All rights reserved.</p>
                  <p style="margin: 0;">
                    <a href="https://glowupchannel.com/privacy" style="color: #FF8C00; text-decoration: underline; margin: 0 5px;">Privacy Policy</a> | 
                    <a href="https://glowupchannel.com/terms" style="color: #FF8C00; text-decoration: underline; margin: 0 5px;">Terms of Service</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export async function POST(request: Request) {
  try {
    const { to, subject, content } = await request.json()
    
    // Validate inputs
    if (!to || !subject || !content) {
      console.error('Missing required fields:', { to, subject, contentLength: content?.length })
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key is missing')
      return NextResponse.json({ 
        error: 'Email service is not properly configured' 
      }, { status: 500 })
    }

    const htmlContent = createEmailTemplate(subject, content)

    const data = await resend.emails.send({
      from: 'Glow Up Channel <noreply@updates.glowupchannel.com>',
      to: [to],
      subject: subject,
      html: htmlContent,
    })

    console.log('Email sent successfully:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to send email:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send email',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}