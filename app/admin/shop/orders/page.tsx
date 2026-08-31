'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, RefreshIcon, ActivityIcon, CheckIcon, ClockIcon, AlertIcon, MailIcon, TrashIcon } from '@/components/Icons'
import Modal from '@/components/Modal'
import { useToast } from '@/components/Toast'
import type { ShopOrder } from '@/lib/shop'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

function StatusChip({ status }: { status: ShopOrder['status'] }) {
  if (status === 'fulfilled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-body border bg-success/10 text-success border-success/30">
        <CheckIcon size={11} />Fulfilled
      </span>
    )
  }
  if (status === 'paid_no_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-body border bg-danger/10 text-danger border-danger/30">
        <AlertIcon size={11} />Paid — out of stock
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-body border bg-warning/10 text-warning border-warning/30">
      <ClockIcon size={11} />Pending
    </span>
  )
}

export default function AdminShopOrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shop/orders', {
        headers: { 'x-admin-key': getAdminKey() },
      })
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadOrders() }, [loadOrders])

  const testCount = useMemo(() => orders.filter(o => o.isTest).length, [orders])
  const allSelected = orders.length > 0 && selected.size === orders.length

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(orders.map(o => o.id)))
  }

  const selectAllTest = () => {
    setSelected(new Set(orders.filter(o => o.isTest).map(o => o.id)))
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/shop/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      showToast(`Deleted ${data.deletedCount} order${data.deletedCount === 1 ? '' : 's'}`, 'success')
      setDeleteConfirmOpen(false)
      await loadOrders()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 admin-stagger">
        <div>
          <Link href="/admin/shop" className="flex items-center gap-1.5 text-silver-muted hover:text-white font-body text-xs mb-2 transition-colors">
            <ChevronLeftIcon size={14} />Back to products
          </Link>
          <p className="font-body text-xs text-silver-muted tracking-[0.3em] uppercase mb-1">Shop</p>
          <h1 className="font-heading text-2xl text-white tracking-wide">ORDERS</h1>
        </div>
        <div className="flex items-center gap-2">
          {testCount > 0 && selected.size === 0 && (
            <button onClick={selectAllTest}
              className="flex items-center gap-2 px-3 h-10 border border-warning/40 text-warning rounded-lg font-body text-sm hover:bg-warning/10 transition-all">
              <span>Select {testCount} test order{testCount === 1 ? '' : 's'}</span>
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2 px-3 h-10 border border-danger/50 text-danger rounded-lg font-body text-sm hover:bg-danger/10 transition-all">
              <TrashIcon size={16} /><span>Delete {selected.size}</span>
            </button>
          )}
          <button onClick={loadOrders} aria-label="Refresh orders"
            className="flex items-center gap-2 px-3 h-10 border border-border-mid text-silver-mid rounded-lg font-body text-sm hover:text-white hover:border-white transition-all">
            <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-black-card border border-border-dim rounded-xl animate-pulse h-16" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-black-card border border-border-dim rounded-xl text-center">
          <ActivityIcon size={36} className="text-silver-faint mb-4" />
          <p className="font-heading text-sm text-silver-light tracking-wider mb-1">NO ORDERS YET</p>
          <p className="font-body text-sm text-silver-muted">Orders will show up here once Stripe checkout is live.</p>
        </div>
      ) : (
        <>
          {/* Card list — below sm, where a 6-column table can't fit without hiding data off-screen */}
          <div className="flex flex-col gap-3 sm:hidden">
            {orders.map(order => (
              <div key={order.id} className={`admin-panel p-4 transition-colors ${selected.has(order.id) ? '!border-white/40' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleOne(order.id)}
                      aria-label={`Select order for ${order.productName}`}
                      className="mt-1 w-4 h-4 shrink-0 accent-white cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-body text-sm text-white">{order.productName}</p>
                        {order.isTest && (
                          <span className="px-1.5 py-0.5 rounded border border-warning/40 bg-warning/10 text-warning font-body text-[0.6rem] uppercase tracking-wider">Test</span>
                        )}
                      </div>
                      <p className="font-heading text-base text-silver-light mt-0.5">
                        {order.isTest ? 'No charge' : formatPrice(order.amountTotal, order.currency)}
                      </p>
                      {order.presentmentAmount != null && order.presentmentCurrency && order.presentmentCurrency !== order.currency && (
                        <p className="font-body text-[0.7rem] text-silver-faint">
                          paid {formatPrice(order.presentmentAmount, order.presentmentCurrency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusChip status={order.status} />
                </div>
                <dl className="flex flex-col gap-1.5 text-xs font-body border-t border-border-dim pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-silver-muted">Email</dt>
                    <dd className="flex items-center gap-1.5 text-silver-mid truncate">
                      {order.customerEmail || '—'}
                      {order.customerEmail && order.status === 'fulfilled' && (
                        <span title={order.emailSent ? 'Delivery email sent' : 'Delivery email not sent'}>
                          <MailIcon size={11} className={order.emailSent ? 'text-success shrink-0' : 'text-silver-faint shrink-0'} />
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-silver-muted">Key</dt>
                    <dd className="text-silver-mid font-mono text-right break-all">
                      {order.deliveredKey || '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-silver-muted">Date</dt>
                    <dd className="text-silver-mid">{new Date(order.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Table — sm and up */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-border-dim">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="bg-black-card border-b border-border-dim text-silver-muted text-xs uppercase tracking-wider">
                  <th className="text-left pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all orders"
                      className="w-4 h-4 accent-white cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Key</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order.id} className={`border-b border-border-dim last:border-0 ${selected.has(order.id) ? 'bg-white/[0.06]' : i % 2 === 0 ? 'bg-black-surface' : 'bg-black-card'}`}>
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        aria-label={`Select order for ${order.productName}`}
                        className="w-4 h-4 accent-white cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{order.productName}</span>
                        {order.isTest && (
                          <span className="px-1.5 py-0.5 rounded border border-warning/40 bg-warning/10 text-warning font-body text-[0.6rem] uppercase tracking-wider">Test</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-silver-light">
                      {order.isTest ? <span className="text-silver-faint">—</span> : formatPrice(order.amountTotal, order.currency)}
                      {order.presentmentAmount != null && order.presentmentCurrency && order.presentmentCurrency !== order.currency && (
                        <span className="block text-[0.65rem] text-silver-faint">
                          paid {formatPrice(order.presentmentAmount, order.presentmentCurrency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-silver-mid">
                      <div className="flex items-center gap-1.5">
                        <span>{order.customerEmail || '—'}</span>
                        {order.customerEmail && order.status === 'fulfilled' && (
                          <span title={order.emailSent ? 'Delivery email sent' : 'Delivery email not sent'}>
                            <MailIcon size={12} className={order.emailSent ? 'text-success' : 'text-silver-faint'} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusChip status={order.status} /></td>
                    <td className="px-4 py-3">
                      {order.deliveredKey ? (
                        <code className="text-xs text-silver-mid font-mono">{order.deliveredKey}</code>
                      ) : (
                        <span className="text-silver-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-silver-muted text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="DELETE ORDERS?" maxWidth="max-w-[380px]">
        <div className="text-center">
          <AlertIcon size={32} className="mx-auto text-danger mb-4" />
          <p className="text-silver-light font-body text-sm mb-6">
            Delete {selected.size} order{selected.size === 1 ? '' : 's'}? This only removes the order record — it does not
            affect stock, sold counts, or anything already delivered. This cannot be undone.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}
              className="px-5 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all disabled:opacity-50">
              CANCEL
            </button>
            <button onClick={handleDeleteSelected} disabled={deleting}
              className="flex items-center gap-2 px-5 h-10 bg-danger text-white rounded-lg font-body text-sm hover:bg-danger/80 transition-all disabled:opacity-50">
              <TrashIcon size={16} /><span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
