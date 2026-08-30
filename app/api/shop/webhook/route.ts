import Stripe from 'stripe'
import { loadShopProducts, saveShopProducts, loadShopOrders, saveShopOrders } from '@/lib/shop'
import { stripeClient, stripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!stripeConfigured) {
    return Response.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret is not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    const stripe = stripeClient()!
    event = stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret)
  } catch (err: any) {
    console.error('[shop webhook] signature verification failed:', err?.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const productId = session.metadata?.productId

  try {
    const orders = await loadShopOrders()
    const orderIndex = orders.findIndex(o => o.id === session.id)

    const products = await loadShopProducts()
    const productIndex = products.findIndex(p => p.id === productId)

    if (productIndex === -1) {
      if (orderIndex !== -1) {
        orders[orderIndex] = { ...orders[orderIndex], status: 'paid_no_stock' }
        await saveShopOrders(orders)
      }
      return Response.json({ received: true })
    }

    const product = products[productIndex]
    const deliveredKey = product.keys.length > 0 ? product.keys[0] : null

    if (deliveredKey) {
      products[productIndex] = {
        ...product,
        keys: product.keys.slice(1),
        soldCount: product.soldCount + 1,
        updatedAt: new Date().toISOString(),
      }
      await saveShopProducts(products)
    }

    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        status: deliveredKey ? 'fulfilled' : 'paid_no_stock',
        deliveredKey,
        fulfilledAt: deliveredKey ? new Date().toISOString() : null,
      }
      await saveShopOrders(orders)
    }

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('[shop webhook] fulfillment error:', error)
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
