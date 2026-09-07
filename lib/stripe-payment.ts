import Stripe from 'stripe'
import type { ShopOrder } from './shop'
import { stripeClient, stripeConfigured } from './stripe'

export interface VerifiedStripePayment {
  amountTotal: number
  currency: string
  customerEmail: string | null
  presentmentAmount: number | null
  presentmentCurrency: string | null
}

function receiptId(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.receiptId || null
}

/**
 * Reads the Checkout Session directly from Stripe. This is used by the
 * success-page recovery route and by manual fulfillment; webhook payloads are
 * verified separately by Stripe's signature verification.
 */
export async function verifyStripePayment(
  order: ShopOrder,
  sessionId: string,
): Promise<VerifiedStripePayment> {
  if (!stripeConfigured || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw new Error('Invalid Stripe payment reference')
  }

  const session = await stripeClient()!.checkout.sessions.retrieve(sessionId)
  const linked =
    order.id === session.id || // Pre-migration order: the session ID was the receipt ID.
    (receiptId(session) === order.id && (!order.providerOrderId || order.providerOrderId === session.id))

  if (!linked || session.mode !== 'payment' || session.payment_status !== 'paid' ||
      session.amount_total == null || !session.currency) {
    throw new Error('Stripe payment is not verified')
  }

  const presentment = (session as unknown as {
    presentment_details?: { presentment_amount?: number; presentment_currency?: string }
  }).presentment_details

  return {
    amountTotal: session.amount_total,
    currency: session.currency,
    customerEmail: session.customer_details?.email || order.customerEmail || null,
    presentmentAmount: presentment?.presentment_amount ?? null,
    presentmentCurrency: presentment?.presentment_currency ?? null,
  }
}

export function getStripeOrderId(session: Stripe.Checkout.Session): string | null {
  return receiptId(session) || session.id || null
}
