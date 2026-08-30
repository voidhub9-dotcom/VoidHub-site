import { kvGet, kvSet, KV_KEYS, DEFAULT_EXECUTORS } from '@/lib/kv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Executor {
  name: string
  status: 'supported' | 'unsupported'
  link?: string
  linkLabel?: string
  icon?: string
}

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const raw = await kvGet(KV_KEYS.EXECUTORS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return Response.json(parsed)
    }
  } catch {
    // fall through to defaults
  }
  return Response.json(DEFAULT_EXECUTORS)
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return Response.json({ error: 'Expected an array of executors' }, { status: 400 })
  }

  // Validate + sanitize every entry
  const cleaned: Executor[] = []
  for (const item of body) {
    if (!item || typeof item !== 'object') continue
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 60) : ''
    if (!name) continue
    const status = item.status === 'unsupported' ? 'unsupported' : 'supported'
    const entry: Executor = { name, status }
    if (typeof item.link === 'string' && /^https?:\/\//i.test(item.link.trim())) {
      entry.link = item.link.trim().slice(0, 300)
      if (typeof item.linkLabel === 'string' && item.linkLabel.trim()) {
        entry.linkLabel = item.linkLabel.trim().slice(0, 60)
      }
    }
    if (typeof item.icon === 'string' && /^https?:\/\//i.test(item.icon.trim())) {
      entry.icon = item.icon.trim().slice(0, 500)
    }
    cleaned.push(entry)
  }

  const ok = await kvSet(KV_KEYS.EXECUTORS, JSON.stringify(cleaned))
  if (!ok) return Response.json({ error: 'Failed to save (storage not configured)' }, { status: 500 })

  return Response.json({ success: true, count: cleaned.length })
}
