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
import Script from "next/script"

export const metadata: Metadata = {
  title: "GlowUp",
  description: "Connect young ambitious people to opportunities, events, and free resources.",
  generator: 'v0.dev',
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
        <meta name="google-adsense-slot" content="3194443159" />
        <Script async src="//www.ezojs.com/ezoic/sa.min.js" strategy="beforeInteractive"></Script>
        <Script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></Script>
        <Script data-cfasync="false" src="https://thegatekeeperconsent.com/cmp.min.js" strategy="beforeInteractive"></Script>
        <Script strategy="beforeInteractive">
          {`window.ezstandalone = window.ezstandalone || {};
          ezstandalone.cmd = ezstandalone.cmd || [];`}
        </Script>
        <meta name="google-adsense-account" content="ca-pub-4275585712096268"></meta>
        <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4275585712096268" crossOrigin="anonymous"></Script>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="GlowUp is a platform for young ambitious people to connect to opportunities, events, and free resources." />
        <meta name="keywords" content="GlowUp, opportunities, events, resources, young ambitious people" />
        <meta name="author" content="GlowUp" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        <meta name="yandexbot" content="index, follow" />
        <meta name="google" content="notranslate" />
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <PlaylistProvider>
              <LockedInProvider>
                <PageProvider>
                  <AppLayout>
                    <VisitTracker />
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
