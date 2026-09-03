import { loadShopProducts, appendShopOrder, type ShopOrder } from '@/lib/shop'
import { sendKeyDeliveryEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

/**
 * POST /api/admin/shop/test-order
 *
 * Lets an admin verify the delivery pipeline (order record -> email ->
 * success page) without touching Stripe at all — no test/live key swap
 * needed. Generates a synthetic key and a synthetic order id, and never
 * reads or writes the product's real `keys` stock or `soldCount`, so it
 * can't affect real inventory or revenue numbers. The resulting order is
 * flagged `isTest: true` so it's excluded from dashboard/shop stats and
 * shown with a badge in the orders list.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const productId = typeof (body as any)?.productId === 'string' ? (body as any).productId : ''
  const email = typeof (body as any)?.email === 'string' && (body as any).email.trim() ? (body as any).email.trim() : null
  const quantity = Math.max(1, Math.min(10, Math.floor(Number((body as any)?.quantity)) || 1))

  if (!productId) {
    return Response.json({ error: 'Product ID required' }, { status: 400 })
  }

  const products = await loadShopProducts()
  const product = products.find(p => p.id === productId)
  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }

  const testKeys = Array.from(
    { length: quantity },
    (_, i) => `TEST-${Date.now().toString(36).toUpperCase()}-${(i + 1)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  )
  const orderId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  let emailSent = false
  let emailError: string | undefined
  if (email) {
    const emailResult = await sendKeyDeliveryEmail({
      to: email,
      productName: product.name,
      durationLabel: product.durationLabel,
      keyValues: testKeys,
      orderId,
    })
    emailSent = emailResult.ok
    emailError = emailResult.error
  }

  const now = new Date().toISOString()
  const order: ShopOrder = {
    id: orderId,
    productId: product.id,
    productName: product.name,
    quantity,
    amountTotal: 0,
    currency: product.currency,
    presentmentAmount: null,
    presentmentCurrency: null,
    customerEmail: email,
    status: 'fulfilled',
    deliveredKeys: testKeys,
    emailSent,
    isTest: true,
    createdAt: now,
    fulfilledAt: now,
  }
  await appendShopOrder(order)

  return Response.json({ sessionId: orderId, deliveredKeys: testKeys, emailSent, emailError })
}
