import { NextResponse } from 'next/server'
import { stripeClient, stripeConfigured, webhookSecretConfigured } from '@/lib/stripe'
import { emailConfigured } from '@/lib/email'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

/**
 * GET /api/admin/stripe-status
 * Verifies STRIPE_SECRET_KEY actually works with a real API round-trip
 * (balance.retrieve is a free, read-only call) instead of just checking
 * the env var is present — same idea as /api/admin/health for R2.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripeConfigured) {
    return NextResponse.json({
      configured: false,
      webhookConfigured: false,
      emailConfigured,
      ok: false,
      testMode: null,
      message: 'STRIPE_SECRET_KEY is not set.',
    })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || ''
  const testMode = secretKey.startsWith('sk_test_')

  let ok = false
  let message = ''
  try {
    const stripe = stripeClient()!
    await stripe.balance.retrieve()
    ok = true
    message = webhookSecretConfigured
      ? `Stripe connected (${testMode ? 'test' : 'live'} mode).`
      : `Stripe key works, but STRIPE_WEBHOOK_SECRET is missing — orders won't be fulfilled after payment.`
  } catch (err: any) {
    ok = false
    message = err?.message || 'Stripe rejected the secret key.'
  }

  return NextResponse.json({
    configured: true,
    webhookConfigured: webhookSecretConfigured,
    emailConfigured,
    ok,
    testMode,
    message,
  })
}
