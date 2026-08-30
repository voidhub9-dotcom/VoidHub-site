/**
 * Live executor status from WEAO (whatexpsare.online).
 *
 * Docs: https://docs.weao.xyz/weao-api-reference/exploits
 *  - `User-Agent: WEAO-3PService` is REQUIRED on every request.
 *  - Rate limited — we cache results server-side for 5 minutes and
 *    fall back through their mirror domains when one is down, so
 *    executor statuses keep auto-updating even if a domain dies.
 *
 * Returns a slim map the status page can join against its own list:
 *   { robloxVersion, updatedAt, executors: { [lowercased title]: {...} } }
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WEAO_DOMAINS = [
  'https://weao.xyz',
  'https://whatexpsare.online',
  'https://weao.gg',
  'https://whatexploitsaretra.sh',
]

const HEADERS = { 'User-Agent': 'WEAO-3PService' }
const CACHE_TTL_MS = 5 * 60 * 1000

interface WeaoExploit {
  title?: string
  version?: string
  updatedDate?: string
  updateStatus?: boolean
  detected?: boolean
  free?: boolean
  platform?: string
  rbxversion?: string
  websitelink?: string
  discordlink?: string
  uncPercentage?: number
  suncPercentage?: number
  keysystem?: boolean
  hidden?: boolean
}

export interface WeaoStatus {
  version: string
  updatedDate: string
  updateStatus: boolean
  detected: boolean
  free: boolean
  platform: string
  uncPercentage: number | null
  suncPercentage: number | null
  keysystem: boolean
}

interface CachePayload {
  robloxVersion: string
  robloxVersionDate: string
  updatedAt: string
  executors: Record<string, WeaoStatus>
}

// Module-level cache survives across requests on a warm serverless instance.
let cache: { data: CachePayload; expires: number } | null = null

/** Try each WEAO mirror in order until one responds — auto-failover. */
async function weaoFetch(path: string): Promise<unknown | null> {
  for (const domain of WEAO_DOMAINS) {
    try {
      const res = await fetch(`${domain}${path}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) return await res.json()
      // 429 = rate limited on this domain; try the next mirror
    } catch {
      // network error / timeout — try the next mirror
    }
  }
  return null
}

async function buildPayload(): Promise<CachePayload | null> {
  const [exploits, versions] = await Promise.all([
    weaoFetch('/api/status/exploits'),
    weaoFetch('/api/versions/current'),
  ])
  if (!Array.isArray(exploits)) return null

  const executors: Record<string, WeaoStatus> = {}
  for (const raw of exploits as WeaoExploit[]) {
    if (!raw?.title || raw.hidden) continue
    executors[raw.title.trim().toLowerCase()] = {
      version: String(raw.version ?? ''),
      updatedDate: String(raw.updatedDate ?? ''),
      updateStatus: raw.updateStatus === true,
      detected: raw.detected === true,
      free: raw.free === true,
      platform: String(raw.platform ?? ''),
      uncPercentage: typeof raw.uncPercentage === 'number' ? raw.uncPercentage : null,
      suncPercentage: typeof raw.suncPercentage === 'number' ? raw.suncPercentage : null,
      keysystem: raw.keysystem === true,
    }
  }

  const v = (versions ?? {}) as Record<string, string>
  return {
    robloxVersion: String(v.Windows ?? ''),
    robloxVersionDate: String(v.WindowsDate ?? ''),
    updatedAt: new Date().toISOString(),
    executors,
  }
}

export async function GET() {
  if (cache && Date.now() < cache.expires) {
    return Response.json(cache.data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }

  const payload = await buildPayload()
  if (payload) {
    cache = { data: payload, expires: Date.now() + CACHE_TTL_MS }
    return Response.json(payload, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }

  // All mirrors down — serve stale cache if we have one, else an empty shape
  if (cache) {
    return Response.json(cache.data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }
  return Response.json(
    { robloxVersion: '', robloxVersionDate: '', updatedAt: '', executors: {} },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  )
}
