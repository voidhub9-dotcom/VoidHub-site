import { kvGet, kvSet, KV_KEYS, discordLink, type SiteConfig } from '@/lib/kv'
import { loadLinks, DEFAULT_LINKS, type SiteLinks } from '@/lib/site-links'
import { getConfig, setConfig } from '@/lib/config'

const CONFIG_FIELDS: (keyof SiteConfig)[] = [
  'discordClientId',
  'discordClientSecret',
  'discordBotToken',
  'discordGuildId',
  'discordVerifiedRoleId',
]

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [discord, tagline, maintenance, links, config] = await Promise.all([
    kvGet(KV_KEYS.DISCORD),
    kvGet(KV_KEYS.TAGLINE),
    kvGet(KV_KEYS.MAINTENANCE),
    loadLinks(),
    getConfig(),
  ])

  // Mask secrets in the response — send a placeholder so the UI shows "saved"
  // without leaking the actual token to the browser.
  const safeConfig: Record<string, string> = {}
  for (const f of CONFIG_FIELDS) {
    safeConfig[f] = (config as Record<string, string | undefined>)[f] ? '••••••••' : ''
  }

  return Response.json({
    discord: discordLink(discord),
    tagline: tagline || 'Free. Powerful. No Limits.',
    maintenance: maintenance === 'true',
    links,
    config: safeConfig,
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

  if (body.config !== undefined && typeof body.config === 'object') {
    const patch: Partial<SiteConfig> = {}
    for (const f of CONFIG_FIELDS) {
      const v = body.config[f]
      if (typeof v === 'string' && v !== '••••••••') {
        patch[f] = v  // empty string clears the field (setConfig strips empty strings)
      }
    }
    await setConfig(patch)
  }

  return Response.json({ success: true })
}
