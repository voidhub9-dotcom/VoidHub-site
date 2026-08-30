import { kvGet, kvSet, KV_KEYS } from './kv'

/**
 * Paid key shop — Stripe Checkout products with an admin-managed stock of
 * keys. Separate from the free ad-gated `/getkey` flow in `key-page.ts`.
 * Stored as JSON blobs in KV, same pattern as `key-page.ts` / `site-links.ts`.
 */

export interface ShopProduct {
  id: string
  name: string
  description: string
  /** Price in the smallest currency unit (cents for USD) */
  priceCents: number
  /** Lowercase ISO currency code, e.g. "usd" */
  currency: string
  /** e.g. "24 Hours", "30 Days", "Lifetime" */
  durationLabel: string
  imageUrl: string
  category: string
  active: boolean
  /** Unused key stock — one is popped per fulfilled order. Stock = keys.length */
  keys: string[]
  soldCount: number
  createdAt: string
  updatedAt: string
}

export type ShopOrderStatus = 'pending' | 'fulfilled' | 'paid_no_stock'

export interface ShopOrder {
  /** Stripe Checkout Session id */
  id: string
  productId: string
  productName: string
  amountTotal: number
  currency: string
  customerEmail: string | null
  status: ShopOrderStatus
  deliveredKey: string | null
  createdAt: string
  fulfilledAt: string | null
}

const MAX_ORDERS = 500

export async function loadShopProducts(): Promise<ShopProduct[]> {
  try {
    const raw = await kvGet(KV_KEYS.SHOP_PRODUCTS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveShopProducts(products: ShopProduct[]): Promise<void> {
  await kvSet(KV_KEYS.SHOP_PRODUCTS, JSON.stringify(products))
}

export async function loadShopOrders(): Promise<ShopOrder[]> {
  try {
    const raw = await kvGet(KV_KEYS.SHOP_ORDERS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveShopOrders(orders: ShopOrder[]): Promise<void> {
  await kvSet(KV_KEYS.SHOP_ORDERS, JSON.stringify(orders.slice(0, MAX_ORDERS)))
}

export async function appendShopOrder(order: ShopOrder): Promise<void> {
  const orders = await loadShopOrders()
  orders.unshift(order)
  await saveShopOrders(orders)
}

export async function updateShopOrder(
  id: string,
  updates: Partial<ShopOrder>,
): Promise<ShopOrder | null> {
  const orders = await loadShopOrders()
  const index = orders.findIndex(o => o.id === id)
  if (index === -1) return null
  orders[index] = { ...orders[index], ...updates }
  await saveShopOrders(orders)
  return orders[index]
}
