import { randomUUID } from 'crypto'
import { loadShopProducts, appendShopOrder, updateShopOrder, type ShopOrder } from '@/lib/shop'
import { callbackToken, coinGateRequest, cryptoConfigured, cryptoEnvironment, shopOrigin, validPaymentUrl, verifyInvoice } from '@/lib/coingate'
import { getClientIp, isRateLimited } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!cryptoConfigured()) return Response.json({ error: 'Crypto checkout is not available yet' }, { status: 503 })
  if (isRateLimited(`crypto:${getClientIp(req)}`, 8, 60000)) return Response.json({ error: 'Please wait before starting another checkout' }, { status: 429 })
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.productId !== 'string' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10 ||
        typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return Response.json({ error: 'Choose a quantity from 1 to 10 and enter a valid delivery email' }, { status: 400 })
    }
    const product = (await loadShopProducts()).find(p => p.id === body.productId && p.active)
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })
    if (product.keys.length < body.quantity) return Response.json({ error: 'Not enough stock' }, { status: 409 })
    if (!['gbp', 'usd', 'eur'].includes(product.currency.toLowerCase()) || !Number.isSafeInteger(product.priceCents) || product.priceCents <= 0 ||
        !Number.isSafeInteger(product.priceCents * body.quantity)) {
      return Response.json({ error: 'Crypto checkout is not available for this product' }, { status: 400 })
    }
    const environment = cryptoEnvironment()
    const id = `crypto_${randomUUID()}`
    const order: ShopOrder = {
      id, paymentProvider: 'coingate', cryptoEnvironment: environment, settlementCurrency: 'gbp',
      productId: product.id, productName: product.name, quantity: body.quantity,
      amountTotal: product.priceCents * body.quantity, currency: product.currency.toLowerCase(),
      customerEmail: body.email.trim(), status: 'pending', deliveredKeys: null,
      emailSent: false, presentmentAmount: null, presentmentCurrency: null,
      createdAt: new Date().toISOString(), fulfilledAt: null, isTest: environment === 'sandbox',
    }
    // Persist before creating an invoice; never send a customer to pay without a receipt record.
    await appendShopOrder(order)
    const origin = shopOrigin()
    const invoice = await coinGateRequest('/orders', {
      order_id: id, price_amount: (order.amountTotal / 100).toFixed(2), price_currency: order.currency.toUpperCase(),
      receive_currency: 'GBP', title: `VoidHub: ${product.name}`.slice(0, 150),
      description: `${body.quantity} x ${product.name}`.slice(0, 500),
      callback_url: `${origin}/api/shop/crypto/callback/${id}`, token: callbackToken(id, environment),
      success_url: `${origin}/shop/success?session_id=${id}`, cancel_url: `${origin}/shop/cancel`,
    })
    if (!Number.isSafeInteger(invoice.id) || invoice.id <= 0 || invoice.order_id !== id || !validPaymentUrl(invoice.payment_url, environment)) {
      throw new Error('Invalid checkout response')
    }
    verifyInvoice({ ...order, providerOrderId: String(invoice.id) }, invoice)
    await updateShopOrder(id, { providerOrderId: String(invoice.id) })
    return Response.json({ url: invoice.payment_url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Could not start crypto checkout. Please try again shortly.' }, { status: 502 })
  }
}
