import type React from "react"
import type { Metadata } from "next/types"
import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/ui/sonner"
import NewsletterPopup from "@/components/newsletter-popup"
import { PageProvider } from "@/contexts/page-context"
import { AuthProvider } from "@/lib/auth-context"

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
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <PageProvider>
              <div className="flex min-h-screen flex-col">
                <NewsletterPopup />
                <Navbar />
                <Analytics />
                <main className="flex-1">{children}</main>
                <Footer />
                <Toaster position="top-center" />
              </div>
            </PageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
