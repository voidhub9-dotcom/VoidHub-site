/**
 * Pure HTML/text renderer for the shop's key-delivery email. Zero I/O and
 * zero dependency on the KV/R2 storage layer, so it's safe to import from
 * client components too (used for the live preview in the admin email
 * template editor) without dragging the R2 S3 SDK into the browser bundle.
 */

export interface ShopEmailTemplate {
  subject: string
  heading: string
  introText: string
  footerNote: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Substitutes {product}, {duration}, {key}, {orderId} in admin-edited template text. */
function applyPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(product|duration|key|orderId)\}/g, (_, name) => vars[name] ?? '')
}

export function renderShopEmail(
  params: { productName: string; durationLabel: string; keyValues: string[]; orderId: string },
  template: ShopEmailTemplate,
) {
  const { productName, durationLabel, keyValues, orderId } = params
  const vars = { product: productName, duration: durationLabel, key: keyValues.join(', '), orderId }
  const subject = applyPlaceholders(template.subject, vars)
  const heading = applyPlaceholders(template.heading, vars)
  const intro = applyPlaceholders(template.introText, vars)
  const footer = applyPlaceholders(template.footerNote, vars)

  const safeProduct = escapeHtml(productName)
  const safeDuration = escapeHtml(durationLabel)
  const safeHeading = escapeHtml(heading)
  const safeIntro = escapeHtml(intro)
  const safeFooter = escapeHtml(footer)

  const keyBoxes = keyValues
    .map(
      k => `      <div style="margin:10px 0;padding:16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;">
        <code style="font-family:'SF Mono',Consolas,monospace;font-size:15px;color:#ececec;word-break:break-all;">${escapeHtml(k)}</code>
      </div>`,
    )
    .join('\n')

  const quantityLabel = keyValues.length > 1 ? `${keyValues.length} keys` : '1 key'

  const html = `
<div style="background:#000;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:14px;overflow:hidden;">
    <div style="height:3px;background:linear-gradient(90deg,#a855f7,#00ffcc);"></div>
    <div style="padding:32px 28px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#707070;">VoidHub</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#fff;">${safeHeading}</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#a0a0a0;">${safeProduct} &middot; ${safeDuration} &middot; ${quantityLabel}</p>
${keyBoxes}
      <p style="margin:16px 0 24px;font-size:12px;color:#707070;">${safeIntro}</p>
      <p style="margin:0;font-size:11px;color:#404040;">Order reference: ${escapeHtml(orderId)}</p>
    </div>
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:11px;color:#404040;text-align:center;">
    ${safeFooter}
  </p>
</div>`.trim()

  const text = `${heading}

${productName} · ${durationLabel} · ${quantityLabel}

${keyValues.map(k => `Key: ${k}`).join('\n')}

${intro}

Order reference: ${orderId}`

  return { subject, html, text }
}
