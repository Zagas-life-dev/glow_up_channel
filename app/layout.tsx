import type React from "react"
import type { Metadata } from "next/types"
import "./globals.css"
import AppLayout from "@/components/app-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { PageProvider } from "@/contexts/page-context"
import { AuthProvider } from "@/lib/auth-context"

export const metadata: Metadata = {
  title: "GlowUp",
  description: "Connect young ambitious people to opportunities, events, and free resources.",
  icons: {
    icon: '/images/logo-icon-transparent.png',
    shortcut: '/images/logo-icon-transparent.png',
    apple: '/images/logo-icon-transparent.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#f96008" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GlowUp" />
        <link rel="apple-touch-icon" href="/images/logo-icon-transparent.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="description" content="GlowUp is a platform for young ambitious people to connect to opportunities, events, and free resources." />
        <meta name="keywords" content="GlowUp, opportunities, events, resources, young ambitious people" />
        <meta name="author" content="GlowUp" />
        <meta name="robots" content="index, follow" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <PageProvider>
              <AppLayout>
                {children}
                <Toaster position="bottom-center" />
              </AppLayout>
            </PageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
