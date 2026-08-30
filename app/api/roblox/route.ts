export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Accept both ?gameId= (from modal) and ?placeId= for compatibility
  const placeId = (searchParams.get('gameId') || searchParams.get('placeId'))?.trim()

  if (!placeId || isNaN(Number(placeId))) {
    return Response.json({ error: 'Invalid place ID' }, { status: 400 })
  }

  try {
    // Step 1: Get universeId from placeId
    const universeRes = await fetch(
      `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
      { headers: { 'User-Agent': 'VoidHub/1.0' }, cache: 'no-store' }
    )
    if (!universeRes.ok) throw new Error('Could not get universe ID — check the place ID is correct')
    const { universeId } = await universeRes.json()
    if (!universeId) throw new Error('No universe ID returned')

    // Step 2: Fetch game info + thumbnail in parallel
    const [infoRes, thumbRes] = await Promise.all([
      fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
        headers: { 'User-Agent': 'VoidHub/1.0' },
        cache: 'no-store',
      }),
      fetch(
        `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
        { headers: { 'User-Agent': 'VoidHub/1.0' }, cache: 'no-store' }
      ),
    ])

    const infoData  = infoRes.ok  ? await infoRes.json()  : {}
    const thumbData = thumbRes.ok ? await thumbRes.json() : {}
    const gameInfo  = infoData?.data?.[0]
    const thumbnail = thumbData?.data?.[0]?.imageUrl ?? ''

    if (!gameInfo) throw new Error('Game not found — make sure the place ID is correct')

    return Response.json({
      name:        gameInfo.name        ?? '',
      description: (gameInfo.description ?? '').replace(/\n+/g, ' ').trim().slice(0, 150),
      thumbnail,
      universeId,
      placeId,
      robloxUrl: `https://www.roblox.com/games/${placeId}`,
    })
  } catch (err: any) {
    return Response.json(
      { error: err.message ?? 'Failed to fetch game info' },
      { status: 502 }
    )
  }
}
