import { randomUUID } from 'crypto'
import { loadShopProducts, appendShopOrder, reserveKeysForOrder, releaseReservedKeys, type ShopOrder } from '@/lib/shop'
import { createNowPaymentsInvoice } from '@/lib/nowpayments'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const productId = String(body.productId || '')
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : undefined
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(body.quantity)) || 1))

    if (!productId) {
      return Response.json({ error: 'Product ID required' }, { status: 400 })
    }
    if (!email) {
      // NOWPayments' hosted invoice page doesn't collect an email the way
      // Stripe Checkout does, and there's no session id to poll our own
      // success page with until the redirect happens — email is the
      // reliable fallback if the buyer closes the tab. Require it.
      return Response.json({ error: 'Email is required for crypto payments' }, { status: 400 })
    }

    const products = await loadShopProducts()
    const product = products.find(p => p.id === productId)

    if (!product || !product.active) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }
    if (product.keys.length < 1) {
      return Response.json({ error: 'This product is sold out' }, { status: 409 })
    }
    if (product.keys.length < quantity) {
      return Response.json({ error: `Only ${product.keys.length} left in stock` }, { status: 409 })
    }

    // Reserve the keys NOW, atomically. Crypto confirmations can take
    // several minutes, which is a much wider window for two buyers to
    // collide on the same last few keys than Stripe's few-second gap — so
    // this matters even more here than on the card path.
    const reservedKeys = await reserveKeysForOrder(product.id, quantity)
    if (!reservedKeys) {
      return Response.json({ error: 'Someone just bought the last of this stock — refresh and try again' }, { status: 409 })
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get('origin') ||
      new URL(req.url).origin

    const amountTotal = product.priceCents * quantity
    const amountDecimal = (amountTotal / 100).toFixed(2)

    // Our own order id, threaded through as NOWPayments' order_id — the IPN
    // webhook echoes it back, so we can match on it directly instead of
    // NOWPayments' internal payment id.
    const orderId = randomUUID()

    let invoice
    try {
      invoice = await createNowPaymentsInvoice({
        priceAmount: amountDecimal,
        priceCurrency: product.currency,
        orderId,
        orderDescription: product.name,
        ipnCallbackUrl: `${origin}/api/shop/webhook-crypto`,
        successUrl: `${origin}/shop/success?order_id=${orderId}`,
        cancelUrl: `${origin}/shop/cancel`,
      })
    } catch (invoiceError) {
      // Invoice creation failed after we already took the keys — give them back.
      await releaseReservedKeys(product.id, reservedKeys)
      throw invoiceError
    }

    const order: ShopOrder = {
      id: orderId,
      paymentMethod: 'crypto',
      productId: product.id,
      productName: product.name,
      quantity,
      amountTotal,
      currency: product.currency,
      presentmentAmount: null,
      presentmentCurrency: null,
      customerEmail: email,
      status: 'pending',
      // Already reserved above — the webhook just confirms + emails these,
      // it never touches product stock again.
      deliveredKeys: reservedKeys,
      emailSent: false,
      createdAt: new Date().toISOString(),
      fulfilledAt: null,
    }
    await appendShopOrder(order)

    return Response.json({ url: invoice.invoice_url })
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to start crypto checkout' },
      { status: 500 },
    )
  }
}
