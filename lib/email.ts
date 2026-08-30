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

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDRESS = process.env.EMAIL_FROM || 'VoidHub <keys@voidon.top>'

export const emailConfigured = Boolean(RESEND_API_KEY)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildEmail(params: { productName: string; durationLabel: string; keyValue: string; orderId: string }) {
  const { productName, durationLabel, keyValue, orderId } = params
  const safeProduct = escapeHtml(productName)
  const safeDuration = escapeHtml(durationLabel)
  const safeKey = escapeHtml(keyValue)

  const html = `
<div style="background:#000;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:14px;overflow:hidden;">
    <div style="height:3px;background:linear-gradient(90deg,#a855f7,#00ffcc);"></div>
    <div style="padding:32px 28px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#707070;">VoidHub</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#fff;">Your key is ready</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#a0a0a0;">${safeProduct} &middot; ${safeDuration}</p>
      <div style="margin:16px 0;padding:16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;">
        <code style="font-family:'SF Mono',Consolas,monospace;font-size:15px;color:#ececec;word-break:break-all;">${safeKey}</code>
      </div>
      <p style="margin:0 0 24px;font-size:12px;color:#707070;">Save this key somewhere safe — you'll need it to run the loader.</p>
      <p style="margin:0;font-size:11px;color:#404040;">Order reference: ${escapeHtml(orderId)}</p>
    </div>
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:11px;color:#404040;text-align:center;">
    Didn't make this purchase? Ignore this email.
  </p>
</div>`.trim()

  const text = `Your VoidHub key is ready

${productName} · ${durationLabel}

Key: ${keyValue}

Save this key somewhere safe — you'll need it to run the loader.

Order reference: ${orderId}`

  return { html, text }
}

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
  keyValue: string
  orderId: string
}): Promise<EmailSendResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const { html, text } = buildEmail(params)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: `Your VoidHub key — ${params.productName}`,
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
