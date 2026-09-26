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
  async redirects() {
    return [
      { source: '/dashboard/posting', destination: '/dashboard/provider/posting', permanent: false },
      { source: '/dashboard/posting/', destination: '/dashboard/provider/posting', permanent: false },
    ]
  },
}

export default nextConfig
