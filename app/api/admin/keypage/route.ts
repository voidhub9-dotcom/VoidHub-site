import { kvSet, KV_KEYS } from '@/lib/kv'
import { loadKeyPage, DEFAULT_KEY_PAGE, type KeyPageConfig, type KeyProvider } from '@/lib/key-page'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await loadKeyPage())
}

function sanitizeProvider(p: unknown, index: number): KeyProvider | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  return {
    id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : `prov-${Date.now()}-${index}`,
    name: String(o.name ?? '').slice(0, 60),
    url: String(o.url ?? '').slice(0, 500),
    description: String(o.description ?? '').slice(0, 200),
    badge: String(o.badge ?? '').slice(0, 24),
    iconUrl: String(o.iconUrl ?? '').slice(0, 500),
    keyDuration: String(o.keyDuration ?? '').slice(0, 40),
    checkpoints: String(o.checkpoints ?? '').slice(0, 40),
    buttonText: String(o.buttonText ?? '').slice(0, 40),
    enabled: o.enabled !== false,
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const current = await loadKeyPage()

  const next: KeyPageConfig = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
    title: body.title !== undefined ? String(body.title).slice(0, 100) : current.title,
    subtitle: body.subtitle !== undefined ? String(body.subtitle).slice(0, 200) : current.subtitle,
    requireDiscord:
      typeof body.requireDiscord === 'boolean' ? body.requireDiscord : current.requireDiscord,
    discordGateText:
      body.discordGateText !== undefined
        ? String(body.discordGateText).slice(0, 300)
        : current.discordGateText,
    instructions:
      body.instructions !== undefined ? String(body.instructions).slice(0, 500) : current.instructions,
    bannerImageUrl:
      body.bannerImageUrl !== undefined
        ? String(body.bannerImageUrl).slice(0, 500)
        : current.bannerImageUrl,
    footerNote:
      body.footerNote !== undefined ? String(body.footerNote).slice(0, 300) : current.footerNote,
    discordUrlOverride:
      body.discordUrlOverride !== undefined
        ? String(body.discordUrlOverride).slice(0, 300)
        : current.discordUrlOverride,
    providers: Array.isArray(body.providers)
      ? (body.providers
          .map((p: unknown, i: number) => sanitizeProvider(p, i))
          .filter(Boolean) as KeyProvider[]
        ).slice(0, 20)
      : current.providers,
  }

  await kvSet(KV_KEYS.KEY_PAGE, JSON.stringify(next))
  return Response.json({ success: true, config: next })
}

export async function DELETE(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await kvSet(KV_KEYS.KEY_PAGE, JSON.stringify(DEFAULT_KEY_PAGE))
  return Response.json({ success: true })
}
