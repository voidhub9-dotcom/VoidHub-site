'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Modal from '@/components/Modal'
import ShopProductCard, { PublicShopProduct } from '@/components/ShopProductCard'
import { ToastProvider, useToast } from '@/components/Toast'
import { ShopIcon, CartIcon, ShieldIcon } from '@/components/Icons'

function ShopPageInner() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<PublicShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PublicShopProduct | null>(null)
  const [email, setEmail] = useState('')
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    fetch('/api/public/shop/products')
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const openBuyModal = (product: PublicShopProduct) => {
    setSelected(product)
    setEmail('')
  }

  const handleCheckout = async () => {
    if (!selected) return
    setBuying(true)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selected.id, email: email || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (e: any) {
      showToast(e.message, 'error')
      setBuying(false)
    }
  }

  return (
    <div className="min-h-screen bg-black-void">
      <Navbar />
      <main className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black-card border border-border-dim rounded-full mb-4">
              <ShopIcon size={13} className="text-violet" />
              <span className="font-body text-xs text-silver-mid tracking-wide">Instant delivery · Secure Stripe checkout</span>
            </div>
            <h1 className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-white mb-3 text-balance">
              SHOP
            </h1>
            <p className="font-body text-silver-mid text-sm md:text-base text-pretty max-w-xl mx-auto">
              Premium script keys, delivered instantly after payment. Pick a plan, check out, and your key is ready.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="price-card aspect-[4/5] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(product => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  onBuy={openBuyModal}
                  buying={buying && selected?.id === product.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-black-card border border-border-dim rounded-xl max-w-xl mx-auto">
              <ShopIcon size={28} className="text-silver-faint mx-auto mb-4" />
              <p className="font-body text-silver-muted text-lg mb-2">No products yet</p>
              <p className="font-body text-silver-faint text-sm">Check back soon — the shop is being stocked.</p>
            </div>
          )}

          <div className="mt-14 flex items-center justify-center gap-2 text-silver-muted text-xs font-body">
            <ShieldIcon size={14} />
            <span>Payments processed securely by Stripe. Keys are delivered automatically.</span>
          </div>
        </div>
      </main>
      <Footer />

      <Modal
        isOpen={!!selected}
        onClose={() => !buying && setSelected(null)}
        title={selected ? `Buy ${selected.name}` : ''}
        maxWidth="max-w-[420px]"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-3 bg-black-surface border border-border-dim rounded-lg">
              <span className="font-body text-sm text-silver-mid">{selected.durationLabel || selected.name}</span>
              <span className="font-heading text-lg text-white">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: selected.currency.toUpperCase() }).format(selected.priceCents / 100)}
              </span>
            </div>
            <div>
              <label className="block font-body text-xs text-silver-muted mb-1.5">Email (optional — for your receipt)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="void-input"
              />
            </div>
            <button
              onClick={handleCheckout}
              disabled={buying}
              className="btn-buy w-full"
            >
              <CartIcon size={16} />
              <span>{buying ? 'REDIRECTING TO STRIPE...' : 'CONTINUE TO PAYMENT'}</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function ShopPage() {
  return (
    <ToastProvider>
      <ShopPageInner />
    </ToastProvider>
  )
}
