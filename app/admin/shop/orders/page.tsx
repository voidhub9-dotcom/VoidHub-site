'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, RefreshIcon, ActivityIcon, CheckIcon, ClockIcon, AlertIcon } from '@/components/Icons'
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

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shop/orders', {
        headers: { 'x-admin-key': getAdminKey() },
      })
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadOrders() }, [loadOrders])

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
        <button onClick={loadOrders} aria-label="Refresh orders"
          className="flex items-center gap-2 px-3 h-10 border border-border-mid text-silver-mid rounded-lg font-body text-sm hover:text-white hover:border-white transition-all">
          <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
        </button>
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
        <div className="overflow-x-auto rounded-xl border border-border-dim">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="bg-black-card border-b border-border-dim text-silver-muted text-xs uppercase tracking-wider">
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
                <tr key={order.id} className={`border-b border-border-dim last:border-0 ${i % 2 === 0 ? 'bg-black-surface' : 'bg-black-card'}`}>
                  <td className="px-4 py-3 text-white">{order.productName}</td>
                  <td className="px-4 py-3 text-silver-light">{formatPrice(order.amountTotal, order.currency)}</td>
                  <td className="px-4 py-3 text-silver-mid">{order.customerEmail || '—'}</td>
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
      )}
    </div>
  )
}
