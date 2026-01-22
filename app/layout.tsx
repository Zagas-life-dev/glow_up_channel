import type React from "react"
import type { Metadata } from "next/types"
import { Inter } from "next/font/google"
import "./globals.css"
import AppLayout from "@/components/app-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/ui/sonner"
import { PageProvider } from "@/contexts/page-context"
import { AuthProvider } from "@/lib/auth-context"
import { PlaylistProvider } from "@/contexts/playlist-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Glow Up Channel",
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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Glow Up Channel is a platform for young ambitious people to connect to opportunities, events, and free resources." />
        <meta name="keywords" content="Glow Up Channel, opportunities, events, resources, young ambitious people" />
        <meta name="author" content="Glow Up Channel" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        <meta name="yandexbot" content="index, follow" />
        <meta name="google" content="notranslate" />
        <meta name="google" content="notranslate" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <AuthProvider>
            <PlaylistProvider>
              <PageProvider>
                <AppLayout>
                  <Analytics />
                  {children}
                  <Toaster position="bottom-center" />
                </AppLayout>
              </PageProvider>
            </PlaylistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
