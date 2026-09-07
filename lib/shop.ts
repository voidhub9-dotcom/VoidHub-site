import { kvGet, kvSet, KV_KEYS } from './kv'
import { r2ReadVersioned, r2CompareAndSwap, r2Configured } from './r2'
import type { ShopEmailTemplate } from './shop-email-render'

export type { ShopEmailTemplate }

/**
 * Paid key shop — Stripe and CoinGate products with an admin-managed stock of
 * keys. Separate from the free ad-gated `/getkey` flow in `key-page.ts`.
 * Inventory and orders share one versioned R2 object for atomic fulfillment.
 */

export interface ShopProduct {
  id: string
  name: string
  description: string
  /** Price in the smallest currency unit (pence for GBP, cents for USD/EUR) */
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

export type ShopOrderStatus = 'pending' | 'fulfilled' | 'paid_no_stock' | 'expired' | 'invalid' | 'canceled' | 'refunded'

export interface ShopOrder {
  /** Unpredictable public receipt ID (never the sequential CoinGate invoice ID). */
  id: string
  paymentProvider?: 'stripe' | 'coingate'
  providerOrderId?: string
  cryptoEnvironment?: 'sandbox' | 'live'
  paymentVerified?: boolean
  settlementCurrency?: string
  productId: string
  productName: string
  /** How many keys this order is for. Defaults to 1 for pre-quantity orders. */
  quantity: number
  /** Invoice total in the product currency, in minor units. Before processor fees/conversion; not the net GBP payout. */
  amountTotal: number
  currency: string
  /**
   * What the buyer actually paid, if Stripe Adaptive Pricing converted it to
   * their local currency at checkout (from the webhook's `presentment_details`).
   * Null when the buyer paid in your settlement currency, or Adaptive Pricing
   * isn't enabled on the Stripe account.
   */
  presentmentAmount: number | null
  presentmentCurrency: string | null
  customerEmail: string | null
  status: ShopOrderStatus
  /** One entry per key delivered. May be shorter than `quantity` if stock ran out mid-fulfillment. */
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


/**
 * Normalizes a raw stored order into the current shape — backfills
 * `quantity` (didn't exist pre-quantity-feature) and `deliveredKeys`
 * (was a single `deliveredKey` string) so old records still render
 * correctly instead of breaking on the new fields.
 */
function normalizeOrder(raw: any): ShopOrder {
  return {
    id: raw.id,
    paymentProvider: raw.paymentProvider || 'stripe',
    providerOrderId: raw.providerOrderId,
    cryptoEnvironment: raw.cryptoEnvironment,
    paymentVerified: !!raw.paymentVerified,
    settlementCurrency: raw.settlementCurrency,
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

export interface ShopState { products: ShopProduct[]; orders: ShopOrder[] }
const SHOP_STATE_KEY = 'kv/voidhub__shop_state_v2.json'

async function readShopState() {
  const current = await r2ReadVersioned(SHOP_STATE_KEY)
  if (current.text !== null) {
    const state = JSON.parse(current.text) as ShopState
    if (!Array.isArray(state.products) || !Array.isArray(state.orders)) throw new Error('Invalid shop state')
    state.orders = state.orders.map(normalizeOrder)
    return { state, etag: current.etag }
  }
  // Import legacy data once, without deleting the original backup objects.
  const [products, orders] = await Promise.all([
    r2ReadVersioned('kv/voidhub__shop_products.txt'),
    r2ReadVersioned('kv/voidhub__shop_orders.txt'),
  ])
  const state: ShopState = {
    products: products.text === null ? [] : JSON.parse(products.text),
    orders: orders.text === null ? [] : JSON.parse(orders.text),
  }
  if (!Array.isArray(state.products) || !Array.isArray(state.orders)) throw new Error('Invalid legacy shop state')
  state.orders = state.orders.map(normalizeOrder)
  return { state, etag: null }
}

/** Callback can be retried: do not send emails or call payment providers inside it. */
export async function mutateShopState<T>(mutate: (state: ShopState) => T): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const { state, etag } = await readShopState()
    const result = mutate(state)
    if (await r2CompareAndSwap(SHOP_STATE_KEY, JSON.stringify(state), etag)) return result
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40))
  }
  throw new Error('Shop is busy; please retry')
}

export async function loadShopProducts(): Promise<ShopProduct[]> {
  if (!r2Configured && process.env.NODE_ENV === 'production') return []
  return (await readShopState()).state.products
}

export async function loadShopOrders(): Promise<ShopOrder[]> {
  if (!r2Configured && process.env.NODE_ENV === 'production') return []
  return (await readShopState()).state.orders
}

export async function appendShopOrder(order: ShopOrder): Promise<void> {
  await mutateShopState(state => {
    if (!state.orders.some(existing => existing.id === order.id)) state.orders.unshift(order)
  })
}

export async function updateShopOrder(id: string, updates: Partial<ShopOrder>): Promise<ShopOrder | null> {
  return mutateShopState(state => {
    const order = state.orders.find(order => order.id === id)
    if (!order) return null
    Object.assign(order, updates)
    return order
  })
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
  subject: 'Your VoidHub key — {product}',
  heading: 'Your key is ready',
  introText: "Save this key somewhere safe — you'll need it to run the loader.",
  footerNote: "Didn't make this purchase? Ignore this email.",
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
