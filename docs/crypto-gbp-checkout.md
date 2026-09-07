# Crypto checkout and GBP settlement

Customers can select Crypto in the shop, pay on CoinGate's hosted invoice, and receive their key after CoinGate confirms payment. Each invoice requests `receive_currency=GBP`. Products may be priced in GBP, USD or EUR; existing prices are not relabelled or silently converted. Configure new GBP product prices in admin if desired.

CoinGate handles conversion and bank payouts. The site does not hold private keys or initiate swaps or withdrawals. Admin → Shop includes links to the provider account for deposits, conversion of existing crypto and withdrawals. Invoice totals are gross product prices, not net GBP bank receipts. Payout availability, fees, minimums and schedules depend on your approved provider account.

## Provider setup

1. Verify your UK business with CoinGate and get confirmation that your products and GBP bank account are supported. Do not enable production checkout before that approval.
2. Configure GBP settlement and bank payout details in CoinGate. Review the fees and limits in your account.
3. Create a sandbox account with a separate API token, and use isolated R2 storage for Vercel Preview. Never point preview at the production bucket.
4. Add these **server-side** variables in Vercel; do not commit values or use `NEXT_PUBLIC_` for secrets:

| Variable | Value |
| --- | --- |
| `COINGATE_ENABLED` | `true` to offer checkout; absent/false disables new invoices |
| `COINGATE_ENVIRONMENT` | `sandbox` for testing; explicitly `live` after approval |
| `COINGATE_API_TOKEN` | API token for the chosen environment |
| `COINGATE_CALLBACK_SECRET` | Random secret of at least 32 characters, e.g. `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS origin, e.g. `https://your-domain.example` (no path/query) |
| `ADMIN_PASSWORD` | A non-default private admin password |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Existing R2 account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Existing R2 access key ID |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Existing R2 secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | Isolated bucket for this environment |

5. Redeploy. The payment option only becomes enabled when required configuration is present. Sandbox checkout is visibly labelled and produces synthetic test keys, never real stock or email.
6. Test hosted checkout, the callback and receipt with sandbox credentials. The exact callback URL is sent with each invoice (`/api/shop/crypto/callback/<receipt-id>`). It must be publicly reachable without Vercel preview protection or redirects. Use a dedicated protected-data-free test deployment or a provider-supported test callback setup; do not disable protection on an existing sensitive deployment.
7. After sandbox testing and account approval, configure production credentials and enable live mode. Do not switch environments or rotate the callback secret while invoices in that environment are pending; let them finish first.

Changing `COINGATE_ENABLED=false` stops new crypto invoices while allowing callbacks for existing invoices to complete. Missing provider credentials will prevent those callbacks from being verified.

## Storage migration — deployment gate

Reliable fulfillment requires inventory and orders to be committed together. On the first shop mutation, this change imports the legacy R2 objects `kv/voidhub__shop_products.txt` and `kv/voidhub__shop_orders.txt` into `kv/voidhub__shop_state_v2.json`. Original objects are retained as backups. Thereafter, all shop writes use compare-and-swap on the new object. Failed storage reads/writes fail closed. Financial orders are not silently truncated at 500 or deleted from admin; only test records can be deleted.

Before production deployment:

- Back up the two legacy objects and verify the R2 token can read and conditionally write objects.
- Pause old checkout and admin stock changes, let in-flight requests finish, and route all shop traffic/payment callbacks to the new deployment together. Do not run old and new deployments writing the same bucket in parallel.
- Verify imported product/key counts and orders in the new admin before reopening checkout. Do not use Preview deployments with the production bucket.
- **Rollback is not simply a Vercel rollback after new sales.** Pause writes, back up v2 state, and reconcile/export its current products and orders into the legacy objects before restoring old code. Otherwise old code would read stale stock and could resell delivered keys.

## Verification and fulfillment

The callback token is derived per receipt and environment using HMAC-SHA256. This is our opaque CoinGate callback token, not a claim that CoinGate signs notifications. The callback body is only a notification: the server retrieves the authenticated invoice, matches invoice ID, merchant receipt, price, currency and GBP settlement, and releases keys only for `paid`.

Payment records and stock update atomically. Concurrent callbacks and replays cannot consume additional keys. Orders with insufficient stock are marked `paid_no_stock` without partial delivery; restock and use **Fulfill Now**, which verifies payment with the provider again. Expired, invalid, canceled and refunded invoices have explicit receipt states. Blockchain completion can take minutes. Keep pending receipt links and do not encourage buyers to pay again while waiting.

Email is a backup to the receipt page. It is sent after the durable fulfillment commit. A mail-service outage or process failure can leave `emailSent=false`; the key remains available on the receipt and in admin. This patch does not add an email retry queue. Refunds are managed in CoinGate; this site updates the receipt state when notified but does not revoke a key already delivered.

The Stripe webhook shares the same fulfillment path, ignores unpaid completions and handles `checkout.session.async_payment_succeeded`. Add that event alongside `checkout.session.completed` to the Stripe webhook subscription if enabling delayed payment methods. Stripe's dynamic payment methods are used rather than hardcoding card-only checkout.

## Tests

Run `node --test tests/crypto-checkout.test.cjs` and `./node_modules/.bin/tsc --noEmit --incremental false` after dependency installation. Tests use isolated temporary filesystem storage and mocked payment/email providers. They cover forged callbacks, invoice mismatches, concurrent duplicate fulfillment, last-stock allocation, sandbox isolation, expired/refunded receipts, server-side prices, redirect validation and unverified manual fulfillment.

These tests do not prove CoinGate account approval, live API behavior, R2 network permissions, actual email delivery or GBP bank payout. Complete the sandbox flow before going live.

## Official references

- [CoinGate supported countries](https://coingate.com/supported-countries)
- [Crypto checkout and GBP settlement](https://coingate.com/accept)
- [Deposit, convert and withdraw](https://coingate.com/buy-and-sell)
- [API environments](https://developer.coingate.com/reference/environments)
- [Create order](https://developer.coingate.com/reference/create-order)
- [Payment callbacks](https://developer.coingate.com/reference/payment-callback)
- [R2 conditional object operations](https://developers.cloudflare.com/r2/api/s3/api/)
