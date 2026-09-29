import { SHOP_ENABLED, loadShopProducts } from '@/lib/shop'

export const dynamic = 'force-dynamic'

export async function GET() {
  const products = SHOP_ENABLED ? await loadShopProducts() : []

  const publicProducts = products
    .filter(p => p.active)
    .map(({ keys, ...rest }) => ({ ...rest, stock: keys.length }))

  return Response.json(publicProducts, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
