'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  PlusIcon, SearchIcon, EditIcon, TrashIcon, AlertIcon, ImageIcon,
  RefreshIcon, ShopIcon, TagIcon, KeyIcon, ActivityIcon, MailIcon, ExternalIcon, CheckIcon,
} from '@/components/Icons'
import Modal from '@/components/Modal'
import ShopProductModal, { ShopProductFormData } from '@/components/ShopProductModal'
import StripeSetupGuide from '@/components/StripeSetupGuide'
import { useToast } from '@/components/Toast'
import type { ShopProduct } from '@/lib/shop'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiShopProducts(method: string, body?: object) {
  const res = await fetch('/api/admin/shop/products', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

function StatCard({ icon: Icon, label, value, tone, delay }: {
  icon: typeof ShopIcon; label: string; value: number | string; tone?: 'success' | 'danger'; delay: number
}) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-silver-base'
  return (
    <div className="admin-stat-card admin-stagger bg-black-card border border-border-dim rounded-xl p-4 flex items-center gap-4 hover:border-border-bright transition-colors"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-lg bg-black-elevated border border-border-dim flex items-center justify-center ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="font-heading text-xl text-white leading-none">{value}</p>
        <p className="font-body text-xs text-silver-muted mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

export default function AdminShopPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ShopProduct | null>(null)
  const [testingProduct, setTestingProduct] = useState<ShopProduct | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testSubmitting, setTestSubmitting] = useState(false)
  const [testResult, setTestResult] = useState<{ sessionId: string; emailSent: boolean; emailError?: string } | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiShopProducts('GET')
      setProducts(Array.isArray(data) ? data : [])
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadProducts() }, [loadProducts])

  const filtered = products.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSave = async (data: ShopProductFormData) => {
    try {
      if (editingProduct) {
        await apiShopProducts('PUT', { id: editingProduct.id, ...data })
        showToast(`Updated "${data.name}"`, 'success')
      } else {
        await apiShopProducts('POST', data)
        showToast(`Added "${data.name}"`, 'success')
      }
      await loadProducts()
      setIsModalOpen(false)
      setEditingProduct(null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleRunTest = async () => {
    if (!testingProduct) return
    setTestSubmitting(true)
    try {
      const res = await fetch('/api/admin/shop/test-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ productId: testingProduct.id, email: testEmail.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setTestResult({ sessionId: data.sessionId, emailSent: data.emailSent, emailError: data.emailError })
      showToast(
        testEmail.trim()
          ? (data.emailSent ? 'Test order created — email sent' : `Email did NOT send: ${data.emailError || 'unknown error'}`)
          : 'Test order created',
        data.emailSent || !testEmail.trim() ? 'success' : 'error',
      )
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setTestSubmitting(false)
    }
  }

  const closeTestModal = () => {
    setTestingProduct(null)
    setTestEmail('')
    setTestResult(null)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await apiShopProducts('DELETE', { id: deleteConfirm.id })
      showToast(`Deleted "${deleteConfirm.name}"`, 'success')
      await loadProducts()
      setDeleteConfirm(null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    stock: products.reduce((sum, p) => sum + p.keys.length, 0),
    sold: products.reduce((sum, p) => sum + p.soldCount, 0),
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 admin-stagger">
        <div>
          <p className="font-body text-xs text-silver-muted tracking-[0.3em] uppercase mb-1">Shop</p>
          <h1 className="font-heading text-2xl text-white tracking-wide">MANAGE PRODUCTS</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shop/orders"
            className="flex items-center gap-2 px-3 h-10 border border-border-mid text-silver-mid rounded-lg font-body text-sm hover:text-white hover:border-white transition-all">
            <ActivityIcon size={16} /><span className="hidden sm:inline">Orders</span>
          </Link>
          <button onClick={loadProducts} aria-label="Refresh products"
            className="flex items-center gap-2 px-3 h-10 border border-border-mid text-silver-mid rounded-lg font-body text-sm hover:text-white hover:border-white transition-all">
            <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true) }}
            className="btn-buy !h-10 !py-0 !px-4 text-sm">
            <PlusIcon size={16} /><span>ADD PRODUCT</span>
          </button>
        </div>
      </div>

      <StripeSetupGuide />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={ShopIcon} label="Total Products" value={stats.total} delay={0} />
        <StatCard icon={TagIcon} label="Active" value={stats.active} tone="success" delay={60} />
        <StatCard icon={KeyIcon} label="Keys In Stock" value={stats.stock} delay={120} />
        <StatCard icon={ActivityIcon} label="Total Sold" value={stats.sold} delay={180} />
      </div>

      {/* Search */}
      <div className="relative mb-6 admin-stagger" style={{ animationDelay: '120ms' }}>
        <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-muted" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..."
          className="w-full h-10 pl-10 pr-4 bg-black-card border border-border-mid rounded-lg text-silver-bright font-body text-sm placeholder:text-silver-muted focus:outline-none focus:border-white transition-colors" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-black-card border border-border-dim rounded-xl animate-pulse h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-black-card border border-border-dim rounded-xl text-center">
          <ShopIcon size={36} className="text-silver-faint mb-4" />
          <p className="font-heading text-sm text-silver-light tracking-wider mb-1">NO PRODUCTS YET</p>
          <p className="font-body text-sm text-silver-muted mb-6">Add your first product to start selling keys.</p>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true) }}
            className="btn-buy">
            <PlusIcon size={16} /><span>ADD PRODUCT</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <div key={product.id}
              className="admin-stagger bg-black-card border border-border-dim rounded-xl overflow-hidden flex flex-col hover:border-border-bright transition-colors"
              style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}>
              <div className="relative h-28 bg-black-surface overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={22} className="text-silver-faint" />
                  </div>
                )}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[0.65rem] font-heading tracking-wider ${
                  product.active ? 'bg-success/90 text-black' : 'bg-black/70 text-silver-mid border border-border-mid'
                }`}>
                  {product.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-body font-semibold text-white text-sm mb-1 truncate">{product.name}</h3>
                <p className="font-body text-silver-mid text-xs line-clamp-2 mb-3 flex-1">{product.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs font-body mb-3">
                  <span className="font-heading text-white">{formatPrice(product.priceCents, product.currency)}</span>
                  <span className={`flex items-center gap-1 ${product.keys.length < 1 ? 'text-danger' : product.keys.length <= 5 ? 'text-warning' : 'text-silver-muted'}`}>
                    <KeyIcon size={11} />{product.keys.length} in stock
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(product); setIsModalOpen(true) }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border-mid text-silver-mid font-body text-xs hover:border-white hover:text-white transition-all">
                    <EditIcon size={13} />Edit
                  </button>
                  <button onClick={() => setTestingProduct(product)} title="Simulate a test order — no Stripe, no real charge"
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-border-mid text-silver-muted hover:border-info hover:text-info transition-all">
                    <MailIcon size={13} />
                  </button>
                  <button onClick={() => setDeleteConfirm(product)}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-border-mid text-silver-muted hover:border-danger hover:text-danger transition-all">
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null) }} title={editingProduct ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'} maxWidth="max-w-[560px]">
        <ShopProductModal product={editingProduct} onSave={handleSave} onCancel={() => { setIsModalOpen(false); setEditingProduct(null) }} />
      </Modal>

      {/* Test order — simulates the delivery pipeline without touching Stripe or real stock */}
      <Modal isOpen={!!testingProduct} onClose={closeTestModal} title="SIMULATE TEST ORDER" maxWidth="max-w-[440px]">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-silver-mid">
            Creates a fake order for <strong className="text-white">{testingProduct?.name}</strong> with a synthetic key —
            no Stripe involved, no real charge, and your actual stock/sales numbers are untouched.
          </p>
          {!testResult ? (
            <>
              <div>
                <label htmlFor="test-email" className="block font-body text-xs text-silver-muted uppercase tracking-wider mb-1.5">
                  Email <span className="text-silver-faint normal-case">(optional — to test auto-delivery email)</span>
                </label>
                <input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="void-input"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={closeTestModal} className="flex-1 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all">
                  Cancel
                </button>
                <button onClick={handleRunTest} disabled={testSubmitting} className="btn-buy flex-1 !h-10 !py-0 disabled:opacity-50">
                  {testSubmitting ? 'Running...' : 'Run Test'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-black-surface border border-border-mid rounded-lg p-3 flex items-start gap-2">
                <CheckIcon size={16} className="text-success shrink-0 mt-0.5" />
                <p className="font-body text-xs text-silver-mid">
                  Test order created.{testEmail.trim() && testResult.emailSent && ' Email sent — check your inbox.'}
                </p>
              </div>
              {testEmail.trim() && !testResult.emailSent && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertIcon size={16} className="text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="font-body text-xs text-danger font-semibold mb-0.5">Email did not send</p>
                    <p className="font-body text-xs text-silver-mid break-words">{testResult.emailError || 'Unknown error'}</p>
                  </div>
                </div>
              )}
              <a
                href={`/shop/success?session_id=${testResult.sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-buy flex items-center justify-center gap-2 !h-10 !py-0"
              >
                <ExternalIcon size={14} />View success page
              </a>
              <button onClick={closeTestModal} className="h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all">
                Close
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="DELETE PRODUCT?" maxWidth="max-w-[360px]">
        <div className="text-center">
          <AlertIcon size={32} className="mx-auto text-danger mb-4" />
          <p className="text-silver-light font-body text-sm mb-6">
            Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? Any unsold keys will be lost. This cannot be undone.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-5 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all">CANCEL</button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-5 h-10 bg-danger text-white rounded-lg font-body text-sm hover:bg-danger/80 transition-all">
              <TrashIcon size={16} /><span>DELETE</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
