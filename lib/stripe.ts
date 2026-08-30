import Stripe from 'stripe'

/**
 * Stripe integration for the paid key shop.
 *
 * Required environment variables (Vercel → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *
 * If these are not present the app degrades gracefully: API routes that need
 * Stripe return a clear "not configured" error instead of throwing.
 */

const SECRET_KEY = process.env.STRIPE_SECRET_KEY

export const stripeConfigured = Boolean(SECRET_KEY)
export const webhookSecretConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET)

let _client: Stripe | null = null

export function stripeClient(): Stripe | null {
  if (!SECRET_KEY) return null
  if (_client) return _client
  _client = new Stripe(SECRET_KEY)
  return _client
}
