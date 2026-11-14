/**
 * Identifies this deployment. Baked into the client bundle and served back by
 * /api/version, so an installed app that has been open across a deploy can tell
 * it is running old code and offer a refresh (components/register-sw.tsx).
 * The commit comes first so a redeploy of the same code does not nag anyone.
 */
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || String(Date.now())

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript error checking
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // No other site may frame UP (clickjacking of admin and moderation screens).
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/dashboard/posting', destination: '/dashboard/provider/posting', permanent: false },
      { source: '/dashboard/posting/', destination: '/dashboard/provider/posting', permanent: false },
      // The old public submit page. Work with us replaced it; old links land there.
      { source: '/submit', destination: '/work-with-us', permanent: true },
      { source: '/submit/:path*', destination: '/work-with-us', permanent: true },
    ]
  },
}

export default nextConfig
