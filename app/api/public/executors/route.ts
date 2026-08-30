import { kvGet, KV_KEYS, DEFAULT_EXECUTORS } from '@/lib/kv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await kvGet(KV_KEYS.EXECUTORS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Response.json(parsed, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate'},
        })
      }
    }
  } catch {
    // fall through to defaults
  }
  return Response.json(DEFAULT_EXECUTORS, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate'},
  })
}
