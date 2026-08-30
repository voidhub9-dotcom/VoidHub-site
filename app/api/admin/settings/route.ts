import { kvGet, kvSet, KV_KEYS } from '@/lib/kv'
import { loadLinks, DEFAULT_LINKS, type SiteLinks } from '@/lib/site-links'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [discord, tagline, maintenance, links] = await Promise.all([
    kvGet(KV_KEYS.DISCORD),
    kvGet(KV_KEYS.TAGLINE),
    kvGet(KV_KEYS.MAINTENANCE),
    loadLinks(),
  ])

  return Response.json({
    discord: discord || 'https://discord.gg/kPPsdZtndn',
    tagline: tagline || 'Free. Keyless. No Limits.',
    maintenance: maintenance === 'true',
    links,
  })
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.discord !== undefined) await kvSet(KV_KEYS.DISCORD, body.discord)
  if (body.tagline !== undefined) await kvSet(KV_KEYS.TAGLINE, body.tagline)
  if (body.maintenance !== undefined) await kvSet(KV_KEYS.MAINTENANCE, String(body.maintenance))

  if (body.links !== undefined && typeof body.links === 'object') {
    const current = await loadLinks()
    const merged: SiteLinks = { ...current }
    for (const k of Object.keys(DEFAULT_LINKS) as (keyof SiteLinks)[]) {
      if (body.links[k] !== undefined) merged[k] = String(body.links[k]).slice(0, 300)
    }
    await kvSet(KV_KEYS.SITE_LINKS, JSON.stringify(merged))
  }

  return Response.json({ success: true })
}
