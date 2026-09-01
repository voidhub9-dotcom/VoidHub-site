import { getFile } from '@/lib/github-storage'
import { DEFAULT_GAMES } from '@/lib/storage'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Public Games API — meant for external use (see /developers for docs),
 * not just the site's own pages. Two things that matters for that:
 *   - `notes` is an admin-only field ("only you see these" in the admin
 *     UI) and must never leak here.
 *   - CORS is wide open (GET is read-only public data) so it can be
 *     called cross-origin from other sites/tools, not just voidon.top.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

interface PublicGame {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'outdated'
  thumbnail: string
  scriptLink: string
  robloxUrl?: string
  placeId?: string
  features: string[]
  featured: boolean
  createdAt: string
  updatedAt: string
}

function sanitize(raw: any): PublicGame {
  // Explicit allowlist rather than an omit — new admin-only fields added
  // later default to hidden instead of leaking automatically.
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    status: raw.status,
    thumbnail: raw.thumbnail,
    scriptLink: raw.scriptLink,
    robloxUrl: raw.robloxUrl,
    placeId: raw.placeId,
    features: Array.isArray(raw.features) ? raw.features : [],
    featured: !!raw.featured,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

async function getGames(): Promise<any[]> {
  try {
    const raw = await getFile('games.json')
    if (!raw) return DEFAULT_GAMES
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GAMES
  } catch {
    return DEFAULT_GAMES
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: Request) {
  const ip = getClientIp(req)
  if (isRateLimited(ip, 60, 60_000)) {
    return Response.json(
      { error: 'Rate limit exceeded — max 60 requests per minute.' },
      { status: 429, headers: { ...CORS_HEADERS, ...NO_CACHE_HEADERS, 'Retry-After': '60' } },
    )
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const featured = searchParams.get('featured')

  let games = (await getGames()).map(sanitize)

  if (status === 'active' || status === 'outdated') {
    games = games.filter(g => g.status === status)
  }
  if (category) {
    games = games.filter(g => g.category.toLowerCase() === category.toLowerCase())
  }
  if (featured === 'true' || featured === '1') {
    games = games.filter(g => g.featured)
  }

  return Response.json(games, { headers: { ...CORS_HEADERS, ...NO_CACHE_HEADERS } })
}
