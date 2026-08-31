import { loadShopOrders, saveShopOrders } from '@/lib/shop'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json(await loadShopOrders(), {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}

/** DELETE — remove one or more orders by id, e.g. clearing out test orders. */
export async function DELETE(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray((body as any)?.ids) ? (body as any).ids.filter((id: unknown) => typeof id === 'string') : []
  if (ids.length === 0) {
    return Response.json({ error: 'No order ids provided' }, { status: 400 })
  }

  const idSet = new Set(ids)
  const orders = await loadShopOrders()
  const remaining = orders.filter(o => !idSet.has(o.id))
  const deletedCount = orders.length - remaining.length
  await saveShopOrders(remaining)

  return Response.json({ success: true, deletedCount })
}
