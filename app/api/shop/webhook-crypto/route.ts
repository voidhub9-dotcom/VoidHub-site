import { createHmac, timingSafeEqual } from 'crypto'
import { loadShopProducts, saveShopProducts, loadShopOrders, saveShopOrders } from '@/lib/shop'
import { NOWPAYMENTS_IPN_SECRET } from '@/lib/nowpayments'
import { sendKeyDeliveryEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * NOWPayments signs IPN callbacks with HMAC-SHA512 over the JSON body with
 * its keys sorted alphabetically (not the raw body as received — the key
 * order has to be normalized first). Header: x-nowpayments-sig.
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */
function sortObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObject)
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = sortObject(obj[key])
        return acc
      }, {})
  }
  return obj
}

function verifySignature(payload: any, signature: string): boolean {
  const sorted = JSON.stringify(sortObject(payload))
  const expected = createHmac('sha512', NOWPAYMENTS_IPN_SECRET).update(sorted).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const givenBuf = Buffer.from(signature, 'hex')
  if (expectedBuf.length !== givenBuf.length) return false
  return timingSafeEqual(expectedBuf, givenBuf)
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-nowpayments-sig')
  const rawBody = await req.text()

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (!signature || !verifySignature(payload, signature)) {
    console.error('[shop webhook-crypto] signature verification failed')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // NOWPayments fires the IPN repeatedly as a payment moves through
  // waiting -> confirming -> confirmed -> sending -> finished (or
  // partially_paid / failed / expired / refunded). Only fulfill on
  // `finished` — the equivalent of Stripe's `checkout.session.completed`.
  const paymentStatus = payload?.payment_status
  const orderId = payload?.order_id

  if (paymentStatus !== 'finished') {
    return Response.json({ received: true })
  }
  if (!orderId) {
    console.error('[shop webhook-crypto] finished payment with no order_id')
    return Response.json({ received: true })
  }

  try {
    const orders = await loadShopOrders()
    const orderIndex = orders.findIndex(o => o.id === orderId)

    if (orderIndex === -1) {
      console.error('[shop webhook-crypto] no matching order for', orderId)
      return Response.json({ received: true })
    }

    // Already fulfilled — NOWPayments can resend the same IPN.
    if (orders[orderIndex].status !== 'pending') {
      return Response.json({ received: true })
    }

    const products = await loadShopProducts()
    const productIndex = products.findIndex(p => p.id === orders[orderIndex].productId)

    if (productIndex === -1) {
      orders[orderIndex] = { ...orders[orderIndex], status: 'paid_no_stock' }
      await saveShopOrders(orders)
      return Response.json({ received: true })
    }

    const product = products[productIndex]
    const qty = Math.min(orders[orderIndex].quantity, product.keys.length)
    const deliveredKeys = qty > 0 ? product.keys.slice(0, qty) : null

    if (deliveredKeys) {
      products[productIndex] = {
        ...product,
        keys: product.keys.slice(qty),
        soldCount: product.soldCount + qty,
        updatedAt: new Date().toISOString(),
      }
      await saveShopProducts(products)
    }

    let emailSent = false
    const recipientEmail = orders[orderIndex].customerEmail
    if (deliveredKeys && recipientEmail) {
      const emailResult = await sendKeyDeliveryEmail({
        to: recipientEmail,
        productName: product.name,
        durationLabel: product.durationLabel,
        keyValues: deliveredKeys,
        orderId,
      })
      emailSent = emailResult.ok
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      status: deliveredKeys ? 'fulfilled' : 'paid_no_stock',
      deliveredKeys,
      emailSent,
      fulfilledAt: deliveredKeys ? new Date().toISOString() : null,
    }
    await saveShopOrders(orders)

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('[shop webhook-crypto] fulfillment error:', error)
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
