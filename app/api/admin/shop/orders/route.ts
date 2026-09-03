import { loadShopOrders, saveShopOrders, loadShopProducts, saveShopProducts } from '@/lib/shop'
import { sendKeyDeliveryEmail } from '@/lib/email'

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

/**
 * POST — manually fulfill an order that never got fulfilled automatically
 * (e.g. the Stripe webhook secret was wrong, or the webhook never fired).
 * The customer already paid via Stripe; this pops real stock keys and
 * delivers them exactly like the webhook would, then marks the order
 * `manuallyFulfilled` so it's clear it didn't go through Stripe's webhook.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = typeof (body as any)?.id === 'string' ? (body as any).id : ''
  if (!id) {
    return Response.json({ error: 'Order id required' }, { status: 400 })
  }

  const orders = await loadShopOrders()
  const orderIndex = orders.findIndex(o => o.id === id)
  if (orderIndex === -1) {
    return Response.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orders[orderIndex]
  if (order.status === 'fulfilled') {
    return Response.json({ error: 'This order is already fulfilled' }, { status: 409 })
  }

  const products = await loadShopProducts()
  const productIndex = products.findIndex(p => p.id === order.productId)
  if (productIndex === -1) {
    return Response.json({ error: 'The product for this order no longer exists' }, { status: 404 })
  }

  const product = products[productIndex]
  const qty = Math.min(order.quantity, product.keys.length)
  if (qty < 1) {
    return Response.json({ error: 'No stock left to deliver — add more keys to this product first' }, { status: 409 })
  }

  const deliveredKeys = product.keys.slice(0, qty)
  products[productIndex] = {
    ...product,
    keys: product.keys.slice(qty),
    soldCount: product.soldCount + qty,
    updatedAt: new Date().toISOString(),
  }
  await saveShopProducts(products)

  let emailSent = false
  let emailError: string | undefined
  if (order.customerEmail) {
    const emailResult = await sendKeyDeliveryEmail({
      to: order.customerEmail,
      productName: order.productName,
      durationLabel: product.durationLabel,
      keyValues: deliveredKeys,
      orderId: order.id,
    })
    emailSent = emailResult.ok
    emailError = emailResult.error
  }

  orders[orderIndex] = {
    ...order,
    status: 'fulfilled',
    deliveredKeys,
    emailSent,
    manuallyFulfilled: true,
    fulfilledAt: new Date().toISOString(),
  }
  await saveShopOrders(orders)

  return Response.json({
    success: true,
    deliveredKeys,
    partial: qty < order.quantity,
    emailSent,
    emailError,
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
