import Stripe from 'stripe'
import { loadShopProducts, saveShopProducts, loadShopOrders, saveShopOrders } from '@/lib/shop'
import { stripeClient, stripeConfigured } from '@/lib/stripe'
import { sendKeyDeliveryEmail } from '@/lib/email'

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
    const requestedQty =
      orderIndex !== -1 ? orders[orderIndex].quantity : Number(session.metadata?.quantity) || 1
    const qty = Math.min(requestedQty, product.keys.length)
    const deliveredKeys = qty > 0 ? product.keys.slice(0, qty) : null

    if (deliveredKeys) {
      products[productIndex] = {
        ...product,
        keys: product.keys.slice(qty),
        soldCount: product.soldCount + qty,
        updatedAt: new Date().toISOString(),
      }
      await saveShopProducts(products)
    }

    if (orderIndex !== -1) {
      // `presentment_details` isn't in this SDK version's types yet, but Stripe
      // includes it on the session when Adaptive Pricing converts the charge
      // to the buyer's local currency — surfaces what they actually paid.
      const presentment = (session as unknown as {
        presentment_details?: { presentment_amount?: number; presentment_currency?: string }
      }).presentment_details

      // Stripe's hosted checkout always collects an email for the receipt,
      // even if the buyer skipped our own optional email field.
      const recipientEmail = orders[orderIndex].customerEmail || session.customer_details?.email || null

      let emailSent = false
      if (deliveredKeys && recipientEmail) {
        const emailResult = await sendKeyDeliveryEmail({
          to: recipientEmail,
          productName: product.name,
          durationLabel: product.durationLabel,
          keyValues: deliveredKeys,
          orderId: session.id,
        })
        emailSent = emailResult.ok
      }

      orders[orderIndex] = {
        ...orders[orderIndex],
        customerEmail: recipientEmail,
        status: deliveredKeys ? 'fulfilled' : 'paid_no_stock',
        deliveredKeys,
        emailSent,
        presentmentAmount: presentment?.presentment_amount ?? null,
        presentmentCurrency: presentment?.presentment_currency ?? null,
        fulfilledAt: deliveredKeys ? new Date().toISOString() : null,
      }
      await saveShopOrders(orders)
    }

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('[shop webhook] fulfillment error:', error)
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
