import { getFile, saveFile } from '@/lib/github-storage'

function authorized(req: Request) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

async function getGames() {
  const raw = await getFile('games.json')

  if (!raw) return []

  return JSON.parse(raw)
}

async function saveGames(games: any[]) {
  await saveFile('games.json', JSON.stringify(games, null, 2))
  await buildGameList(games)
}

async function buildGameList(games: any[]) {
  const lines = ['local Games = {']

  for (const game of games) {
    if (!game.placeId || !game.scriptLink) continue

    lines.push(
      `  [${game.placeId}] = "${game.scriptLink}", -- ${game.name}`
    )
  }

  lines.push('}')
  lines.push('')
  lines.push('return Games')

  await saveFile('GameList.lua', lines.join('\n'))
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json(await getGames())
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const games = await getGames()

  const newGame = {
    ...body,
    id: Date.now().toString(),
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  games.unshift(newGame)

  await saveGames(games)

  return Response.json(newGame)
}

export async function PUT(req: Request) {
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
}

export async function DELETE(req: Request) {
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
}
