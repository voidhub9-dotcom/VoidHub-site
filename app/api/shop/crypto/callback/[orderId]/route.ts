import { loadShopOrders, mutateShopState } from '@/lib/shop'
import { validCallbackToken, getVerifiedCryptoInvoice } from '@/lib/coingate'
import { fulfillShopOrder, paymentSnapshot } from '@/lib/shop-fulfillment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    if (!/^crypto_[a-f0-9-]{36}$/.test(orderId)) return Response.json({ error: 'Invalid receipt' }, { status: 400 })
    const raw = await req.text()
    if (raw.length > 65536) return Response.json({ error: 'Payload too large' }, { status: 413 })
    const body = req.headers.get('content-type')?.includes('application/json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw))
    const order = (await loadShopOrders()).find(o => o.id === orderId && o.paymentProvider === 'coingate')
    if (!order || !order.cryptoEnvironment || !validCallbackToken(orderId, order.cryptoEnvironment, body.token)) {
      return Response.json({ error: 'Invalid callback' }, { status: 401 })
    }
    // Ignore the callback's claimed status/amount. Read the authenticated invoice ourselves.
    const invoice = await getVerifiedCryptoInvoice(order)
    if (invoice.status === 'paid') {
      if (order.cryptoEnvironment === 'sandbox') {
        // Sandbox callbacks never consume real inventory or send real delivery emails.
        await mutateShopState(state => {
          const current = state.orders.find(o => o.id === orderId)!
          if (current.status !== 'pending') return
          current.paymentVerified = true
          current.status = 'fulfilled'
          current.deliveredKeys = Array.from({ length: current.quantity }, (_, i) => `TEST-CRYPTO-${orderId.slice(-8)}-${i + 1}`)
          current.fulfilledAt = new Date().toISOString()
        })
      } else {
        await fulfillShopOrder(orderId, paymentSnapshot(order))
      }
    } else if (['expired', 'invalid', 'canceled', 'refunded'].includes(invoice.status)) {
      await mutateShopState(state => {
        const current = state.orders.find(o => o.id === orderId)!
        if (current.status === 'pending' || invoice.status === 'refunded') {
          current.status = invoice.status as 'expired' | 'invalid' | 'canceled' | 'refunded'
        }
      })
    }
    return Response.json({ received: true })
  } catch {
    return Response.json({ error: 'Could not verify payment; retry notification' }, { status: 503 })
  }
}
