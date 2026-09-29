'use client'

import type { ReactNode } from 'react'

/**
 * Shared building blocks for the admin pages, so every page has the same
 * header, stat strip, panels, fields and controls.
 */

export const inputCls =
  'w-full h-11 px-4 rounded-xl bg-black border border-[#262626] text-white text-[16px] md:text-sm ' +
  'placeholder:text-[#555] focus:outline-none focus:border-[#6b6b6b] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)] transition-all'

export const textareaCls = `${inputCls} !h-auto py-3 leading-relaxed resize-y`

export function PageHead({ eyebrow, title, subtitle, actions }: {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="font-gmono text-[0.65rem] uppercase tracking-[0.2em] text-[#555] mb-2">{eyebrow}</p>}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.035em] text-chrome leading-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-[#8a8a8a] max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}

const COLS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }

export function StatStrip({ items }: { items: { label: string; value: ReactNode; sub?: string; dot?: string }[] }) {
  return (
    <div className={`grid grid-cols-2 ${COLS[Math.min(items.length, 4)]} rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden mb-6`}>
      {items.map((s, i) => (
        <div
          key={s.label}
          className={`px-5 py-5 border-[#1a1a1a] ${i % 2 ? 'border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''} ${i >= 1 ? 'md:border-l' : ''}`}
        >
          <p className="flex items-center gap-2 font-gmono text-[0.6rem] uppercase tracking-[0.18em] text-[#6b6b6b]">
            {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}{s.label}
          </p>
          <p className="mt-2 text-3xl md:text-4xl font-semibold tracking-tighter text-white tabular-nums">{s.value}</p>
          {s.sub && <p className="text-xs text-[#6b6b6b] truncate">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}

export function Section({ title, description, badge, actions, children, className = '' }: {
  title: string
  description?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-[#1c1c1c] bg-[#070707] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 md:px-6 pt-5 md:pt-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">{title}{badge}</h2>
          {description && <p className="mt-1 text-sm text-[#8a8a8a] leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="px-5 md:px-6 pb-5 md:pb-6 pt-4">{children}</div>
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const cls = {
    neutral: 'border-[#2a2a2a] text-[#a3a3a3]',
    good: 'border-success/30 text-success bg-success/[0.06]',
    bad: 'border-danger/30 text-danger bg-danger/[0.06]',
    warn: 'border-warning/30 text-warning bg-warning/[0.06]',
  }[tone]
  return <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border font-gmono text-[0.6rem] uppercase tracking-wider ${cls}`}>{children}</span>
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b] mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[0.72rem] text-[#6b6b6b] leading-relaxed">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[#1f1f1f] bg-[#0a0a0a] max-w-full overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-8 px-3.5 rounded-full text-xs whitespace-nowrap transition-colors ${value === o.value ? 'bg-white text-black' : 'text-[#8a8a8a] hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-40 ${checked ? 'bg-white' : 'bg-[#262626]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${checked ? 'left-[22px] bg-black' : 'left-0.5 bg-[#6b6b6b]'}`} />
    </button>
  )
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#262626] px-6 py-14 flex flex-col items-center text-center">
      {icon && <span className="w-12 h-12 rounded-2xl border border-[#262626] bg-[#0a0a0a] flex items-center justify-center text-white mb-4">{icon}</span>}
      <p className="text-white">{title}</p>
      {body && <p className="mt-1 text-sm text-[#6b6b6b] max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const btnDanger =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-danger/40 text-danger text-sm hover:bg-danger/10 transition-colors disabled:opacity-40'
