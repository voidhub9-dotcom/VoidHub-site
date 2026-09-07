import { randomUUID } from 'crypto'
import { loadShopProducts, appendShopOrder, updateShopOrder, type ShopOrder } from '@/lib/shop'
import { stripeClient, stripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (!stripeConfigured) {
      return Response.json(
        { error: 'The shop is not accepting payments yet — Stripe is not configured.' },
        { status: 503 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const productId = String(body.productId || '')
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : undefined
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(body.quantity)) || 1))

    if (!productId) {
      return Response.json({ error: 'Product ID required' }, { status: 400 })
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

    const receiptId = `stripe_${randomUUID()}`
    const order: ShopOrder = {
      id: receiptId,
      paymentProvider: 'stripe',
      productId: product.id,
      productName: product.name,
      quantity,
      amountTotal: product.priceCents * quantity,
      currency: product.currency,
      presentmentAmount: null,
      presentmentCurrency: null,
      customerEmail: email || null,
      status: 'pending',
      deliveredKeys: null,
      emailSent: false,
      createdAt: new Date().toISOString(),
      fulfilledAt: null,
    }
    // Save the receipt first. A payment must never exist without a durable
    // record that can be fulfilled by the webhook or the success-page fallback.
    await appendShopOrder(order)

    const stripe = stripeClient()!
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get('origin') ||
      new URL(req.url).origin

    // Always create the session in your settlement currency. If Adaptive
    // Pricing is enabled in the Stripe Dashboard (Settings > Adaptive
    // Pricing), Stripe automatically detects the buyer's location and
    // localizes the displayed price + payment methods on its hosted
    // checkout page — no per-region logic needed on our end.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity,
          price_data: {
            currency: product.currency,
            unit_amount: product.priceCents,
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
          },
        },
      ],
      client_reference_id: receiptId,
      metadata: { receiptId, productId: product.id, quantity: String(quantity) },
      success_url: `${origin}/shop/success?receipt_id=${receiptId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
    })

    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    await updateShopOrder(receiptId, { providerOrderId: session.id })

    return Response.json({ url: session.url })
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to start checkout' },
      { status: 500 },
    )
  }
}
