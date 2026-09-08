/**
 * NOWPayments integration for crypto checkout on the paid key shop.
 *
 * Non-custodial: NOWPayments generates a one-time deposit address per
 * invoice and settles straight to your own configured payout wallet — no
 * business registration required to sign up, individual accounts are fine.
 *
 * Keys are hardcoded here per request (closed-source private repo) rather
 * than read from environment variables.
 *
 * No SDK — the official one is outdated/unmaintained — plain fetch instead.
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */

const API_KEY = 'PKBH643-BT0M0D4-M56Y3BZ-9RX69EP'
export const NOWPAYMENTS_IPN_SECRET = '6TP//d6Su26dEHgtAbevp+XMc/nC1mmB'

const API_BASE = 'https://api.nowpayments.io/v1'

export const nowpaymentsConfigured = true
export const nowpaymentsIpnSecretConfigured = true

export interface NowPaymentsInvoice {
  id: string
  invoice_url: string
  order_id: string
  price_amount: string
  price_currency: string
}

export async function createNowPaymentsInvoice(params: {
  priceAmount: string
  priceCurrency: string
  orderId: string
  orderDescription?: string
  ipnCallbackUrl: string
  successUrl: string
  cancelUrl: string
}): Promise<NowPaymentsInvoice> {
  const res = await fetch(`${API_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ipn_callback_url: params.ipnCallbackUrl,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Failed to create NOWPayments invoice')
  }
  return data as NowPaymentsInvoice
}
