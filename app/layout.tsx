import type React from "react"
import type { Metadata } from "next/types"
import "./globals.css"
import AppLayout from "@/components/app-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { PageProvider } from "@/contexts/page-context"
import { AuthProvider } from "@/lib/auth-context"
import { PlaylistProvider } from "@/contexts/playlist-context"
import { LockedInProvider } from "@/contexts/locked-in-context"
import VisitTracker from "@/components/visit-tracker"
import PwaInstallBanner from "@/components/pwa-install-banner"
import RegisterSw from "@/components/register-sw"
import Script from "next/script"
import { getMetadataBase } from "@/lib/site-url"

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "GlowUp — opportunities, events, and resources",
    template: "%s | GlowUp",
  },
  description:
    "GlowUp connects young ambitious people to opportunities, events, jobs, and free resources in one community-driven platform.",
  applicationName: "GlowUp",
  authors: [{ name: "GlowUp" }],
  keywords: [
    "GlowUp",
    "opportunities",
    "jobs",
    "events",
    "resources",
    "youth",
    "career",
    "community",
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: "/images/Yellow and Black Modern Media Company Logo (14).png",
    shortcut: "/images/Yellow and Black Modern Media Company Logo (14).png",
    apple: "/images/Yellow and Black Modern Media Company Logo (14).png",
  },
  openGraph: {
    type: "website",
    siteName: "GlowUp",
    title: "GlowUp — opportunities, events, and resources",
    description:
      "Connect to opportunities, events, jobs, and free resources tailored for ambitious young people.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Third-party ad/CMP scripts: only in production and loaded after page is ready to avoid "identity bridging" timeout errors in dev */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              async
              src="//www.ezojs.com/ezoic/sa.min.js"
              strategy="lazyOnload"
            />
            <Script
              data-cfasync="false"
              src="https://cmp.gatekeeperconsent.com/min.js"
              strategy="lazyOnload"
            />
            <Script
              data-cfasync="false"
              src="https://thegatekeeperconsent.com/cmp.min.js"
              strategy="lazyOnload"
            />
            <Script strategy="lazyOnload">
              {`window.ezstandalone = window.ezstandalone || {};
          ezstandalone.cmd = ezstandalone.cmd || [];`}
            </Script>
          </>
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#ff6700" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GlowUp" />
        <link rel="apple-touch-icon" href="/images/Yellow and Black Modern Media Company Logo (14).png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased bg-page text-foreground" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <PlaylistProvider>
              <LockedInProvider>
                <PageProvider>
                  <AppLayout>
                    <VisitTracker />
                    <RegisterSw />
                    <PwaInstallBanner />
                    {children}
                    <Toaster position="bottom-center" />
                  </AppLayout>
                </PageProvider>
              </LockedInProvider>
            </PlaylistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
