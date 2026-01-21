/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript error checking
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
