import { mutateShopState, updateShopOrder, type ShopOrder } from './shop'
import { sendKeyDeliveryEmail } from './email'

/** Atomically records payment and removes stock. Duplicate callbacks never consume more keys. */
export async function fulfillShopOrder(
  id: string,
  payment: { amountTotal: number; currency: string; customerEmail?: string | null; presentmentAmount?: number | null; presentmentCurrency?: string | null },
  manuallyFulfilled = false,
) {
  const result = await mutateShopState(state => {
    const order = state.orders.find(o => o.id === id)
    if (!order) throw new Error('Order not found; retry notification later')
    if (order.amountTotal !== payment.amountTotal || order.currency.toLowerCase() !== payment.currency.toLowerCase()) {
      throw new Error('Payment amount or currency does not match order')
    }
    if (order.status === 'refunded') return { order, durationLabel: '', newlyDelivered: false }
    if (order.status === 'fulfilled' || (order.status === 'paid_no_stock' && !manuallyFulfilled)) {
      return { order, durationLabel: '', newlyDelivered: false }
    }
    order.paymentVerified = true
    order.customerEmail ||= payment.customerEmail || null
    order.presentmentAmount = payment.presentmentAmount ?? null
    order.presentmentCurrency = payment.presentmentCurrency ?? null
    const product = state.products.find(p => p.id === order.productId)
    // All-or-nothing delivery: an admin can fulfill the order after restocking.
    if (!product || product.keys.length < order.quantity) {
      order.status = 'paid_no_stock'
      return { order, durationLabel: '', newlyDelivered: false }
    }
    order.deliveredKeys = product.keys.splice(0, order.quantity)
    product.soldCount += order.quantity
    product.updatedAt = new Date().toISOString()
    order.status = 'fulfilled'
    order.fulfilledAt = product.updatedAt
    order.manuallyFulfilled = manuallyFulfilled
    return { order, durationLabel: product.durationLabel, newlyDelivered: true }
  })
  let emailError: string | undefined
  if (result.newlyDelivered && result.order.customerEmail && result.order.deliveredKeys) {
    const email = await sendKeyDeliveryEmail({
      to: result.order.customerEmail, productName: result.order.productName,
      durationLabel: result.durationLabel, keyValues: result.order.deliveredKeys, orderId: id,
    })
    emailError = email.error
    if (email.ok) {
      await updateShopOrder(id, { emailSent: true })
      result.order.emailSent = true
    }
  }
  return { order: result.order, emailError }
}

export function paymentSnapshot(order: ShopOrder) {
  return { amountTotal: order.amountTotal, currency: order.currency }
}
