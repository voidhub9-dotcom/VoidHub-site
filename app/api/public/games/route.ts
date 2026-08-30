import { getFile } from '@/lib/github-storage'
import { DEFAULT_GAMES } from '@/lib/storage'

export const dynamic = 'force-dynamic'

async function getGames() {
  try {
    const raw = await getFile('games.json')
    if (!raw) return DEFAULT_GAMES
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GAMES
  } catch {
    return DEFAULT_GAMES
  }
}

export async function GET(req: Request) {
  const games = await getGames()
  return Response.json(games, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
