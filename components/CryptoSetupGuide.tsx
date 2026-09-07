'use client'

import { useEffect, useState } from 'react'

export default function CryptoSetupGuide() {
  const [status, setStatus] = useState<{ crypto: boolean; cryptoSandbox: boolean } | null>(null)
  useEffect(() => {
    let active = true
    fetch('/api/public/shop/payment-methods').then(r => r.json()).then(data => { if (active) setStatus(data) }).catch(() => {})
    return () => { active = false }
  }, [])
  return (
    <details className="mb-6 rounded-xl border border-border-mid bg-black-card p-4 font-body text-sm text-silver-mid">
      <summary className="cursor-pointer text-white">Crypto payments → GBP · {status ? status.crypto ? status.cryptoSandbox ? 'Sandbox enabled' : 'Enabled' : 'Setup needed' : 'Checking…'}</summary>
      <div className="mt-4 space-y-3">
        <p>Customers pay through CoinGate. Each invoice requests GBP settlement. Conversion, fees, bank details and withdrawals are managed in your CoinGate business account.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Complete CoinGate business verification and confirm that your business, products and UK bank account are eligible for GBP settlement.</li>
          <li>Add your GBP bank payout details in CoinGate and review conversion fees and payout minimums.</li>
          <li>In Vercel, set <code>COINGATE_API_TOKEN</code>, a random <code>COINGATE_CALLBACK_SECRET</code> of at least 32 characters, <code>COINGATE_ENVIRONMENT=sandbox</code> and <code>COINGATE_ENABLED=true</code>. Use separate sandbox credentials and storage in Preview.</li>
          <li>Set <code>NEXT_PUBLIC_SITE_URL</code> to the canonical HTTPS origin. Configure R2 and a non-default <code>ADMIN_PASSWORD</code>. Redeploy, then test a paid, expired and repeated callback. Sandbox payments deliver synthetic keys without reducing stock.</li>
          <li>After testing and account approval, configure live credentials, change <code>COINGATE_ENVIRONMENT=live</code> and redeploy. Keep your callback secret available for pending invoices.</li>
        </ol>
        <p>Invoice prices follow your products (GBP, USD or EUR); settlement is requested in GBP. This is automatic checkout conversion. To sell crypto you already hold, use CoinGate’s deposit, convert and withdraw tools after account approval.</p>
        <div className="flex flex-wrap gap-4">
          <a className="text-white underline" href="https://accounts.coingate.com/login" target="_blank" rel="noopener noreferrer">Manage conversion & withdrawals ↗</a>
          <a className="text-white underline" href="https://coingate.com/buy-and-sell" target="_blank" rel="noopener noreferrer">Deposit and convert existing crypto ↗</a>
        </div>
      </div>
    </details>
  )
}
