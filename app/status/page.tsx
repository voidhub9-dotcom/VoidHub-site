'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import { CheckIcon, AlertIcon, TerminalIcon, ActivityIcon, RefreshIcon, GamesIcon, BoltIcon } from '@/components/Icons'
import ExecutorIcon from '@/components/ExecutorIcon'

interface GameStatus {
  id: string
  name: string
  status: string
  category?: string
  updatedAt?: string
}

interface Executor {
  name: string
  status: 'supported' | 'unsupported'
  link?: string
  linkLabel?: string
  icon?: string
}

/** Live per-executor status from WEAO (whatexpsare.online). */
interface WeaoStatus {
  version: string
  updatedDate: string
  updateStatus: boolean
  detected: boolean
  free: boolean
  platform: string
  uncPercentage: number | null
  suncPercentage: number | null
  keysystem: boolean
}

interface WeaoData {
  robloxVersion: string
  robloxVersionDate: string
  updatedAt: string
  executors: Record<string, WeaoStatus>
}

/** Shown until the live list loads from /api/public/executors. */
const FALLBACK_EXECUTORS: Executor[] = [
  { name: 'Potassium', status: 'supported' },
  { name: 'Seliware', status: 'supported' },
  { name: 'Delta', status: 'supported' },
  { name: 'Codex', status: 'supported' },
  { name: 'Wave', status: 'supported' },
  { name: 'Xeno', status: 'unsupported' },
  { name: 'Solara', status: 'unsupported' },
]

const REFRESH_INTERVAL = 60 // seconds between auto-refreshes

function timeAgo(iso?: string) {
  if (!iso) return 'Unknown'
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return 'Recently'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/** Animated SVG donut showing the % of scripts that are operational. */
function HealthRing({ pct, loading }: { pct: number; loading: boolean }) {
  const R = 52
  const CIRC = 2 * Math.PI * R
  const offset = CIRC - (CIRC * pct) / 100
  return (
    <div className="relative w-32 h-32 shrink-0" role="img" aria-label={`${pct}% of scripts operational`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={loading ? 'rgba(255,255,255,0.2)' : pct === 100 ? '#00ff88' : pct >= 50 ? '#ffffff' : '#ff3333'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={loading ? CIRC : offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <span className="font-heading text-lg text-silver-muted animate-pulse">--</span>
        ) : (
          <>
            <span className="font-heading text-2xl text-white tabular-nums">{pct}%</span>
            <span className="font-body text-[10px] text-silver-muted tracking-widest uppercase">Healthy</span>
          </>
        )}
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, accent, loading }: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: 'success' | 'danger'
  loading: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-black-card border border-border-dim rounded-xl p-4 transition-all duration-300 hover:border-silver-faint hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-silver-muted group-hover:text-white transition-colors duration-300">{icon}</span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            accent === 'success' ? 'bg-success shadow-[0_0_6px_rgba(0,255,136,0.7)]'
              : accent === 'danger' ? 'bg-danger shadow-[0_0_6px_rgba(255,51,51,0.7)]'
              : 'bg-silver-faint'
          }`}
          aria-hidden="true"
        />
      </div>
      {loading ? (
        <div className="h-8 w-14 bg-black-elevated rounded animate-pulse mb-1" />
      ) : (
        <p className="font-heading text-3xl text-white tabular-nums leading-none mb-1">{value}</p>
      )}
      <p className="font-body text-[11px] text-silver-muted tracking-wider uppercase">{label}</p>
    </div>
  )
}

type ScriptFilter = 'all' | 'working' | 'updating'

export default function StatusPage() {
  const [games, setGames] = useState<GameStatus[]>([])
  const [executors, setExecutors] = useState<Executor[]>(FALLBACK_EXECUTORS)
  const [weao, setWeao] = useState<WeaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [filter, setFilter] = useState<ScriptFilter>('all')
  const [query, setQuery] = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadAll = useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setCountdown(REFRESH_INTERVAL)
    fetch('/api/public/games')
      .then(r => r.json())
      .then(data => {
        setGames(Array.isArray(data) ? data : [])
        setLastChecked(new Date())
        setLoading(false)
      })
      .catch(() => {
        setLastChecked(new Date())
        setLoading(false)
      })
    fetch('/api/public/executors')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setExecutors(data)
      })
      .catch(() => { /* keep fallback list */ })
    fetch('/api/public/weao')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.executors === 'object') setWeao(data)
      })
      .catch(() => { /* WEAO down — cards just skip the live row */ })
  }, [])

  // Initial load + auto-refresh with visible countdown
  useEffect(() => {
    loadAll()
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadAll(false)
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [loadAll])

  /** Match one of our executors to its live WEAO record by name. */
  const weaoFor = useCallback(
    (name: string): WeaoStatus | null => {
      if (!weao) return null
      const key = name.trim().toLowerCase()
      if (weao.executors[key]) return weao.executors[key]
      // Loose match: "Macsploit" vs "MacSploit", "Arceus X" vs "Arceus"
      const hit = Object.keys(weao.executors).find(
        k => k.replace(/[^a-z0-9]/g, '') === key.replace(/[^a-z0-9]/g, ''),
      )
      return hit ? weao.executors[hit] : null
    },
    [weao],
  )

  const activeCount = useMemo(() => games.filter(g => g.status === 'active').length, [games])
  const outdatedCount = games.length - activeCount
  const allOperational = games.length > 0 && outdatedCount === 0
  const healthPct = games.length === 0 ? 100 : Math.round((activeCount / games.length) * 100)
  const supportedExecs = executors.filter(e => e.status === 'supported')
  const unsupportedExecs = executors.filter(e => e.status === 'unsupported')

  const visibleGames = useMemo(() => {
    let list = games
    if (filter === 'working') list = list.filter(g => g.status === 'active')
    if (filter === 'updating') list = list.filter(g => g.status !== 'active')
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(g => g.name.toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q))
    }
    return list
  }, [games, filter, query])

  const filterTabs: { key: ScriptFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: games.length },
    { key: 'working', label: 'Working', count: activeCount },
    { key: 'updating', label: 'Updating', count: outdatedCount },
  ]

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />
        <main className="pt-24 pb-20 px-4">
          <div className="max-w-5xl mx-auto">

            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-dim bg-black-card mb-4">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${allOperational || loading ? 'bg-success' : 'bg-danger'}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${allOperational || loading ? 'bg-success' : 'bg-danger'}`} />
                </span>
                <span className="font-body text-xs text-silver-mid tracking-widest uppercase">Live System Status</span>
              </div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-white mb-3 text-balance">SCRIPT STATUS</h1>
              <p className="font-body text-silver-mid text-sm md:text-base text-pretty max-w-xl mx-auto">
                Real-time health of every supported script and executor. Auto-refreshes every {REFRESH_INTERVAL}s.
              </p>
            </div>

            {/* Command-center overview */}
            <div className="bg-black-card border border-border-mid rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
              {/* signature gradient accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))' }}
                aria-hidden="true"
              />
              {/* subtle scanline texture */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)' }}
                aria-hidden="true"
              />
              <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <HealthRing pct={healthPct} loading={loading} />
                <div className="flex-1 text-center md:text-left">
                  <p className="font-heading text-xl md:text-2xl text-white mb-1">
                    {loading
                      ? 'RUNNING DIAGNOSTICS...'
                      : allOperational
                        ? 'ALL SYSTEMS OPERATIONAL'
                        : `${outdatedCount} SCRIPT${outdatedCount === 1 ? '' : 'S'} UNDER MAINTENANCE`}
                  </p>
                  <p className="font-body text-sm text-silver-muted mb-4">
                    {lastChecked
                      ? `Last checked ${lastChecked.toLocaleTimeString()} — next refresh in ${countdown}s`
                      : 'Fetching latest data...'}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => loadAll()}
                      disabled={loading}
                      className="btn-primary !rounded-md !px-4 !py-2 text-sm font-medium disabled:pointer-events-none"
                    >
                      <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} />
                      <span>Refresh Now</span>
                    </button>
                    {/* countdown progress */}
                    <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
                      <div className="w-24 h-1 bg-black-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100}%`,
                            background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))',
                            transition: 'width 1s linear',
                          }}
                        />
                      </div>
                      <span className="font-body text-xs text-silver-faint tabular-nums">{countdown}s</span>
                    </div>
                  </div>
                </div>
                {/* Stat tiles */}
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[280px]">
                  <StatTile icon={<GamesIcon size={16} />} label="Total Scripts" value={games.length} loading={loading} />
                  <StatTile icon={<CheckIcon size={16} />} label="Working" value={activeCount} accent="success" loading={loading} />
                  <StatTile icon={<AlertIcon size={16} />} label="Updating" value={outdatedCount} accent={outdatedCount > 0 ? 'danger' : undefined} loading={loading} />
                  <StatTile icon={<BoltIcon size={16} />} label="Executors" value={supportedExecs.length} accent="success" loading={loading} />
                </div>
              </div>
            </div>

            {/* Scripts section */}
            <section aria-label="Script status list" className="mb-14">
              <div className="flex items-center gap-2 mb-4">
                <ActivityIcon size={16} className="text-white" />
                <h2 className="font-heading text-sm tracking-widest text-white">SCRIPTS</h2>
                <div className="flex-1 h-px bg-border-dim" />
              </div>

              {/* Search + filter toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search scripts..."
                    aria-label="Search scripts"
                    className="w-full bg-black-card border border-border-dim rounded-lg pl-4 pr-4 py-2.5 font-body text-sm text-white placeholder:text-silver-faint focus:outline-none focus:border-silver-muted transition-colors duration-200"
                  />
                </div>
                <div className="flex items-center gap-1 bg-black-card border border-border-dim rounded-lg p-1" role="tablist" aria-label="Filter scripts">
                  {filterTabs.map(tab => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={filter === tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`px-3.5 py-1.5 rounded-md font-body text-xs transition-all duration-200 ${
                        filter === tab.key ? 'bg-white text-black font-medium' : 'text-silver-muted hover:text-white'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1.5 tabular-nums ${filter === tab.key ? 'text-black/60' : 'text-silver-faint'}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-black-card border border-border-dim rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  ))
                ) : visibleGames.length > 0 ? (
                  visibleGames.map((game, i) => {
                    const isActive = game.status === 'active'
                    return (
                      <div
                        key={game.id}
                        className="admin-stagger flex items-center justify-between gap-4 bg-black-card border border-border-dim rounded-lg px-5 py-4 transition-all duration-200 hover:border-silver-faint hover:bg-black-elevated"
                        style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                            {isActive && <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" style={{ animationDuration: '2.5s' }} />}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-success shadow-[0_0_8px_rgba(0,255,136,0.6)]' : 'bg-danger shadow-[0_0_8px_rgba(255,51,51,0.5)]'}`} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-body text-sm text-white truncate">{game.name}</p>
                            <div className="flex items-center gap-2">
                              {game.category && (
                                <p className="font-body text-xs text-silver-muted capitalize">{game.category}</p>
                              )}
                              <span className="sm:hidden font-body text-xs text-silver-faint">· {timeAgo(game.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="hidden sm:block font-body text-xs text-silver-muted tabular-nums">
                            Updated {timeAgo(game.updatedAt)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs ${
                              isActive
                                ? 'bg-success/10 text-success border border-success/30'
                                : 'bg-danger/10 text-danger border border-danger/30'
                            }`}
                          >
                            {isActive ? <CheckIcon size={12} /> : <RefreshIcon size={12} className="animate-spin" style={{ animationDuration: '3s' }} />}
                            {isActive ? 'Operational' : 'Updating'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 bg-black-card border border-border-dim rounded-lg">
                    <p className="font-body text-silver-muted text-sm">
                      {query.trim() || filter !== 'all' ? 'No scripts match your search.' : 'No scripts found. Check back soon.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Executor compatibility */}
            <section aria-label="Executor compatibility">
              <div className="flex items-center gap-2 mb-1">
                <TerminalIcon size={16} className="text-white" />
                <h2 className="font-heading text-sm tracking-widest text-white">EXECUTOR COMPATIBILITY</h2>
                <div className="flex-1 h-px bg-border-dim" />
              </div>
              <p className="font-body text-xs text-silver-muted mb-2">
                Confirmed working and not working executors for VoidHub scripts.
                Live update status auto-syncs from WEAO.
              </p>
              {weao?.robloxVersion && (
                <p className="font-body text-xs text-silver-faint mb-5">
                  Current Roblox version:{' '}
                  <span className="text-silver-mid font-mono">{weao.robloxVersion}</span>
                </p>
              )}

              {/* Working */}
              <div className="mb-6 mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(0,255,136,0.6)]" aria-hidden="true" />
                  <h3 className="font-body text-xs tracking-widest text-success uppercase">Working ({supportedExecs.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {supportedExecs.map((exec, i) => {
                    const live = weaoFor(exec.name)
                    return (
                      <div
                        key={exec.name}
                        className="admin-stagger group flex items-center justify-between bg-black-card border border-border-dim rounded-lg px-4 py-3 transition-all duration-200 hover:border-success/40 hover:-translate-y-0.5"
                        style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ExecutorIcon name={exec.name} icon={exec.icon} size={36} />
                          <div className="min-w-0">
                            <p className="font-body text-sm text-white truncate">{exec.name}</p>
                            {live ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 font-body text-[11px] ${
                                    live.updateStatus ? 'text-success' : 'text-danger'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${live.updateStatus ? 'bg-success' : 'bg-danger'}`}
                                    aria-hidden="true"
                                  />
                                  {live.updateStatus ? 'Updated' : 'Down'}
                                </span>
                                {live.version && (
                                  <span className="font-body text-[11px] text-silver-faint font-mono">v{live.version}</span>
                                )}
                              </div>
                            ) : exec.link ? (
                              <a
                                href={exec.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-body text-xs text-silver-muted underline underline-offset-2 hover:text-white transition-colors duration-200"
                              >
                                {exec.linkLabel || 'Official Link'}
                              </a>
                            ) : (
                              <p className="font-body text-xs text-silver-faint">Verified compatible</p>
                            )}
                          </div>
                        </div>
                        {live && !live.updateStatus ? (
                          <AlertIcon size={16} className="text-danger shrink-0 opacity-80" />
                        ) : (
                          <CheckIcon size={16} className="text-success shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Not working */}
              {unsupportedExecs.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_8px_rgba(255,51,51,0.6)]" aria-hidden="true" />
                    <h3 className="font-body text-xs tracking-widest text-danger uppercase">Not Working ({unsupportedExecs.length})</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unsupportedExecs.map((exec, i) => (
                      <div
                        key={exec.name}
                        className="admin-stagger flex items-center justify-between bg-black-card border border-border-dim rounded-lg px-4 py-3 opacity-60 transition-all duration-200 hover:opacity-90 hover:border-danger/30"
                        style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ExecutorIcon name={exec.name} icon={exec.icon} size={36} />
                          <div className="min-w-0">
                            <p className="font-body text-sm text-white truncate">{exec.name}</p>
                            <p className="font-body text-xs text-silver-faint">Incompatible</p>
                          </div>
                        </div>
                        <AlertIcon size={16} className="text-danger shrink-0 opacity-70" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-black-card border border-border-dim rounded-lg p-4 text-center">
                <p className="font-body text-xs text-silver-mid mb-1">
                  Tip: the safest site to get your executors from is{' '}
                  <a
                    href="https://whatexpsare.online/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline underline-offset-2 hover:text-silver-bright transition-colors duration-200"
                  >
                    whatexpsare.online
                  </a>
                </p>
                <p className="font-body text-xs text-silver-faint">
                  Using an executor that isn&apos;t listed? Confirm whether it works with the script in our Discord and we&apos;ll add it.
                </p>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
