import { loadShopProducts, appendShopOrder, reserveKeysForOrder, releaseReservedKeys, type ShopOrder } from '@/lib/shop'
import { stripeClient, stripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (!stripeConfigured) {
      return Response.json(
        { error: 'The shop is not accepting card payments yet — Stripe is not configured.' },
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

    // Reserve the keys NOW, atomically — not when the webhook later confirms
    // payment. This is what stops two buyers checking out for the last few
    // keys of a product from both being told "yes, stock's here" and then
    // one of them getting shorted after paying. Whoever reserves first wins;
    // the loser sees a smaller pool and fails honestly before paying.
    const reservedKeys = await reserveKeysForOrder(product.id, quantity)
    if (!reservedKeys) {
      return Response.json({ error: 'Someone just bought the last of this stock — refresh and try again' }, { status: 409 })
    }

    const stripe = stripeClient()!
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get('origin') ||
      new URL(req.url).origin

    let session
    try {
      // Always create the session in your settlement currency. If Adaptive
      // Pricing is enabled in the Stripe Dashboard (Settings > Adaptive
      // Pricing), Stripe automatically detects the buyer's location and
      // localizes the displayed price + payment methods on its hosted
      // checkout page — no per-region logic needed on our end.
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
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
        metadata: { productId: product.id, quantity: String(quantity) },
        success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/shop/cancel`,
      })
    } catch (stripeError) {
      // Session creation failed after we already took the keys out of the
      // pool — give them back before bubbling the error up.
      await releaseReservedKeys(product.id, reservedKeys)
      throw stripeError
    }

    const order: ShopOrder = {
      id: session.id,
      paymentMethod: 'card',
      productId: product.id,
      productName: product.name,
      quantity,
      amountTotal: product.priceCents * quantity,
      currency: product.currency,
      presentmentAmount: null,
      presentmentCurrency: null,
      customerEmail: email || null,
      status: 'pending',
      // Already reserved above — the webhook just confirms + emails these,
      // it never touches product stock again.
      deliveredKeys: reservedKeys,
      emailSent: false,
      createdAt: new Date().toISOString(),
      fulfilledAt: null,
    }
    await appendShopOrder(order)

    return Response.json({ url: session.url })
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to start checkout' },
      { status: 500 },
    )
  }
}
