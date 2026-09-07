import { loadShopOrders } from '@/lib/shop'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const orders = await loadShopOrders()
  const order = orders.find(o => o.id === sessionId)

  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 })
  }

  return Response.json({
    status: order.status,
    isTest: !!order.isTest,
    paymentProvider: order.paymentProvider || 'stripe',
    productName: order.productName,
    quantity: order.quantity,
    deliveredKeys: order.status === 'fulfilled' ? order.deliveredKeys : null,
    emailSent: order.emailSent,
  }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}
