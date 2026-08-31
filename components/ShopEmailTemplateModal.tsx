'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast'
import type { ShopEmailTemplate } from '@/lib/shop'

interface ShopEmailTemplateModalProps {
  onClose: () => void
}

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

const inputCls =
  'w-full px-3 py-2.5 bg-black-surface border border-border-mid rounded-lg text-white font-body text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:border-white focus:shadow-[0_0_0_1px_rgba(255,255,255,0.35)] transition-all'

const labelCls = 'block font-heading text-[0.62rem] tracking-widest text-silver-mid uppercase mb-1.5'

const FIELDS: { key: keyof ShopEmailTemplate; label: string; multiline?: boolean }[] = [
  { key: 'subject', label: 'Subject line' },
  { key: 'heading', label: 'Heading' },
  { key: 'introText', label: 'Intro text (below the key)', multiline: true },
  { key: 'footerNote', label: 'Footer note', multiline: true },
]

export default function ShopEmailTemplateModal({ onClose }: ShopEmailTemplateModalProps) {
  const { showToast } = useToast()
  const [template, setTemplate] = useState<ShopEmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/shop/email-template', { headers: { 'x-admin-key': getAdminKey() } })
      .then(r => r.json())
      .then(data => setTemplate(data))
      .catch(() => showToast('Failed to load template', 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shop/email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify(template),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      showToast('Email template saved', 'success')
      onClose()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !template) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs text-silver-muted leading-relaxed">
        Controls the wording of the key-delivery email (the layout — logo, key box, gradient accent — stays fixed).
        Use <code className="text-silver-light">{'{product}'}</code>, <code className="text-silver-light">{'{duration}'}</code>,{' '}
        <code className="text-silver-light">{'{key}'}</code>, or <code className="text-silver-light">{'{orderId}'}</code> anywhere
        to insert those values.
      </p>

      {FIELDS.map(field => (
        <div key={field.key}>
          <label htmlFor={`email-${field.key}`} className={labelCls}>{field.label}</label>
          {field.multiline ? (
            <textarea
              id={`email-${field.key}`}
              value={template[field.key]}
              onChange={e => setTemplate({ ...template, [field.key]: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          ) : (
            <input
              id={`email-${field.key}`}
              type="text"
              value={template[field.key]}
              onChange={e => setTemplate({ ...template, [field.key]: e.target.value })}
              className={inputCls}
            />
          )}
        </div>
      ))}

      <div className="flex gap-3 mt-2">
        <button onClick={onClose} disabled={saving}
          className="flex-1 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-buy flex-1 !h-10 !py-0 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
