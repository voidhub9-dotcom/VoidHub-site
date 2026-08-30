'use client'

import { useState, useEffect } from 'react'
import { AlertIcon, KeyIcon, PlusIcon, TrashIcon, GlobeIcon } from '@/components/Icons'
import type { ShopProduct, RegionalPrice } from '@/lib/shop'

export interface ShopProductFormData {
  name: string
  description: string
  priceCents: number
  currency: string
  durationLabel: string
  imageUrl: string
  category: string
  active: boolean
  keysToAdd: string[]
  regionalPricing: RegionalPrice[]
}

interface RegionRow {
  countryCode: string
  priceDollars: string
  currency: string
}

interface ShopProductModalProps {
  product?: ShopProduct | null
  onSave: (data: ShopProductFormData) => void
  onCancel: () => void
}

const CURRENCIES = ['usd', 'eur', 'gbp']

const empty = {
  name: '',
  description: '',
  priceDollars: '',
  currency: 'usd',
  durationLabel: '',
  imageUrl: '',
  category: '',
  active: true,
}

const inputCls =
  'w-full h-10 px-3 bg-black-surface border border-border-mid rounded-lg text-white font-body text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:border-white focus:shadow-[0_0_0_1px_rgba(255,255,255,0.35)] transition-all'

const labelCls = 'block font-heading text-[0.62rem] tracking-widest text-silver-mid uppercase mb-1.5'

export default function ShopProductModal({ product, onSave, onCancel }: ShopProductModalProps) {
  const [form, setForm] = useState(empty)
  const [keysText, setKeysText] = useState('')
  const [regionRows, setRegionRows] = useState<RegionRow[]>([])
  const [error, setError] = useState('')

  const isEdit = !!product

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        priceDollars: (product.priceCents / 100).toString(),
        currency: product.currency,
        durationLabel: product.durationLabel,
        imageUrl: product.imageUrl,
        category: product.category,
        active: product.active,
      })
      setRegionRows(
        (product.regionalPricing || []).map(r => ({
          countryCode: r.countryCode,
          priceDollars: (r.priceCents / 100).toString(),
          currency: r.currency,
        })),
      )
    } else {
      setForm(empty)
      setRegionRows([])
    }
    setKeysText('')
    setError('')
  }, [product])

  const addRegionRow = () =>
    setRegionRows(rows => [...rows, { countryCode: '', priceDollars: '', currency: form.currency }])
  const removeRegionRow = (i: number) =>
    setRegionRows(rows => rows.filter((_, idx) => idx !== i))
  const updateRegionRow = (i: number, updates: Partial<RegionRow>) =>
    setRegionRows(rows => rows.map((r, idx) => (idx === i ? { ...r, ...updates } : r)))

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) { setError('Product name is required.'); return }
    const priceCents = Math.round(parseFloat(form.priceDollars || '0') * 100)
    if (!priceCents || priceCents < 1) { setError('Enter a price greater than $0.'); return }

    const keysToAdd = keysText
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean)

    const regionalPricing: RegionalPrice[] = regionRows
      .filter(r => r.countryCode.trim() && r.priceDollars.trim())
      .map(r => ({
        countryCode: r.countryCode.trim().toUpperCase().slice(0, 2),
        priceCents: Math.round(parseFloat(r.priceDollars || '0') * 100),
        currency: r.currency,
      }))

    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      priceCents,
      currency: form.currency,
      durationLabel: form.durationLabel.trim(),
      imageUrl: form.imageUrl.trim(),
      category: form.category.trim(),
      active: form.active,
      keysToAdd,
      regionalPricing,
    })
  }

  const currentStock = product?.keys.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="sp-name" className={labelCls}>
          Product name <span className="text-danger">*</span>
        </label>
        <input
          id="sp-name"
          value={form.name}
          onChange={e => { set('name', e.target.value); setError('') }}
          placeholder="e.g. VoidHub Premium — 30 Days"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="sp-desc" className={labelCls}>Description</label>
        <textarea
          id="sp-desc"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What the customer gets…"
          rows={3}
          className={`${inputCls} !h-auto py-2.5 resize-none leading-relaxed`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sp-price" className={labelCls}>
            Price ($) <span className="text-danger">*</span>
          </label>
          <input
            id="sp-price"
            type="number"
            min="0"
            step="0.01"
            value={form.priceDollars}
            onChange={e => { set('priceDollars', e.target.value); setError('') }}
            placeholder="9.99"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="sp-currency" className={labelCls}>Currency</label>
          <select
            id="sp-currency"
            value={form.currency}
            onChange={e => set('currency', e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer uppercase`}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sp-duration" className={labelCls}>Duration label</label>
          <input
            id="sp-duration"
            value={form.durationLabel}
            onChange={e => set('durationLabel', e.target.value)}
            placeholder="30 Days, Lifetime…"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="sp-category" className={labelCls}>Category</label>
          <input
            id="sp-category"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            placeholder="Premium"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="sp-image" className={labelCls}>Image URL</label>
        <input
          id="sp-image"
          value={form.imageUrl}
          onChange={e => set('imageUrl', e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${labelCls} !mb-0 flex items-center gap-1.5`}>
            <GlobeIcon size={11} /> Regional pricing
          </span>
          <button
            type="button"
            onClick={addRegionRow}
            className="flex items-center gap-1 text-[0.65rem] font-body text-silver-mid hover:text-white transition-colors"
          >
            <PlusIcon size={11} /> Add country
          </button>
        </div>
        <p className="font-body text-[0.68rem] text-silver-faint mb-2">
          Optional per-country price overrides — buyers in that country see and pay this price instead of the base price above.
        </p>
        {regionRows.length > 0 && (
          <div className="flex flex-col gap-2">
            {regionRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row.countryCode}
                  onChange={e => updateRegionRow(i, { countryCode: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="IN"
                  maxLength={2}
                  className={`${inputCls} !h-9 !w-16 text-center uppercase`}
                  aria-label="Country code"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.priceDollars}
                  onChange={e => updateRegionRow(i, { priceDollars: e.target.value })}
                  placeholder="4.99"
                  className={`${inputCls} !h-9 !w-auto flex-1`}
                  aria-label="Regional price"
                />
                <select
                  value={row.currency}
                  onChange={e => updateRegionRow(i, { currency: e.target.value })}
                  className={`${inputCls} !h-9 !w-20 appearance-none cursor-pointer uppercase`}
                  aria-label="Regional currency"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeRegionRow(i)}
                  className="shrink-0 p-2 text-silver-muted hover:text-danger transition-colors"
                  aria-label="Remove region"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="sp-keys" className={`${labelCls} !mb-0 flex items-center gap-1.5`}>
            <KeyIcon size={11} /> Add stock keys
          </label>
          <span className="font-body text-[0.65rem] text-silver-muted">
            Current stock: {currentStock}
          </span>
        </div>
        <textarea
          id="sp-keys"
          value={keysText}
          onChange={e => setKeysText(e.target.value)}
          placeholder={'One key per line — appended to existing stock:\nVOID-XXXX-XXXX\nVOID-YYYY-YYYY'}
          rows={4}
          className={`${inputCls} !h-auto py-2.5 resize-none font-mono text-xs`}
        />
      </div>

      <button
        type="button"
        onClick={() => set('active', !form.active)}
        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
          form.active ? 'border-success/60 bg-success/10' : 'border-border-mid hover:border-silver-faint'
        }`}
        aria-pressed={form.active}
      >
        <span className="flex-1">
          <span className={`block font-body text-sm ${form.active ? 'text-success' : 'text-white'}`}>
            {form.active ? 'Active — visible in the shop' : 'Inactive — hidden from the shop'}
          </span>
        </span>
        <span
          className={`rounded-full p-0.5 transition-colors ${form.active ? 'bg-success' : 'bg-black-elevated border border-border-mid'}`}
          style={{ width: 40, height: 22 }}
        >
          <span
            className={`block rounded-full bg-white transition-transform ${form.active ? 'translate-x-4' : ''}`}
            style={{ width: 17, height: 17 }}
          />
        </span>
      </button>

      {error && (
        <p className="flex items-center gap-1.5 text-danger text-xs font-body">
          <AlertIcon size={12} className="flex-shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dim">
        <button onClick={onCancel} className="px-4 h-10 rounded-lg text-silver-muted font-body text-sm hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="btn-primary !h-10 !py-0"
        >
          {isEdit ? 'SAVE CHANGES' : 'ADD PRODUCT'}
        </button>
      </div>
    </div>
  )
}
