import { MetadataRoute } from 'next'

// Falls back to the real production domain — NEXT_PUBLIC_SITE_URL isn't set
// in Vercel, so this fallback is what search engines actually see today.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.voidon.top'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/unauthorized/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
