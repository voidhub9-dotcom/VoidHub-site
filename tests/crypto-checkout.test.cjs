const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const originalCwd = process.cwd()
const temporary = fs.mkdtempSync(path.join(root, '.crypto-test-'))
process.chdir(temporary)
process.env.NODE_ENV = 'test'
process.env.COINGATE_ENABLED = 'true'
process.env.COINGATE_ENVIRONMENT = 'live'
process.env.COINGATE_API_TOKEN = 'test-token-only'
process.env.COINGATE_CALLBACK_SECRET = 'test-only-secret-abcdefghijklmnopqrstuvwxyz'
process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
process.env.ADMIN_PASSWORD = 'test-admin-only'
for (const key of ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']) delete process.env[key]
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename)
let emails = 0
let stripeSession = null
let stripeEvent = null
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  if (request === './email' || request === path.join(root, 'lib/email')) return { sendKeyDeliveryEmail: async () => { emails++; return { ok: true } } }
  if (request === path.join(root, 'lib/stripe')) return {
    stripeConfigured: true,
    stripeClient: () => ({ checkout: { sessions: { retrieve: async () => stripeSession } }, webhooks: { constructEvent: () => stripeEvent } }),
  }
  return originalLoad.call(this, request, parent, isMain)
}
const shop = require('../lib/shop.ts')
const crypto = require('../lib/coingate.ts')
const { fulfillShopOrder } = require('../lib/shop-fulfillment.ts')
const checkout = require('../app/api/shop/crypto/checkout/route.ts')
const callback = require('../app/api/shop/crypto/callback/[orderId]/route.ts')
const stripeWebhook = require('../app/api/shop/webhook/route.ts')
const adminOrders = require('../app/api/admin/shop/orders/route.ts')
const publicOrder = require('../app/api/shop/order/[sessionId]/route.ts')
const receipt = 'crypto_11111111-1111-4111-8111-111111111111'
const product = () => ({ id: 'p1', name: 'Test product', priceCents: 1250, currency: 'gbp', active: true,
  keys: ['KEY-A', 'KEY-B'], soldCount: 0, durationLabel: '30 days', description: 'Test', imageUrl: '', category: '', createdAt: '', updatedAt: '' })
const order = (id = receipt) => ({ id, paymentProvider: 'coingate', providerOrderId: '123', cryptoEnvironment: 'live',
  productId: 'p1', productName: 'Test product', quantity: 1, amountTotal: 1250, currency: 'gbp', status: 'pending',
  customerEmail: 'buyer@example.test', deliveredKeys: null, emailSent: false, createdAt: '', fulfilledAt: null })
const invoice = () => ({ id: 123, order_id: receipt, status: 'paid', price_amount: '12.50', price_currency: 'GBP', receive_currency: 'GBP' })
function notification(token = crypto.callbackToken(receipt, crypto.cryptoEnvironment()), extra = {}) {
  return new Request('https://example.test/callback', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, status: 'paid', ...extra }) })
}
const params = { params: Promise.resolve({ orderId: receipt }) }
beforeEach(async () => {
  fs.rmSync(path.join(temporary, '.local-r2'), { recursive: true, force: true })
  emails = 0
  process.env.COINGATE_ENVIRONMENT = 'live'
  process.env.COINGATE_ENABLED = 'true'
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook'
  global.fetch = async () => Response.json(invoice())
  await shop.mutateShopState(state => { state.products = [product()]; state.orders = [order()] })
})
after(() => { process.chdir(originalCwd); fs.rmSync(temporary, { recursive: true, force: true }) })

test('forged callback token cannot read invoice or deliver keys', async () => {
  global.fetch = async () => { throw new Error('Must not contact provider') }
  assert.equal((await callback.POST(notification('0'.repeat(64)), params)).status, 401)
  assert.equal((await shop.loadShopProducts())[0].keys.length, 2)
  assert.equal(emails, 0)
})
test('callback claims are ignored; only provider paid status releases keys', async () => {
  global.fetch = async () => Response.json({ ...invoice(), status: 'pending' })
  assert.equal((await callback.POST(notification(), params)).status, 200)
  assert.equal((await shop.loadShopOrders())[0].status, 'pending')
  global.fetch = async () => Response.json(invoice())
  assert.equal((await callback.POST(notification(), params)).status, 200)
  assert.deepEqual((await shop.loadShopOrders())[0].deliveredKeys, ['KEY-A'])
  assert.equal(emails, 1)
})
test('amount, currency, merchant ID, provider ID and settlement mismatches fail closed', async () => {
  for (const wrong of [{ price_amount: '0.01' }, { price_currency: 'USD' }, { order_id: 'other' }, { id: 999 }, { receive_currency: 'BTC' }]) {
    global.fetch = async () => Response.json({ ...invoice(), ...wrong })
    assert.equal((await callback.POST(notification(), params)).status, 503)
  }
  assert.equal((await shop.loadShopProducts())[0].keys.length, 2)
})
test('concurrent duplicate callbacks consume stock and email only once', async () => {
  const responses = await Promise.all(Array.from({ length: 6 }, () => callback.POST(notification(), params)))
  assert.ok(responses.every(r => r.status === 200))
  assert.deepEqual((await shop.loadShopProducts())[0].keys, ['KEY-B'])
  assert.equal(emails, 1)
})
test('two simultaneous orders cannot receive the same key', async () => {
  await shop.appendShopOrder({ ...order('crypto_other'), providerOrderId: '124' })
  await Promise.all([receipt, 'crypto_other'].map(id => fulfillShopOrder(id, { amountTotal: 1250, currency: 'gbp' })))
  const keys = (await shop.loadShopOrders()).flatMap(o => o.deliveredKeys || [])
  assert.equal(new Set(keys).size, 2)
  assert.equal((await shop.loadShopProducts())[0].keys.length, 0)
})
test('insufficient stock preserves all keys and records paid_no_stock', async () => {
  await shop.updateShopOrder(receipt, { quantity: 3 })
  await callback.POST(notification(), params)
  assert.equal((await shop.loadShopOrders())[0].status, 'paid_no_stock')
  assert.equal((await shop.loadShopProducts())[0].keys.length, 2)
})
test('sandbox payment delivers synthetic keys, without stock or emails', async () => {
  process.env.COINGATE_ENVIRONMENT = 'sandbox'
  await shop.updateShopOrder(receipt, { cryptoEnvironment: 'sandbox', isTest: true })
  await callback.POST(notification(), params)
  assert.match((await shop.loadShopOrders())[0].deliveredKeys[0], /^TEST-CRYPTO-/)
  assert.equal((await shop.loadShopProducts())[0].keys.length, 2)
  assert.equal(emails, 0)
})
test('expired invoices and refunded receipts do not expose keys', async () => {
  global.fetch = async () => Response.json({ ...invoice(), status: 'expired' })
  await callback.POST(notification(), params)
  assert.equal((await shop.loadShopOrders())[0].status, 'expired')
  global.fetch = async () => Response.json(invoice())
  await callback.POST(notification(), params)
  global.fetch = async () => Response.json({ ...invoice(), status: 'refunded' })
  await callback.POST(notification(), params)
  const res = await publicOrder.GET(new Request('https://example.test'), { params: Promise.resolve({ sessionId: receipt }) })
  assert.equal((await res.json()).deliveredKeys, null)
})
test('checkout uses server prices, GBP settlement and an unpredictable receipt', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.coingate.com/v2/orders')
    const body = new URLSearchParams(options.body)
    assert.equal(body.get('price_amount'), '25.00')
    assert.equal(body.get('receive_currency'), 'GBP')
    assert.match(body.get('order_id'), /^crypto_[a-f0-9-]{36}$/)
    assert.ok((await shop.loadShopOrders()).some(o => o.id === body.get('order_id')))
    return Response.json({ ...invoice(), price_amount: '25.00', id: 555, order_id: body.get('order_id'), payment_url: 'https://coingate.com/invoice/test' })
  }
  const res = await checkout.POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({
    productId: 'p1', quantity: 2, email: 'buyer@example.test', price_amount: 1, receive_currency: 'BTC',
  }) }))
  assert.equal(res.status, 200)
  const created = (await shop.loadShopOrders()).find(o => o.providerOrderId === '555')
  assert.equal(created.amountTotal, 2500)
  assert.equal(created.settlementCurrency, 'gbp')
})
test('checkout rejects invalid quantities, missing email and unconfigured service', async () => {
  for (const body of [{ quantity: 0, email: 'x@y.test' }, { quantity: 1.5, email: 'x@y.test' }, { quantity: 1, email: '' }]) {
    assert.equal((await checkout.POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ productId: 'p1', ...body }) }))).status, 400)
  }
  process.env.COINGATE_ENABLED = 'false'
  assert.equal((await checkout.POST(new Request('https://example.test', { method: 'POST' }))).status, 503)
})
test('payment redirects reject foreign hosts, insecure URLs and credentials', () => {
  for (const url of ['https://evil.test', 'https://coingate.com.evil.test', 'http://coingate.com', 'https://u:p@coingate.com', 'javascript:alert(1)']) {
    assert.equal(crypto.validPaymentUrl(url, 'live'), false)
  }
  assert.equal(crypto.validPaymentUrl('https://sandbox.coingate.com/invoice/test', 'sandbox'), true)
})
test('unpaid Stripe completion cannot consume stock', async () => {
  stripeEvent = { type: 'checkout.session.completed', data: { object: { id: receipt, payment_status: 'unpaid' } } }
  const res = await stripeWebhook.POST(new Request('https://example.test', { method: 'POST', body: '{}' }))
  assert.equal(res.status, 200)
  assert.equal((await shop.loadShopProducts())[0].keys.length, 2)
})
test('manual fulfillment verifies crypto payment and retains real records on delete', async () => {
  global.fetch = async () => Response.json({ ...invoice(), status: 'pending' })
  const req = () => new Request('https://example.test', { method: 'POST', headers: { 'x-admin-key': 'test-admin-only' }, body: JSON.stringify({ id: receipt }) })
  assert.equal((await adminOrders.POST(req())).status, 502)
  const deleted = await adminOrders.DELETE(new Request('https://example.test', { method: 'DELETE', headers: { 'x-admin-key': 'test-admin-only' }, body: JSON.stringify({ ids: [receipt] }) }))
  assert.equal((await deleted.json()).deletedCount, 0)
})
test('malformed financial storage throws instead of resetting inventory', async () => {
  fs.writeFileSync(path.join(temporary, '.local-r2/kv__voidhub__shop_state_v2.json'), '{broken')
  await assert.rejects(() => shop.loadShopProducts())
})
