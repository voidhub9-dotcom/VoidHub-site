import { loadShopOrders, mutateShopState } from '@/lib/shop'
import { fulfillShopOrder, paymentSnapshot } from '@/lib/shop-fulfillment'
import { verifyCryptoPayment } from '@/lib/coingate'
import { verifyStripePayment } from '@/lib/stripe-payment'

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

/** Verify the provider payment again before manually releasing real stock. */
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const order = (await loadShopOrders()).find(o => o.id === body.id)
    if (!order || order.isTest) return Response.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'fulfilled') return Response.json({ error: 'Already fulfilled' }, { status: 409 })
    if (order.paymentProvider === 'coingate') {
      await verifyCryptoPayment(order)
    } else {
      await verifyStripePayment(order, order.providerOrderId || order.id)
    }
    const result = await fulfillShopOrder(order.id, paymentSnapshot(order), true)
    if (result.order.status !== 'fulfilled') return Response.json({ error: 'Add enough stock to fulfill this order' }, { status: 409 })
    return Response.json({ success: true, deliveredKeys: result.order.deliveredKeys, partial: false,
      emailSent: result.order.emailSent, emailError: result.emailError })
  } catch {
    return Response.json({ error: 'Could not verify or fulfill order; please retry' }, { status: 502 })
  }
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
  const deletedCount = await mutateShopState(state => {
    const before = state.orders.length
    // Keep real payment records for reconciliation and callback replay safety.
    state.orders = state.orders.filter(o => !(idSet.has(o.id) && o.isTest))
    return before - state.orders.length
  })

  return Response.json({ success: true, deletedCount })
}
