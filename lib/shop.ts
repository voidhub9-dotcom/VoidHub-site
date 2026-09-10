import { kvGet, kvSet, KV_KEYS } from './kv'
import type { ShopEmailTemplate } from './shop-email-render'

export type { ShopEmailTemplate }

/**
 * Paid key shop — Stripe Checkout / Coinbase Commerce products with an
 * admin-managed stock of keys. Separate from the free ad-gated `/getkey`
 * flow in `key-page.ts`. Stored as JSON blobs in KV, same pattern as
 * `key-page.ts` / `site-links.ts`.
 */

export interface ShopProduct {
  id: string
  name: string
  description: string
  /** Price in the smallest currency unit (cents for USD) — your settlement currency */
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

export type ShopOrderStatus = 'pending' | 'fulfilled' | 'paid_no_stock' | 'cancelled'
export type ShopPaymentMethod = 'card' | 'crypto'

export interface ShopOrder {
  /** Stripe Checkout Session id, or our own generated order id for crypto orders */
  id: string
  /** Which processor this order was paid through. Defaults to 'card' for pre-crypto orders. */
  paymentMethod: ShopPaymentMethod
  productId: string
  productName: string
  /** How many keys this order is for. Defaults to 1 for pre-quantity orders. */
  quantity: number
  /** Amount charged in YOUR settlement currency (what you actually receive) — the FULL order total, not per-key */
  amountTotal: number
  currency: string
  /**
   * What the buyer actually paid, if Stripe Adaptive Pricing converted it to
   * their local currency at checkout (from the webhook's `presentment_details`).
   * Null when the buyer paid in your settlement currency, or Adaptive Pricing
   * isn't enabled on the Stripe account. Always null for crypto orders.
   */
  presentmentAmount: number | null
  presentmentCurrency: string | null
  customerEmail: string | null
  status: ShopOrderStatus
  /**
   * Keys reserved for this order. Populated at CHECKOUT CREATION time (not
   * webhook time) so two buyers can never be sold the same key — see
   * `reserveKeysForOrder`. `fulfilled` orders have already emailed these;
   * `pending` orders are holding them until payment confirms; `cancelled`
   * orders have released them back to stock and cleared this to null.
   */
  deliveredKeys: string[] | null
  /** Whether the key-delivery email (backup to the on-page reveal) was sent successfully. */
  emailSent: boolean
  /** True for admin-triggered test orders (no real payment, no stock consumed) — excluded from revenue/sales stats. */
  isTest?: boolean
  /** True when an admin manually fulfilled a stuck order (e.g. webhook never fired) instead of Stripe's webhook. */
  manuallyFulfilled?: boolean
  createdAt: string
  fulfilledAt: string | null
}

const MAX_ORDERS = 500

/**
 * Normalizes a raw stored order into the current shape — backfills
 * `quantity` (didn't exist pre-quantity-feature), `deliveredKeys` (was a
 * single `deliveredKey` string), and `paymentMethod` (didn't exist
 * pre-crypto — every pre-existing order was paid by card) so old records
 * still render correctly instead of breaking on the new fields.
 */
function normalizeOrder(raw: any): ShopOrder {
  return {
    id: raw.id,
    paymentMethod: raw.paymentMethod === 'crypto' ? 'crypto' : 'card',
    productId: raw.productId,
    productName: raw.productName,
    quantity: typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1,
    amountTotal: raw.amountTotal,
    currency: raw.currency,
    presentmentAmount: raw.presentmentAmount ?? null,
    presentmentCurrency: raw.presentmentCurrency ?? null,
    customerEmail: raw.customerEmail ?? null,
    status: raw.status,
    deliveredKeys: Array.isArray(raw.deliveredKeys)
      ? raw.deliveredKeys
      : (typeof raw.deliveredKey === 'string' && raw.deliveredKey ? [raw.deliveredKey] : null),
    emailSent: !!raw.emailSent,
    isTest: !!raw.isTest,
    manuallyFulfilled: !!raw.manuallyFulfilled,
    createdAt: raw.createdAt,
    fulfilledAt: raw.fulfilledAt ?? null,
  }
}

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
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : []
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

/**
 * Atomically reserves `quantity` keys for a brand-new order — call this
 * during checkout SESSION/INVOICE CREATION, not in the webhook. This is
 * what actually prevents overselling: two buyers checking out for the same
 * scarce product can no longer both pass a "is there enough stock" check
 * and then both get told by their webhook that stock is there. Whoever
 * calls this first takes the keys out of the pool immediately; the second
 * caller sees the now-smaller pool and fails honestly at checkout time
 * instead of after being charged.
 *
 * Returns the reserved keys, or null if there isn't enough stock — caller
 * should refuse to create the checkout session/invoice in that case.
 */
export async function reserveKeysForOrder(productId: string, quantity: number): Promise<string[] | null> {
  const products = await loadShopProducts()
  const productIndex = products.findIndex(p => p.id === productId)
  if (productIndex === -1) return null

  const product = products[productIndex]
  if (!product.active || product.keys.length < quantity) return null

  const reserved = product.keys.slice(0, quantity)
  products[productIndex] = {
    ...product,
    keys: product.keys.slice(quantity),
    updatedAt: new Date().toISOString(),
  }
  await saveShopProducts(products)
  return reserved
}

/**
 * Releases previously-reserved keys back to a product's stock — call this
 * when a pending order's payment expires, fails, or is cancelled, so
 * abandoned checkouts don't permanently shrink the stock pool. Safe to call
 * even if the product was deleted in the meantime (silently no-ops).
 */
export async function releaseReservedKeys(productId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const products = await loadShopProducts()
  const productIndex = products.findIndex(p => p.id === productId)
  if (productIndex === -1) return

  const product = products[productIndex]
  products[productIndex] = {
    ...product,
    keys: [...keys, ...product.keys],
    updatedAt: new Date().toISOString(),
  }
  await saveShopProducts(products)
}

/**
 * Admin-editable copy for the key-delivery email (lib/email.ts). The overall
 * HTML shell (logo header, key box, gradient accent) stays fixed — only the
 * text is editable, same pattern as the free key-page's title/subtitle/
 * instructions/footer. Supports {product}, {duration}, {key}, {orderId}
 * placeholders, substituted at send time. Type lives in
 * shop-email-render.ts so it can be imported client-side too.
 */
export const DEFAULT_SHOP_EMAIL_TEMPLATE: ShopEmailTemplate = {
  subject: 'Your VoidHub key is ready — {product}',
  heading: 'Your key is ready',
  introText: "Keep this key private and save it somewhere safe. You'll need it to use VoidHub.",
  footerNote: "You received this because a VoidHub key was purchased. If this wasn't you, you can safely ignore this email.",
}

export async function loadShopEmailTemplate(): Promise<ShopEmailTemplate> {
  try {
    const raw = await kvGet(KV_KEYS.SHOP_EMAIL_TEMPLATE)
    if (!raw) return DEFAULT_SHOP_EMAIL_TEMPLATE
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SHOP_EMAIL_TEMPLATE, ...parsed }
  } catch {
    return DEFAULT_SHOP_EMAIL_TEMPLATE
  }
}

export async function saveShopEmailTemplate(template: ShopEmailTemplate): Promise<void> {
  await kvSet(KV_KEYS.SHOP_EMAIL_TEMPLATE, JSON.stringify(template))
}
