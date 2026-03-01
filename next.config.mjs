/** @type {import('next').NextConfig} */
const nextConfig = {
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
