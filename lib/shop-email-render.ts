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
      k => `      <div style="margin:10px 0;padding:15px 16px;background:#080808;border:1px solid #303030;border-radius:10px;">
        <code style="font-family:Menlo,Consolas,'SFMono-Regular',monospace;font-size:14px;line-height:22px;color:#ffffff;word-break:break-all;">${escapeHtml(k)}</code>
      </div>`,
    )
    .join('\n')

  const quantityLabel = keyValues.length > 1 ? `${keyValues.length} keys` : '1 key'

  const html = `
<div style="margin:0;padding:36px 16px;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
  <div style="max-width:560px;margin:0 auto;background:#101010;border:1px solid #292929;border-radius:18px;overflow:hidden;">
    <div style="height:3px;background:#d9d9d9;"></div>
    <div style="padding:30px 30px 8px;text-align:center;">
      <img src="https://www.voidon.top/voidhub-logo.png" width="66" height="66" alt="VoidHub" style="display:block;width:66px;height:66px;margin:0 auto 14px;border:0;outline:none;text-decoration:none;" />
      <p style="margin:0;font-size:12px;line-height:18px;letter-spacing:3px;font-weight:700;text-transform:uppercase;color:#cfcfcf;">VOID HUB</p>
    </div>
    <div style="padding:16px 30px 30px;">
      <h1 style="margin:0 0 10px;font-size:24px;line-height:31px;letter-spacing:-0.4px;color:#ffffff;text-align:center;">${safeHeading}</h1>
      <p style="margin:0 0 24px;font-size:13px;line-height:21px;color:#a6a6a6;text-align:center;">Your ${safeProduct} &middot; ${safeDuration} &middot; ${quantityLabel}</p>
      <div style="margin:0 0 10px;padding:10px 12px;background:#181818;border-radius:8px;font-size:10px;letter-spacing:1.6px;font-weight:700;text-transform:uppercase;color:#9e9e9e;">Your license key${keyValues.length > 1 ? 's' : ''}</div>
${keyBoxes}
      <p style="margin:22px 0 24px;font-size:13px;line-height:21px;color:#b5b5b5;">${safeIntro}</p>
      <div style="padding-top:18px;border-top:1px solid #282828;">
        <p style="margin:0;font-size:11px;line-height:17px;color:#6f6f6f;">Order reference: ${escapeHtml(orderId)}</p>
      </div>
    </div>
  </div>
  <p style="max-width:520px;margin:18px auto 0;font-size:11px;line-height:17px;color:#6f6f6f;text-align:center;">
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
