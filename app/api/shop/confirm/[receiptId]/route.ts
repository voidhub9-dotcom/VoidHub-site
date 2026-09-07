import { loadShopOrders } from '@/lib/shop'
import { fulfillShopOrder } from '@/lib/shop-fulfillment'
import { verifyStripePayment } from '@/lib/stripe-payment'
import { getClientIp, isRateLimited } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * A reliable recovery path for a buyer who returns from Stripe before a
 * webhook arrives. It always reads the Checkout Session from Stripe; browser
 * input never decides whether an order is paid.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { receiptId } = await params
  if (!receiptId || receiptId.length > 255) return Response.json({ error: 'Invalid receipt' }, { status: 400 })
  if (isRateLimited(`stripe-confirm:${receiptId}:${getClientIp(req)}`, 24, 60_000)) {
    return Response.json({ error: 'Please wait before checking again' }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => null)
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const order = (await loadShopOrders()).find(order =>
      order.id === receiptId && (order.paymentProvider === 'stripe' || !order.paymentProvider),
    )
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

    const payment = await verifyStripePayment(order, sessionId)
    const result = await fulfillShopOrder(order.id, payment)
    return Response.json({ status: result.order.status, emailSent: result.order.emailSent }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    // A pending session is normal while Stripe finalizes some methods. Do not
    // reveal payment-provider details to the browser.
    return Response.json({ error: 'Payment is still being confirmed' }, { status: 409 })
  }
}
