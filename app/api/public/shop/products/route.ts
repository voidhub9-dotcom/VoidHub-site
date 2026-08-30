import { loadShopProducts, resolveProductPrice } from '@/lib/shop'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const products = await loadShopProducts()
  const countryCode = req.headers.get('x-vercel-ip-country')

  const publicProducts = products
    .filter(p => p.active)
    .map(({ keys, regionalPricing, ...rest }) => {
      const resolved = resolveProductPrice({ priceCents: rest.priceCents, currency: rest.currency, regionalPricing }, countryCode)
      return {
        ...rest,
        priceCents: resolved.priceCents,
        currency: resolved.currency,
        region: resolved.region,
        stock: keys.length,
      }
    })

  return Response.json(publicProducts, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
