import Stripe from 'stripe'
import { loadShopOrders, saveShopOrders, loadShopProducts, saveShopProducts, releaseReservedKeys } from '@/lib/shop'
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

  // `checkout.session.expired` fires ~24h after an unpaid session is
  // created (Stripe's default expiry) — release its reserved keys back to
  // stock so an abandoned cart doesn't permanently shrink inventory.
  // Requires this event type to be enabled on the webhook endpoint in the
  // Stripe Dashboard alongside checkout.session.completed.
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    try {
      const orders = await loadShopOrders()
      const orderIndex = orders.findIndex(o => o.id === session.id)
      if (orderIndex !== -1 && orders[orderIndex].status === 'pending') {
        const order = orders[orderIndex]
        if (order.deliveredKeys?.length) {
          await releaseReservedKeys(order.productId, order.deliveredKeys)
        }
        orders[orderIndex] = { ...order, status: 'cancelled', deliveredKeys: null }
        await saveShopOrders(orders)
      }
    } catch (error) {
      console.error('[shop webhook] expiry release error:', error)
    }
    return Response.json({ received: true })
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  try {
    const orders = await loadShopOrders()
    const orderIndex = orders.findIndex(o => o.id === session.id)

    if (orderIndex === -1) {
      console.error('[shop webhook] no matching order for session', session.id)
      return Response.json({ received: true })
    }

    // Idempotency guard — Stripe retries webhook deliveries on timeout/5xx,
    // and without this a retry would re-run delivery for an order that's
    // already fulfilled. Keys are reserved at checkout time now, so a
    // second run here would just re-send the same email, but this also
    // protects the `paid_no_stock` legacy path below from double-touching
    // product stock.
    if (orders[orderIndex].status !== 'pending') {
      return Response.json({ received: true })
    }

    const order = orders[orderIndex]
    const products = await loadShopProducts()
    const product = products.find(p => p.id === order.productId)

    // Normal path: keys were already reserved onto the order at checkout
    // creation (see reserveKeysForOrder in checkout/route.ts) — just
    // confirm delivery, no further stock mutation needed.
    let deliveredKeys = order.deliveredKeys

    // Fallback for legacy orders created before reservation existed
    // (deliveredKeys empty at this point): fall back to the old
    // pop-from-current-stock behavior so old in-flight orders still work.
    if (!deliveredKeys?.length && product) {
      const requestedQty = order.quantity || Number(session.metadata?.quantity) || 1
      const qty = Math.min(requestedQty, product.keys.length)
      deliveredKeys = qty > 0 ? product.keys.slice(0, qty) : null
      if (deliveredKeys) {
        const productIndex = products.findIndex(p => p.id === product.id)
        products[productIndex] = {
          ...product,
          keys: product.keys.slice(qty),
          updatedAt: new Date().toISOString(),
        }
        await saveShopProducts(products)
      }
    }

    if (product && deliveredKeys?.length) {
      const productIndex = products.findIndex(p => p.id === product.id)
      products[productIndex] = {
        ...products[productIndex],
        soldCount: products[productIndex].soldCount + deliveredKeys.length,
        updatedAt: new Date().toISOString(),
      }
      await saveShopProducts(products)
    }

    // `presentment_details` isn't in this SDK version's types yet, but Stripe
    // includes it on the session when Adaptive Pricing converts the charge
    // to the buyer's local currency — surfaces what they actually paid.
    const presentment = (session as unknown as {
      presentment_details?: { presentment_amount?: number; presentment_currency?: string }
    }).presentment_details

    // Stripe's hosted checkout always collects an email for the receipt,
    // even if the buyer skipped our own optional email field.
    const recipientEmail = order.customerEmail || session.customer_details?.email || null

    let emailSent = false
    if (deliveredKeys?.length && recipientEmail && product) {
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
      ...order,
      customerEmail: recipientEmail,
      status: deliveredKeys?.length ? 'fulfilled' : 'paid_no_stock',
      deliveredKeys,
      emailSent,
      presentmentAmount: presentment?.presentment_amount ?? null,
      presentmentCurrency: presentment?.presentment_currency ?? null,
      fulfilledAt: deliveredKeys?.length ? new Date().toISOString() : null,
    }
    await saveShopOrders(orders)

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('[shop webhook] fulfillment error:', error)
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
