import { loadShopProducts, appendShopOrder, resolveProductPrice, type ShopOrder } from '@/lib/shop'
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

    // Charge the same region-resolved price the buyer was shown on /shop —
    // both routes read the same x-vercel-ip-country header, so they agree.
    const countryCode = req.headers.get('x-vercel-ip-country')
    const price = resolveProductPrice(product, countryCode)

    const stripe = stripeClient()!
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get('origin') ||
      new URL(req.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: price.currency,
            unit_amount: price.priceCents,
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
          },
        },
      ],
      metadata: { productId: product.id, region: price.region || '' },
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
    })

    const order: ShopOrder = {
      id: session.id,
      productId: product.id,
      productName: product.name,
      amountTotal: price.priceCents,
      currency: price.currency,
      customerEmail: email || null,
      status: 'pending',
      deliveredKey: null,
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
