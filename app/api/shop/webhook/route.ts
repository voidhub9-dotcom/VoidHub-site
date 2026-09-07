import Stripe from 'stripe'
import { stripeClient, stripeConfigured } from '@/lib/stripe'
import { fulfillShopOrder } from '@/lib/shop-fulfillment'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeConfigured || !secret) return Response.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
  let event: Stripe.Event
  try {
    event = stripeClient()!.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') || '', secret)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return Response.json({ received: true })
  }
  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return Response.json({ received: true })
  try {
    const presentment = (session as unknown as {
      presentment_details?: { presentment_amount?: number; presentment_currency?: string }
    }).presentment_details
    await fulfillShopOrder(session.id, {
      amountTotal: session.amount_total ?? -1, currency: session.currency || '',
      customerEmail: session.customer_details?.email,
      presentmentAmount: presentment?.presentment_amount, presentmentCurrency: presentment?.presentment_currency,
    })
    return Response.json({ received: true })
  } catch {
    return Response.json({ error: 'Fulfillment failed; retry notification' }, { status: 500 })
  }
}
