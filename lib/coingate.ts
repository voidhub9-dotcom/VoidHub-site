import { createHmac, timingSafeEqual } from 'crypto'
import type { ShopOrder } from './shop'
import { r2Configured } from './r2'

export type CryptoEnvironment = 'sandbox' | 'live'
export function cryptoEnvironment(): CryptoEnvironment {
  return process.env.COINGATE_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
}

export function shopOrigin(): string {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || '')
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be the canonical HTTPS origin')
  }
  return url.origin
}

export function cryptoConfigured(): boolean {
  try {
    shopOrigin()
    return process.env.COINGATE_ENABLED === 'true' &&
      ['sandbox', 'live'].includes(process.env.COINGATE_ENVIRONMENT || '') &&
      Boolean(process.env.COINGATE_API_TOKEN?.trim()) &&
      (process.env.COINGATE_CALLBACK_SECRET?.length || 0) >= 32 &&
      Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== 'voidhub123') &&
      (r2Configured || process.env.NODE_ENV !== 'production')
  } catch { return false }
}

export function callbackToken(id: string, environment: CryptoEnvironment): string {
  const secret = process.env.COINGATE_CALLBACK_SECRET
  if (!secret || secret.length < 32) throw new Error('Crypto callback secret is not configured')
  return createHmac('sha256', secret).update(`${environment}:${id}`).digest('hex')
}

export function validCallbackToken(id: string, environment: CryptoEnvironment, supplied: unknown): boolean {
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)) return false
  return timingSafeEqual(Buffer.from(callbackToken(id, environment), 'hex'), Buffer.from(supplied, 'hex'))
}

export interface CoinGateOrder {
  id: number
  order_id: string
  status: string
  price_amount: string | number
  price_currency: string
  receive_currency: string
  payment_url?: string
}

export async function coinGateRequest(path: string, body?: Record<string, string>): Promise<CoinGateOrder> {
  if (!process.env.COINGATE_API_TOKEN) throw new Error('CoinGate is not configured')
  const host = cryptoEnvironment() === 'live' ? 'api.coingate.com' : 'api-sandbox.coingate.com'
  const response = await fetch(`https://${host}/v2${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Token ${process.env.COINGATE_API_TOKEN}`, Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(body ? { body: new URLSearchParams(body) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'error',
  })
  if (!response.ok) throw new Error(`CoinGate request failed (${response.status})`)
  return response.json()
}

export function validPaymentUrl(value: unknown, environment: CryptoEnvironment): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    const hosts = environment === 'live' ? ['coingate.com', 'pay.coingate.com'] : ['sandbox.coingate.com']
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.includes(url.hostname)
  } catch { return false }
}

export function verifyInvoice(order: ShopOrder, invoice: CoinGateOrder): void {
  const amount = Number(invoice.price_amount)
  if (!Number.isFinite(amount) || amount <= 0 ||
      Math.abs(amount * 100 - order.amountTotal) > 0.000001 ||
      invoice.price_currency?.toLowerCase() !== order.currency.toLowerCase() ||
      invoice.receive_currency?.toUpperCase() !== 'GBP' ||
      invoice.order_id !== order.id || String(invoice.id) !== order.providerOrderId) {
    throw new Error('Invoice does not match the stored order')
  }
}

export async function getVerifiedCryptoInvoice(order: ShopOrder): Promise<CoinGateOrder> {
  if (order.paymentProvider !== 'coingate' || !/^\d+$/.test(order.providerOrderId || '') ||
      order.cryptoEnvironment !== cryptoEnvironment()) throw new Error('Invalid crypto order or environment')
  const invoice = await coinGateRequest(`/orders/${order.providerOrderId}`)
  verifyInvoice(order, invoice)
  return invoice
}

export async function verifyCryptoPayment(order: ShopOrder): Promise<void> {
  if ((await getVerifiedCryptoInvoice(order)).status !== 'paid') throw new Error('Crypto payment is not confirmed')
}
