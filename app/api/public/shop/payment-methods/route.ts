import { cryptoConfigured, cryptoEnvironment } from '@/lib/coingate'
import { stripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export async function GET() {
  return Response.json({ stripe: stripeConfigured, crypto: cryptoConfigured(), cryptoSandbox: cryptoEnvironment() === 'sandbox' },
    { headers: { 'Cache-Control': 'no-store' } })
}
