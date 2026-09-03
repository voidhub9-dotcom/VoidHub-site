/**
 * Transactional email for the shop — sends a copy of the delivered key to
 * the buyer's inbox as a backup to the on-page reveal on `/shop/success`.
 *
 * Uses the Resend HTTP API directly (no SDK dependency, same
 * gated/no-op-until-configured shape as `lib/stripe.ts` / `lib/r2.ts`).
 *
 * Required environment variable (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY
 * Optional:
 *   EMAIL_FROM — sender address, must be on a domain verified in Resend.
 *                Defaults to "VoidHub <keys@voidon.top>".
 *
 * If RESEND_API_KEY is not set, sendKeyDeliveryEmail() is a no-op that
 * returns false — the on-page key reveal keeps working either way.
 */

import { loadShopEmailTemplate } from './shop'
import { renderShopEmail } from './shop-email-render'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDRESS = process.env.EMAIL_FROM || 'VoidHub <keys@voidon.top>'

export const emailConfigured = Boolean(RESEND_API_KEY)

export interface EmailSendResult {
  ok: boolean
  /** Human-readable failure reason — surfaced to the admin test-delivery UI for debugging. */
  error?: string
}

/**
 * Sends the delivered key to the buyer's email. Never throws — returns
 * { ok: false, error } on any failure (missing config, network error,
 * non-2xx response) so a delivery email issue never blocks Stripe webhook
 * fulfillment. The error string is for admin debugging (surfaced in the
 * test-delivery UI) — never shown to buyers, since the on-page key reveal
 * is the primary delivery path either way.
 */
export async function sendKeyDeliveryEmail(params: {
  to: string
  productName: string
  durationLabel: string
  keyValues: string[]
  orderId: string
}): Promise<EmailSendResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const template = await loadShopEmailTemplate()
    const { subject, html, text } = renderShopEmail(params, template)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      let message = bodyText
      try {
        const parsed = JSON.parse(bodyText)
        message = parsed?.message || bodyText
      } catch {
        // not JSON — use raw text
      }
      console.error('[email] Resend send failed:', res.status, bodyText)
      return { ok: false, error: `Resend ${res.status}: ${message || 'request failed'}` }
    }
    return { ok: true }
  } catch (error: any) {
    console.error('[email] send error:', error)
    return { ok: false, error: error?.message || 'Network error reaching Resend' }
  }
}
