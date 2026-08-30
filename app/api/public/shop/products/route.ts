import { loadShopProducts } from '@/lib/shop'

export const dynamic = 'force-dynamic'

export async function GET() {
  const products = await loadShopProducts()

  const publicProducts = products
    .filter(p => p.active)
    .map(({ keys, ...rest }) => ({ ...rest, stock: keys.length }))

  return Response.json(publicProducts, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
    },
  })
}
