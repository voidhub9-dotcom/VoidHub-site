import { getFile, saveFile } from '@/lib/github-storage'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

async function getGames() {
  const data = await getFile('games.json')

  if (!data) return []

  return Array.isArray(data) ? data : []
}

async function saveGames(games: any[]) {
  await saveFile('games.json', games)
}

export async function GET(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return Response.json(await getGames(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error(error)

    return Response.json(
      { error: error?.message || 'Failed to load games' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const games = await getGames()

    const newGame = {
      ...body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    games.unshift(newGame)

    await saveGames(games)

    return Response.json(newGame)
  } catch (error: any) {
    console.error(error)

    return Response.json(
      { error: error?.message || 'Failed to create game' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.id) {
      return Response.json(
        { error: 'Game ID required' },
        { status: 400 }
      )
    }

    const games = await getGames()

    const index = games.findIndex((g: any) => g.id === body.id)

    if (index === -1) {
      return Response.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    games[index] = {
      ...games[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    await saveGames(games)

    return Response.json(games[index])
  } catch (error: any) {
    console.error(error)

    return Response.json(
      { error: error?.message || 'Failed to update game' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.id) {
      return Response.json(
        { error: 'Game ID required' },
        { status: 400 }
      )
    }

    const games = await getGames()

    const filtered = games.filter(
      (g: any) => g.id !== body.id
    )

    await saveGames(filtered)

    return Response.json({
      success: true,
      deletedId: body.id,
    })
  } catch (error: any) {
    console.error(error)

    return Response.json(
      { error: error?.message || 'Failed to delete game' },
      { status: 500 }
    )
  }
}
