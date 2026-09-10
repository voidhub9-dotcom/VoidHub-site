/**
 * Transactional email for the shop — sends a copy of the delivered key to
 * the buyer's inbox as a backup to the on-page reveal on `/shop/success`.
 *
 * Uses the published Resend template directly (no SDK dependency, same
 * gated/no-op-until-configured shape as `lib/stripe.ts` / `lib/r2.ts`).
 *
 * Required environment variable (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY
 * Optional:
 *   EMAIL_FROM — sender address on a domain verified in Resend.
 *                Defaults to "VoidHub <keys@voidon.top>".
 *   RESEND_KEY_DELIVERY_TEMPLATE — published Resend template ID or alias.
 *                Defaults to "voidhub-key-delivery".
 *
 * If RESEND_API_KEY is not set, sendKeyDeliveryEmail() is a no-op that
 * returns false — the on-page key reveal keeps working either way.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDRESS = process.env.EMAIL_FROM?.trim() || 'VoidHub <keys@voidon.top>'
const KEY_DELIVERY_TEMPLATE = process.env.RESEND_KEY_DELIVERY_TEMPLATE?.trim() || 'voidhub-key-delivery'

export const emailConfigured = Boolean(RESEND_API_KEY)

export interface EmailSendResult {
  ok: boolean
  /** Human-readable failure reason — surfaced to the admin test-delivery UI for debugging. */
  error?: string
  id?: string
}

async function postToResend(body: Record<string, unknown>): Promise<EmailSendResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const bodyText = await res.text().catch(() => '')
    let parsed: any = null
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null
    } catch {
      // not JSON
    }
    if (!res.ok) {
      console.error('[email] Resend send failed:', res.status, bodyText)
      return { ok: false, error: `Resend ${res.status}: ${parsed?.message || bodyText || 'request failed'}` }
    }
    return { ok: true, id: parsed?.id }
  } catch (error: any) {
    console.error('[email] send error:', error)
    return { ok: false, error: error?.message || 'Network error reaching Resend' }
  }
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
  return postToResend({
    from: FROM_ADDRESS,
    to: params.to,
    headers: { 'Idempotency-Key': `voidhub-key-delivery-${params.orderId}` },
    template: {
      id: KEY_DELIVERY_TEMPLATE,
      variables: {
        product: params.productName,
        duration: params.durationLabel,
        key: params.keyValues.join('\n'),
        orderId: params.orderId,
      },
    },
  })
}

/**
 * Sends a free-form email to any recipient — used by the admin "Send Email"
 * panel (`/admin/email`) for one-off manual sends (support replies, ad-hoc
 * notices) outside the automated key-delivery flow. Plain text is wrapped
 * in <pre> so line breaks survive; pass `html` directly for anything richer.
 */
export async function sendCustomEmail(params: {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}): Promise<EmailSendResult> {
  const html = params.html || (params.text ? `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(params.text)}</pre>` : undefined)
  if (!html) return { ok: false, error: 'Email body is empty' }

  return postToResend({
    from: params.from?.trim() || FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html,
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
