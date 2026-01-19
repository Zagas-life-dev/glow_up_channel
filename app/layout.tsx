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
      <head />
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
