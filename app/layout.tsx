import type React from "react"
import type { Metadata } from "next/types"
import { cookies, headers } from "next/headers"
import { Inter, Bricolage_Grotesque } from "next/font/google"
import "./globals.css"
import AppLayout from "@/components/app-layout"
import { LocaleProvider } from "@/lib/i18n/context"
import { ViewingCountryProvider } from "@/lib/geo/viewing-country"
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  localeFromCountry,
  normalizeLocale,
  DEFAULT_LOCALE,
} from "@/lib/i18n/config"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { PageProvider } from "@/contexts/page-context"
import { AuthProvider } from "@/lib/auth-context"
import { PlaylistProvider } from "@/contexts/playlist-context"
import { LockedInProvider } from "@/contexts/locked-in-context"
import VisitTracker from "@/components/visit-tracker"
import PwaInstallBanner from "@/components/pwa-install-banner"
import RegisterSw from "@/components/register-sw"
import { getMetadataBase } from "@/lib/site-url"
import { JsonLd } from "@/components/seo/json-ld"
import { buildSiteJsonLd } from "@/lib/seo/structured-data"

/**
 * The two brand typefaces from the Master Copy Library §1.2 — Inter for headlines
 * and CTAs, Bricolage Grotesque for body copy. Exposed under their own variable
 * names so they sit alongside the app's existing `--font-inter` stack rather than
 * redefining it, and are opted into per surface (currently the landing page).
 */
const brandDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-up-display",
  display: "swap",
})

const brandBody = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-up-body",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "UP — opportunities, events, and resources",
    template: "%s | UP",
  },
  description:
    "UP connects young ambitious people to opportunities, events, jobs, and free resources in one community-driven platform.",
  applicationName: "UP",
  authors: [{ name: "UP" }],
  keywords: [
    "UP",
    // The old name still carries the search equity, and it stays declared as an
    // alternateName in lib/seo/brand.ts, so it earns its place here too.
    "GlowUp",
    "opportunities",
    "jobs",
    "events",
    "resources",
    "youth",
    "career",
    "community",
  ],
  // `max-snippet: -1` and large image previews let search and AI surfaces quote
  // a full listing instead of a clipped fragment; the defaults are far shorter.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
  icons: {
    icon: "/images/Yellow and Black Modern Media Company Logo (14).png",
    shortcut: "/images/Yellow and Black Modern Media Company Logo (14).png",
    apple: "/images/Yellow and Black Modern Media Company Logo (14).png",
  },
  openGraph: {
    type: "website",
    siteName: "UP",
    title: "UP — opportunities, events, and resources",
    description:
      "Connect to opportunities, events, jobs, and free resources tailored for ambitious young people.",
  },
  twitter: {
    card: "summary_large_image",
    title: "UP — opportunities, events, and resources",
    description:
      "Connect to opportunities, events, jobs, and free resources tailored for ambitious young people.",
  },
}

/**
 * Resolve the locale on the server so the first paint is already correct.
 *
 * The middleware writes the cookie; this reads it, with the same
 * Accept-Language / country fallbacks in case the request skipped middleware
 * (a prefetch, or a route outside the matcher).
 */
async function resolveInitialLocale() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])

  const fromCookie = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value)
  if (fromCookie) {
    return { locale: fromCookie, countryCode: countryFrom(headerList) }
  }

  const countryCode = countryFrom(headerList)
  const locale =
    localeFromAcceptLanguage(headerList.get("accept-language")) ??
    localeFromCountry(countryCode) ??
    DEFAULT_LOCALE

  return { locale, countryCode }
}

function countryFrom(headerList: Headers): string | null {
  return (
    headerList.get("x-vercel-ip-country") ?? headerList.get("cf-ipcountry") ?? null
  )
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { locale, countryCode } = await resolveInitialLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#ff6700" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="UP" />
        <link rel="apple-touch-icon" href="/images/Yellow and Black Modern Media Company Logo (14).png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="google" content="notranslate" />
        {/* Publisher identity every listing's JSON-LD points back to. */}
        <JsonLd data={buildSiteJsonLd()} />
      </head>
      <body
        className={`${brandDisplay.variable} ${brandBody.variable} font-sans antialiased bg-page text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LocaleProvider initialLocale={locale} countryCode={countryCode}>
            <ViewingCountryProvider>
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
            </ViewingCountryProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
