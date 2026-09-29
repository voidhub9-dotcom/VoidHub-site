import { kvGet, KV_KEYS, discordLink } from '@/lib/kv'
import { loadLinks } from '@/lib/site-links'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [discord, tagline, maintenance, links] = await Promise.all([
    kvGet(KV_KEYS.DISCORD),
    kvGet(KV_KEYS.TAGLINE),
    kvGet(KV_KEYS.MAINTENANCE),
    loadLinks(),
  ])

  return Response.json({
    discord: discordLink(discord),
    tagline: tagline || 'Free. Powerful. No Limits.',
    maintenance: maintenance === 'true',
    links,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}
