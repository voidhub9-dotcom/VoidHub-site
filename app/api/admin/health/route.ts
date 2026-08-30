import { NextResponse } from 'next/server'
import { r2Configured, r2Put, r2GetText, r2Delete, r2List } from '@/lib/r2'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

/**
 * GET /api/admin/health
 * Performs a REAL R2 round-trip (write -> read -> delete) so the dashboard
 * shows accurate storage health instead of inferring it from cached/fallback data.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!r2Configured) {
    return NextResponse.json({
      configured: false,
      ok: false,
      latencyMs: null,
      objects: 0,
      totalBytes: 0,
      message:
        'R2 env vars missing. Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET_NAME.',
    })
  }

  const started = Date.now()
  const probeKey = `health/probe-${started}.txt`
  const probeValue = `ping-${started}`

  let ok = false
  try {
    const wrote = await r2Put(probeKey, probeValue, 'text/plain')
    const read = wrote ? await r2GetText(probeKey) : null
    ok = read === probeValue
    if (wrote) await r2Delete(probeKey)
  } catch {
    ok = false
  }
  const latencyMs = Date.now() - started

  // Bucket usage stats (best-effort)
  let objects = 0
  let totalBytes = 0
  try {
    const list = await r2List('')
    objects = list.length
    totalBytes = list.reduce((sum, o) => sum + o.size, 0)
  } catch {
    /* stats are optional */
  }

  return NextResponse.json({
    configured: true,
    ok,
    latencyMs,
    objects,
    totalBytes,
    message: ok
      ? `R2 connected. Round-trip ${latencyMs}ms.`
      : 'R2 credentials set but read/write probe failed. Verify the API token permissions and bucket name.',
  })
}
