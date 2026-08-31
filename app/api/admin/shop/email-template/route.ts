import { loadShopEmailTemplate, saveShopEmailTemplate, DEFAULT_SHOP_EMAIL_TEMPLATE, type ShopEmailTemplate } from '@/lib/shop'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await loadShopEmailTemplate())
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const clean = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : fallback)
  const template: ShopEmailTemplate = {
    subject: clean((body as any)?.subject, DEFAULT_SHOP_EMAIL_TEMPLATE.subject),
    heading: clean((body as any)?.heading, DEFAULT_SHOP_EMAIL_TEMPLATE.heading),
    introText: clean((body as any)?.introText, DEFAULT_SHOP_EMAIL_TEMPLATE.introText),
    footerNote: clean((body as any)?.footerNote, DEFAULT_SHOP_EMAIL_TEMPLATE.footerNote),
  }

  await saveShopEmailTemplate(template)

  return Response.json({ success: true, template })
}
