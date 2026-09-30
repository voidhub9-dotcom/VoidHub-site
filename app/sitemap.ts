import { MetadataRoute } from 'next'

// Falls back to the real production domain — NEXT_PUBLIC_SITE_URL isn't set
// in Vercel, so this fallback is what search engines actually see today.
// Trailing slashes are stripped: the Vercel value ends in "/", which produced "//games".
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voidon.top').replace(/\/+$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/games`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE}/status`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/developers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
