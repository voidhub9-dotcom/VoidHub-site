import { createHmac, timingSafeEqual } from 'crypto'
import { loadShopOrders, saveShopOrders, loadShopProducts, saveShopProducts, releaseReservedKeys } from '@/lib/shop'
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

  const paymentStatus = payload?.payment_status
  const orderId = payload?.order_id

  if (!orderId) {
    console.error('[shop webhook-crypto] IPN with no order_id', paymentStatus)
    return Response.json({ received: true })
  }

  try {
    const orders = await loadShopOrders()
    const orderIndex = orders.findIndex(o => o.id === orderId)

    if (orderIndex === -1) {
      console.error('[shop webhook-crypto] no matching order for', orderId)
      return Response.json({ received: true })
    }

    // Idempotency guard — NOWPayments can resend the same IPN, and this
    // also means only one terminal state ever gets applied to an order.
    if (orders[orderIndex].status !== 'pending') {
      return Response.json({ received: true })
    }

    // `failed` / `expired` — payment never completed. Release the keys
    // reserved at checkout-crypto time back to stock instead of leaving
    // them stranded off an abandoned invoice.
    if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      const order = orders[orderIndex]
      if (order.deliveredKeys?.length) {
        await releaseReservedKeys(order.productId, order.deliveredKeys)
      }
      orders[orderIndex] = { ...order, status: 'cancelled', deliveredKeys: null }
      await saveShopOrders(orders)
      return Response.json({ received: true })
    }

    // Only fulfill on `finished` — every other status (waiting, confirming,
    // confirmed, sending, partially_paid) is still in progress.
    if (paymentStatus !== 'finished') {
      return Response.json({ received: true })
    }

    const order = orders[orderIndex]
    const products = await loadShopProducts()
    const product = products.find(p => p.id === order.productId)

    // Normal path: keys were already reserved onto the order at
    // checkout-crypto creation time — just confirm + email, no further
    // stock mutation. Fallback below only covers legacy pre-reservation orders.
    let deliveredKeys = order.deliveredKeys
    if (!deliveredKeys?.length && product) {
      const qty = Math.min(order.quantity, product.keys.length)
      deliveredKeys = qty > 0 ? product.keys.slice(0, qty) : null
      if (deliveredKeys) {
        const productIndex = products.findIndex(p => p.id === product.id)
        products[productIndex] = {
          ...product,
          keys: product.keys.slice(qty),
          updatedAt: new Date().toISOString(),
        }
        await saveShopProducts(products)
      }
    }

    if (product && deliveredKeys?.length) {
      const productIndex = products.findIndex(p => p.id === product.id)
      products[productIndex] = {
        ...products[productIndex],
        soldCount: products[productIndex].soldCount + deliveredKeys.length,
        updatedAt: new Date().toISOString(),
      }
      await saveShopProducts(products)
    }

    let emailSent = false
    const recipientEmail = order.customerEmail
    if (deliveredKeys?.length && recipientEmail && product) {
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
      ...order,
      status: deliveredKeys?.length ? 'fulfilled' : 'paid_no_stock',
      deliveredKeys,
      emailSent,
      fulfilledAt: deliveredKeys?.length ? new Date().toISOString() : null,
    }
    await saveShopOrders(orders)

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('[shop webhook-crypto] fulfillment error:', error)
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
