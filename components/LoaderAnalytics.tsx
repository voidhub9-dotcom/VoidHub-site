'use client'

import { useEffect, useState } from 'react'
import { ActivityIcon, RefreshIcon } from '@/components/Icons'

interface AnalyticsSummary {
  total: number
  today: number
  yesterday: number
  last7: number
  last30: number
  daily: { date: string; count: number }[]
  hourly: { hour: string; count: number }[]
}

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

/** Bar chart with hover readout. Pure SVG + divs, cheap to render. */
function BarChart({ data, labelEvery = 2 }: { data: { label: string; count: number }[]; labelEvery?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div>
      <div className="relative h-40 md:h-48">
        {[0.25, 0.5, 0.75].map(f => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-[#1a1a1a]" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px] md:gap-1.5">
          {data.map((d, i) => {
            const h = d.count === 0 ? 2 : Math.max(4, (d.count / max) * 100)
            const on = hover === i
            return (
              <div
                key={d.label + i}
                className="relative flex-1 h-full flex items-end cursor-default"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={`w-full rounded-t-[4px] transition-colors ${d.count === 0 ? 'bg-[#1c1c1c]' : on ? 'bg-white' : 'bg-white/60'}`}
                  style={{ height: d.count === 0 ? '2px' : `${h}%` }}
                />
                {on && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg border border-[#2a2a2a] bg-black px-2.5 py-1.5 text-center shadow-xl">
                    <p className="text-sm font-semibold text-white tabular-nums">{d.count.toLocaleString()}</p>
                    <p className="font-gmono text-[0.6rem] text-[#6b6b6b]">{d.label}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex mt-2">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 text-center font-gmono text-[0.58rem] text-[#555] whitespace-nowrap">
            {i % labelEvery === 0 ? (d.label.includes('-') ? d.label.split('-').pop() : d.label) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LoaderAnalytics() {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'daily' | 'hourly'>('daily')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/analytics', { headers: { 'x-admin-key': getAdminKey() } })
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.total === 'number') setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const trend = stats && stats.yesterday > 0 ? Math.round(((stats.today - stats.yesterday) / stats.yesterday) * 100) : null

  return (
    <section className="rounded-2xl border border-[#1c1c1c] bg-[#070707] p-5 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b]">
            <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" /><span className="relative w-1.5 h-1.5 rounded-full bg-success" /></span>
            Executions today
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-5xl md:text-6xl font-semibold tracking-tighter text-white tabular-nums">{stats ? stats.today.toLocaleString() : '–'}</p>
            {trend !== null && (
              <span className={`text-sm tabular-nums ${trend >= 0 ? 'text-success' : 'text-danger'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-full border border-[#1f1f1f] bg-[#0a0a0a]">
            {([['daily', '14 days'], ['hourly', '24 hours']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`h-8 px-3.5 rounded-full text-xs ${view === k ? 'bg-white text-black' : 'text-[#8a8a8a] hover:text-white'}`}>{l}</button>
            ))}
          </div>
          <button onClick={load} aria-label="Refresh analytics" className="w-10 h-10 rounded-full border border-[#1f1f1f] flex items-center justify-center text-[#8a8a8a] hover:text-white">
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {stats ? (
        <>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 font-gmono text-xs">
            {[['yesterday', stats.yesterday], ['7 days', stats.last7], ['30 days', stats.last30], ['all time', stats.total]].map(([l, v]) => (
              <span key={l as string} className="text-[#6b6b6b]">{l} <span className="text-white tabular-nums">{(v as number).toLocaleString()}</span></span>
            ))}
          </div>
          <div className="mt-6">
            {view === 'daily'
              ? <BarChart data={stats.daily.map(d => ({ label: d.date.slice(5), count: d.count }))} labelEvery={2} />
              : <BarChart data={stats.hourly.map(h => ({ label: `${h.hour}h`, count: h.count }))} labelEvery={4} />}
          </div>
          <p className="mt-3 text-[0.7rem] text-[#555]">Only real executor runs are counted, never browser visits. Refreshes every minute.</p>
        </>
      ) : (
        <div className="mt-6 h-40 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#222]">
          <ActivityIcon size={15} className="text-[#555]" />
          <span className="text-sm text-[#6b6b6b]">{loading ? 'Loading…' : 'No runs yet. Waiting for the first execution.'}</span>
        </div>
      )}
    </section>
  )
}
