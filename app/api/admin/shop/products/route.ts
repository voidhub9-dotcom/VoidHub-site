import { loadShopProducts, saveShopProducts, type ShopProduct } from '@/lib/shop'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return Response.json(await loadShopProducts(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to load products' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const products = await loadShopProducts()

    const keysToAdd: string[] = Array.isArray(body.keysToAdd)
      ? body.keysToAdd.map((k: unknown) => String(k).trim()).filter(Boolean)
      : []

    const newProduct: ShopProduct = {
      id: Date.now().toString(),
      name: String(body.name || ''),
      description: String(body.description || ''),
      priceCents: Math.max(0, Math.round(Number(body.priceCents) || 0)),
      currency: String(body.currency || 'usd').toLowerCase(),
      durationLabel: String(body.durationLabel || ''),
      imageUrl: String(body.imageUrl || ''),
      category: String(body.category || ''),
      active: body.active !== false,
      keys: keysToAdd,
      soldCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    products.unshift(newProduct)
    await saveShopProducts(products)

    return Response.json(newProduct)
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to create product' },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 })
    }

    const products = await loadShopProducts()
    const index = products.findIndex(p => p.id === body.id)
    if (index === -1) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    const keysToAdd: string[] = Array.isArray(body.keysToAdd)
      ? body.keysToAdd.map((k: unknown) => String(k).trim()).filter(Boolean)
      : []

    const { keysToAdd: _omit, id: _id, ...updates } = body

    products[index] = {
      ...products[index],
      ...updates,
      keys: keysToAdd.length ? [...products[index].keys, ...keysToAdd] : products[index].keys,
      updatedAt: new Date().toISOString(),
    }

    await saveShopProducts(products)

    return Response.json(products[index])
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to update product' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 })
    }

    const products = await loadShopProducts()
    const filtered = products.filter(p => p.id !== body.id)
    await saveShopProducts(filtered)

    return Response.json({ success: true, deletedId: body.id })
  } catch (error: any) {
    console.error(error)
    return Response.json(
      { error: error?.message || 'Failed to delete product' },
      { status: 500 },
    )
  }
}
