/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Shop is switched off (keyless site). See SHOP_ENABLED in lib/shop.ts.
  async redirects() {
    return [
      { source: '/shop', destination: '/', permanent: false },
      { source: '/shop/:path*', destination: '/', permanent: false },
      { source: '/admin/shop', destination: '/admin/dashboard', permanent: false },
      { source: '/admin/shop/:path*', destination: '/admin/dashboard', permanent: false },
    ]
  },
}

export default nextConfig
