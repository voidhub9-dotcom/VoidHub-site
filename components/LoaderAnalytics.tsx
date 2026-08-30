'use client'

import { useEffect, useState } from 'react'
import { ActivityIcon, BoltIcon, RefreshIcon } from '@/components/Icons'

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

/** Simple GPU-cheap SVG bar chart, styled to match the admin theme. */
function BarChart({
  data,
  height = 120,
  labelEvery = 2,
}: {
  data: { label: string; count: number }[]
  height?: number
  labelEvery?: number
}) {
  const max = Math.max(1, ...data.map(d => d.count))
  const barW = 100 / data.length

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Executions chart"
      >
        {data.map((d, i) => {
          const h = d.count === 0 ? 1.5 : Math.max(3, (d.count / max) * (height - 10))
          return (
            <rect
              key={d.label + i}
              x={i * barW + barW * 0.15}
              y={height - h}
              width={barW * 0.7}
              height={h}
              rx={1}
              className={d.count === 0 ? 'fill-border-mid' : 'fill-success/70'}
            >
              <title>{`${d.label}: ${d.count} executions`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between mt-1.5">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={d.label + i} className="font-body text-[0.6rem] text-silver-faint">
              {d.label}
            </span>
          ) : (
            <span key={d.label + i} />
          ),
        )}
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

  const trend =
    stats && stats.yesterday > 0
      ? Math.round(((stats.today - stats.yesterday) / stats.yesterday) * 100)
      : null

  return (
    <div className="bg-black-card border border-border-dim rounded-lg p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BoltIcon size={18} className="text-silver-base" />
          <h2 className="font-heading text-sm text-white">LOADER ANALYTICS</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/5 px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-body text-[0.65rem] text-success">LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-dim overflow-hidden">
            <button
              onClick={() => setView('daily')}
              className={`px-3 py-1 font-body text-xs transition-colors ${
                view === 'daily' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setView('hourly')}
              className={`px-3 py-1 font-body text-xs transition-colors ${
                view === 'hourly' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'
              }`}
            >
              24 Hours
            </button>
          </div>
          <button
            onClick={load}
            aria-label="Refresh analytics"
            className="p-1.5 rounded-lg border border-border-dim text-silver-muted hover:text-white hover:border-silver-faint transition-colors"
          >
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {stats ? (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            <MiniStat label="ALL-TIME" value={stats.total} highlight />
            <MiniStat
              label="TODAY"
              value={stats.today}
              badge={trend !== null ? `${trend >= 0 ? '+' : ''}${trend}%` : undefined}
              badgeGood={trend !== null && trend >= 0}
            />
            <MiniStat label="YESTERDAY" value={stats.yesterday} />
            <MiniStat label="LAST 7 DAYS" value={stats.last7} />
            <MiniStat label="LAST 30 DAYS" value={stats.last30} />
          </div>

          {/* Chart */}
          {view === 'daily' ? (
            <BarChart
              data={stats.daily.map(d => ({ label: d.date.slice(5), count: d.count }))}
              labelEvery={2}
            />
          ) : (
            <BarChart
              data={stats.hourly.map(h => ({ label: `${h.hour}h`, count: h.count }))}
              labelEvery={4}
            />
          )}
          <p className="font-body text-[0.65rem] text-silver-faint mt-2">
            Every count is a real executor running your loadstring — browser visits are never counted. Auto-refreshes every 60s.
          </p>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 py-10">
          <ActivityIcon size={16} className="text-silver-muted animate-pulse" />
          <span className="font-body text-sm text-silver-muted">
            {loading ? 'Loading analytics…' : 'No analytics data yet — waiting for the first execution.'}
          </span>
        </div>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  badge,
  badgeGood,
  highlight,
}: {
  label: string
  value: number
  badge?: string
  badgeGood?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? 'border-success/30 bg-success/5' : 'border-border-dim bg-black-surface/50'
      }`}
    >
      <p className="font-heading text-[0.55rem] text-silver-muted tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <p className={`font-heading text-xl ${highlight ? 'text-success' : 'text-white'}`}>
          {value.toLocaleString()}
        </p>
        {badge && (
          <span className={`font-body text-[0.65rem] ${badgeGood ? 'text-success' : 'text-danger'}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
