'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import ExecutorIcon from '@/components/ExecutorIcon'
import { useRobloxInfo, placeIdOf } from '@/lib/roblox-info'
import { RefreshIcon, SearchIcon, GlobeIcon, DiscordIcon, ExternalIcon, ChevronDownIcon } from '@/components/Icons'

interface GameStatus {
  id: string
  name: string
  status: string
  category?: string
  updatedAt?: string
  thumbnail?: string
  placeId?: string
  robloxUrl?: string
}

interface Executor {
  name: string
  status: 'supported' | 'unsupported'
  websiteUrl?: string
  discordUrl?: string
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
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return 'recently'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

type ScriptFilter = 'all' | 'working' | 'updating'

export default function StatusPage() {
  const [games, setGames] = useState<GameStatus[]>([])
  const [executors, setExecutors] = useState<Executor[]>(FALLBACK_EXECUTORS)
  const [weao, setWeao] = useState<WeaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [filter, setFilter] = useState<ScriptFilter>('all')
  const [query, setQuery] = useState('')
  const [showBroken, setShowBroken] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadAll = useCallback(() => {
    setRefreshing(true)
    setCountdown(REFRESH_INTERVAL)
    Promise.allSettled([
      fetch('/api/public/games').then(r => r.json()).then(d => setGames(Array.isArray(d) ? d : [])),
      fetch('/api/public/executors').then(r => r.json()).then(d => { if (Array.isArray(d) && d.length) setExecutors(d) }),
      fetch('/api/public/weao').then(r => r.json()).then(d => { if (d && typeof d.executors === 'object') setWeao(d) }),
    ]).finally(() => {
      setLastChecked(new Date())
      setLoading(false)
      setRefreshing(false)
    })
  }, [])

  useEffect(() => {
    loadAll()
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { loadAll(); return REFRESH_INTERVAL }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [loadAll])

  /** Match one of our executors to its live WEAO record by name. */
  const weaoFor = useCallback((name: string): WeaoStatus | null => {
    if (!weao) return null
    const key = name.trim().toLowerCase()
    if (weao.executors[key]) return weao.executors[key]
    const flat = key.replace(/[^a-z0-9]/g, '')
    const hit = Object.keys(weao.executors).find(k => k.replace(/[^a-z0-9]/g, '') === flat)
    return hit ? weao.executors[hit] : null
  }, [weao])

  const working = useMemo(() => games.filter(g => g.status === 'active').length, [games])
  const updating = games.length - working
  const supported = executors.filter(e => e.status === 'supported')
  const unsupported = executors.filter(e => e.status === 'unsupported')
  const execsDown = supported.filter(e => weaoFor(e.name)?.updateStatus === false).length

  const state: 'loading' | 'ok' | 'partial' =
    loading ? 'loading' : updating === 0 ? 'ok' : 'partial'

  const visibleGames = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games
      .filter(g => filter === 'all' || (filter === 'working' ? g.status === 'active' : g.status !== 'active'))
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q))
      .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? 1 : -1))
  }, [games, filter, query])

  const ringPct = ((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black font-display">
        <Navbar />

        {/* Hero status banner */}
        <section className="relative px-4 pt-28 md:pt-36 pb-10 mono-grain">
          <div className="absolute inset-0 mono-spot pointer-events-none" />
          <div className="absolute inset-0 mono-dots pointer-events-none" />
          <div className="relative max-w-6xl mx-auto">
            <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">System status</p>
            <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <span className="relative mt-3 md:mt-5 flex w-4 h-4 shrink-0">
                  {state !== 'loading' && (
                    <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${state === 'ok' ? 'bg-success' : 'bg-warning'}`} />
                  )}
                  <span className={`relative w-4 h-4 rounded-full ${state === 'loading' ? 'bg-[#444]' : state === 'ok' ? 'bg-success shadow-[0_0_18px_rgba(74,222,128,0.7)]' : 'bg-warning shadow-[0_0_18px_rgba(251,191,36,0.6)]'}`} />
                </span>
                <h1 className="font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.3rem,6vw,4.4rem)] text-chrome">
                  {state === 'loading' ? 'Checking systems…' : state === 'ok' ? 'All systems operational' : `${updating} ${updating === 1 ? 'script is' : 'scripts are'} updating`}
                </h1>
              </div>

              <button
                onClick={loadAll}
                disabled={refreshing}
                className="group self-start md:self-auto flex items-center gap-3 h-12 pl-2 pr-5 rounded-full border border-[#262626] bg-[#0a0a0a] hover:border-[#444] transition-colors disabled:opacity-60"
                aria-label="Refresh now"
              >
                <span className="relative w-8 h-8">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#222" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={94.2} strokeDashoffset={94.2 - (94.2 * ringPct) / 100}
                      style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <RefreshIcon size={13} className={`absolute inset-0 m-auto text-white ${refreshing ? 'animate-spin' : ''}`} />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm text-white">Refresh</span>
                  <span className="block font-gmono text-[0.65rem] text-[#6b6b6b]">
                    {lastChecked ? `checked ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${countdown}s` : 'loading…'}
                  </span>
                </span>
              </button>
            </div>

            {/* Summary strip */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-[#1c1c1c] bg-[#070707]/80 backdrop-blur divide-[#1c1c1c] divide-y md:divide-y-0 md:divide-x [&>*:nth-child(2)]:border-l [&>*:nth-child(2)]:border-[#1c1c1c] md:[&>*:nth-child(2)]:border-l-0">
              {[
                { label: 'Scripts', value: games.length, sub: 'in the library' },
                { label: 'Working', value: working, sub: 'running fine', dot: 'bg-success' },
                { label: 'Updating', value: updating, sub: 'being patched', dot: updating ? 'bg-warning' : 'bg-[#333]' },
                { label: 'Executors', value: supported.length - execsDown, sub: `of ${supported.length} ready now`, dot: 'bg-white' },
              ].map(s => (
                <div key={s.label} className="px-5 py-5">
                  <p className="flex items-center gap-2 font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b]">
                    {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}{s.label}
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tighter text-white tabular-nums">{loading ? '–' : s.value}</p>
                  <p className="text-xs text-[#6b6b6b]">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="px-4 pb-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-10 items-start">
            {/* Scripts */}
            <section aria-label="Scripts">
              <div className="flex items-end justify-between gap-3 mb-4">
                <h2 className="text-2xl font-semibold tracking-tight text-white">Scripts</h2>
                <div className="flex items-center gap-1 p-1 rounded-full border border-[#1f1f1f] bg-[#0a0a0a]" role="tablist">
                  {([['all', 'All', games.length], ['working', 'Working', working], ['updating', 'Updating', updating]] as const).map(([key, label, n]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={`h-8 px-3 rounded-full text-xs transition-colors ${filter === key ? 'bg-white text-black' : 'text-[#8a8a8a] hover:text-white'}`}
                    >
                      {label} <span className={filter === key ? 'text-black/50' : 'text-[#444]'}>{n}</span>
                    </button>
                  ))}
                </div>
              </div>

              {games.length > 6 && (
                <div className="relative mb-3">
                  <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Find a script…"
                    aria-label="Search scripts"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-white text-[16px] md:text-sm placeholder:text-[#555] focus:outline-none focus:border-[#444]"
                  />
                </div>
              )}

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden divide-y divide-[#161616]">
                {loading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-4">
                      <div className="w-11 h-11 rounded-xl bg-[#141414] animate-pulse" />
                      <div className="flex-1"><div className="h-3.5 w-1/3 rounded bg-[#141414] animate-pulse" /><div className="mt-2 h-3 w-1/5 rounded bg-[#111] animate-pulse" /></div>
                    </div>
                  ))
                ) : visibleGames.length ? (
                  visibleGames.map(g => <ScriptRow key={g.id} game={g} />)
                ) : (
                  <div className="px-6 py-14 text-center">
                    <p className="text-white">{games.length ? 'Nothing matches that.' : 'No scripts yet.'}</p>
                    <p className="mt-1 text-sm text-[#6b6b6b]">
                      {games.length ? 'Try another filter.' : 'The library was reset. Games are being added back.'}
                    </p>
                    {!games.length && <Link href="/games" className="btn-outline h-10 px-5 mt-5 text-sm">Games page</Link>}
                  </div>
                )}
              </div>
            </section>

            {/* Executors */}
            <section aria-label="Executors" className="lg:sticky lg:top-24">
              <div className="flex items-end justify-between gap-3 mb-4">
                <h2 className="text-2xl font-semibold tracking-tight text-white">Executors</h2>
                {weao?.robloxVersion && (
                  <span className="font-gmono text-[0.62rem] text-[#6b6b6b] truncate max-w-[55%]" title={weao.robloxVersion}>
                    roblox {weao.robloxVersion.replace(/^version-/, '').slice(0, 10)}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden divide-y divide-[#161616]">
                {supported.map(exec => <ExecutorRow key={exec.name} exec={exec} live={weaoFor(exec.name)} />)}
              </div>

              {unsupported.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
                  <button
                    onClick={() => setShowBroken(v => !v)}
                    className="w-full flex items-center justify-between px-4 h-12 text-sm text-[#a3a3a3] hover:text-white"
                    aria-expanded={showBroken}
                  >
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger" /> Don&apos;t work with VoidHub ({unsupported.length})</span>
                    <ChevronDownIcon size={16} className={`transition-transform ${showBroken ? 'rotate-180' : ''}`} />
                  </button>
                  {showBroken && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {unsupported.map(e => (
                        <span key={e.name} className="inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-[#222] text-sm text-[#8a8a8a]">
                          <ExecutorIcon name={e.name} icon={e.icon} size={26} className="!rounded-full" />
                          <span className="line-through decoration-[#555]">{e.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <a
                href="https://whatexpsare.online/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-3 rounded-2xl border border-[#1c1c1c] bg-[#070707] px-4 py-4 hover:border-[#333] transition-colors"
              >
                <GlobeIcon size={16} className="text-[#8a8a8a] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white">Get executors safely</span>
                  <span className="block text-xs text-[#6b6b6b]">Live data from whatexpsare.online. Using something unlisted? Ask in the Discord.</span>
                </span>
                <ExternalIcon size={14} className="text-[#555] shrink-0" />
              </a>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </ToastProvider>
  )
}

function ScriptRow({ game }: { game: GameStatus }) {
  const info = useRobloxInfo(placeIdOf(game))
  const icon = game.thumbnail || info?.thumbnail
  const ok = game.status === 'active'
  return (
    <Link href={`/games?game=${game.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <span className="w-11 h-11 rounded-xl overflow-hidden border border-[#222] bg-[#141414] shrink-0">
        {icon
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={icon} alt="" className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center text-sm font-semibold text-white">{game.name.slice(0, 1)}</span>}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[0.95rem] text-white truncate">{game.name}</span>
        <span className="block text-xs text-[#6b6b6b] truncate">
          {game.category ? `${game.category} · ` : ''}updated {timeAgo(game.updatedAt)}
        </span>
      </span>
      <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs shrink-0 border ${
        ok ? 'border-success/25 text-success bg-success/[0.06]' : 'border-warning/30 text-warning bg-warning/[0.06]'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning animate-pulse'}`} />
        {ok ? 'Working' : 'Updating'}
      </span>
    </Link>
  )
}

function ExecutorRow({ exec, live }: { exec: Executor; live: WeaoStatus | null }) {
  const down = live?.updateStatus === false
  const tags = [
    live?.platform,
    live ? (live.free ? 'Free' : 'Paid') : null,
    live?.uncPercentage != null ? `${live.uncPercentage}% UNC` : null,
  ].filter(Boolean) as string[]
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <ExecutorIcon name={exec.name} icon={exec.icon} size={40} className="!rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[0.95rem] text-white truncate">{exec.name}</span>
            {live?.version && <span className="font-gmono text-[0.62rem] text-[#555] truncate">v{live.version}</span>}
          </div>
          {tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map(t => <span key={t} className="h-5 px-1.5 rounded-md border border-[#222] font-gmono text-[0.6rem] text-[#8a8a8a] flex items-center">{t}</span>)}
            </div>
          ) : (
            <span className="block text-xs text-[#6b6b6b]">Tested with VoidHub</span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs shrink-0 border ${
          down ? 'border-danger/30 text-danger bg-danger/[0.06]' : 'border-success/25 text-success bg-success/[0.06]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${down ? 'bg-danger' : 'bg-success'}`} />
          {down ? 'Down' : 'Ready'}
        </span>
      </div>
      {(exec.websiteUrl || exec.discordUrl) && (
        <div className="mt-2.5 ml-[52px] flex gap-4">
          {exec.websiteUrl && (
            <a href={exec.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#6b6b6b] hover:text-white"><GlobeIcon size={12} /> Website</a>
          )}
          {exec.discordUrl && (
            <a href={exec.discordUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#6b6b6b] hover:text-white"><DiscordIcon size={12} /> Discord</a>
          )}
        </div>
      )}
    </div>
  )
}
