'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRobloxInfo, placeIdOf, compact } from '@/lib/roblox-info'
import { PlusIcon, TerminalIcon, SettingsIcon, ActivityIcon, GamesIcon, BoltIcon, CopyIcon, ChevronRightIcon, ExternalIcon } from '@/components/Icons'
import { getCopyCount, getActivityLog, getLoadstring, getUsername, type ActivityLogEntry, type Game } from '@/lib/storage'
import { useToast } from '@/components/Toast'
import LoaderAnalytics from '@/components/LoaderAnalytics'
import { StatStrip } from '@/components/AdminUI'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function AdminDashboardPage() {
  const { showToast } = useToast()
  const [games, setGames] = useState<Game[] | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([])
  const [loaderSource, setLoaderSource] = useState<'raw-url' | 'database' | 'none' | 'error' | null>(null)
  const [storage, setStorage] = useState<{ ok: boolean; latencyMs: number | null; objects: number; totalBytes: number } | null>(null)
  const [loadstring, setLoadstringText] = useState('')
  const [copies, setCopies] = useState(0)
  const [name, setName] = useState('')

  useEffect(() => {
    setLoadstringText(getLoadstring())
    setCopies(getCopyCount())
    setName(getUsername() || 'admin')
    setRecentActivity(getActivityLog().slice(0, 6))
    const h = { headers: { 'x-admin-key': getAdminKey() } }

    fetch('/api/admin/health', h)
      .then(r => (r.ok ? r.json() : { ok: false }))
      .then(d => setStorage({ ok: !!d.ok, latencyMs: d.latencyMs ?? null, objects: d.objects ?? 0, totalBytes: d.totalBytes ?? 0 }))
      .catch(() => setStorage({ ok: false, latencyMs: null, objects: 0, totalBytes: 0 }))

    fetch('/api/admin/games', h)
      .then(r => r.json())
      .then(d => setGames(Array.isArray(d) ? d : []))
      .catch(() => setGames([]))

    fetch('/api/admin/loader', h)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setLoaderSource(d.source || 'none'))
      .catch(() => setLoaderSource('error'))
  }, [])

  const list = games ?? []
  const working = list.filter(g => g.status === 'active').length
  const fresh = list.filter(g => Date.now() - new Date(g.createdAt).getTime() < 7 * 864e5).length
  const loaderText = { 'raw-url': 'Hidden URL', database: 'Pasted script', none: 'Not set up', error: 'Unreachable' }

  const copyLoadstring = () => {
    navigator.clipboard.writeText(loadstring)
    showToast('Loadstring copied', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Greeting + health */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-gmono text-[0.65rem] uppercase tracking-[0.2em] text-[#555] mb-2">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.035em] text-chrome">{greeting()}, {name}.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-[#1f1f1f] bg-[#0a0a0a] text-xs text-[#a3a3a3]">
            <span className={`w-1.5 h-1.5 rounded-full ${storage === null ? 'bg-[#444]' : storage.ok ? 'bg-success' : 'bg-danger'}`} />
            {storage === null ? 'Checking R2…' : storage.ok ? `R2 online${storage.latencyMs != null ? ` · ${storage.latencyMs}ms` : ''}` : 'R2 offline'}
          </span>
          <Link href="/admin/loader" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-[#1f1f1f] bg-[#0a0a0a] text-xs text-[#a3a3a3] hover:text-white">
            <span className={`w-1.5 h-1.5 rounded-full ${loaderSource === null ? 'bg-[#444]' : loaderSource === 'raw-url' || loaderSource === 'database' ? 'bg-success' : 'bg-warning'}`} />
            Loader: {loaderSource ? loaderText[loaderSource] : '…'}
          </Link>
        </div>
      </header>

      <LoaderAnalytics />

      <StatStrip items={[
        { label: 'Games', value: games ? list.length : '–', sub: 'in the library' },
        { label: 'Working', value: games ? working : '–', sub: 'scripts running fine', dot: 'bg-success' },
        { label: 'Updating', value: games ? list.length - working : '–', sub: 'need a fix', dot: list.length - working ? 'bg-warning' : 'bg-[#333]' },
        { label: 'New this week', value: games ? fresh : '–', sub: 'with the just-added glow', dot: 'bg-white' },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        {/* Recent games */}
        <section className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
          <div className="flex items-center justify-between px-5 h-14 border-b border-[#161616]">
            <h2 className="text-base font-semibold tracking-tight text-white">Latest games</h2>
            <Link href="/admin/games" className="text-xs text-[#8a8a8a] hover:text-white flex items-center gap-1">All games <ChevronRightIcon size={12} /></Link>
          </div>
          {games === null ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-12 rounded-xl bg-[#101010] animate-pulse" />)}</div>
          ) : list.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-white">No games yet</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">Paste a Roblox link and it fills itself in.</p>
              <Link href="/admin/games?action=add" className="btn-white h-10 px-5 mt-5 text-sm"><PlusIcon size={14} /> Add your first game</Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#141414]">
              {list.slice(0, 6).map(g => <GameRow key={g.id} game={g} />)}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-2">
            {[
              { href: '/admin/games?action=add', icon: PlusIcon, label: 'Add game', primary: true },
              { href: '/admin/loader', icon: TerminalIcon, label: 'Edit loader' },
              { href: '/admin/executors', icon: BoltIcon, label: 'Executors' },
              { href: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className={`group rounded-2xl border p-4 flex flex-col gap-6 transition-colors ${a.primary ? 'bg-white text-black border-white hover:bg-[#e9e9e9]' : 'border-[#1c1c1c] bg-[#070707] text-white hover:border-[#333]'}`}
              >
                <a.icon size={18} />
                <span className="flex items-center justify-between text-sm font-medium">{a.label}<ChevronRightIcon size={14} className="opacity-50 group-hover:translate-x-0.5 transition-transform" /></span>
              </Link>
            ))}
          </section>

          {/* Loadstring */}
          <section className="rounded-2xl border border-[#1c1c1c] bg-[#070707] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold tracking-tight text-white">Public loadstring</h2>
              <span className="font-gmono text-[0.62rem] text-[#6b6b6b]">{copies} copies here</span>
            </div>
            <code className="block rounded-xl border border-[#1a1a1a] bg-black px-3.5 py-3 font-gmono text-[0.72rem] text-[#d4d4d4] break-all">{loadstring}</code>
            <div className="mt-3 flex gap-2">
              <button onClick={copyLoadstring} className="btn-outline h-9 px-4 text-xs"><CopyIcon size={13} /> Copy</button>
              <a href="/" target="_blank" rel="noopener noreferrer" className="btn-outline h-9 px-4 text-xs"><ExternalIcon size={13} /> View site</a>
            </div>
          </section>

          {/* Activity */}
          <section className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#161616]">
              <h2 className="text-base font-semibold tracking-tight text-white">Recent activity</h2>
              <Link href="/admin/activity" className="text-xs text-[#8a8a8a] hover:text-white flex items-center gap-1">All <ChevronRightIcon size={12} /></Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[#6b6b6b] text-center">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-[#141414]">
                {recentActivity.map(e => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <ActivityIcon size={13} className="text-[#555] shrink-0" />
                    <span className="flex-1 min-w-0 text-sm text-[#d4d4d4] truncate">{e.message}</span>
                    <span className="font-gmono text-[0.62rem] text-[#555] shrink-0">{ago(e.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function GameRow({ game }: { game: Game }) {
  const info = useRobloxInfo(placeIdOf(game))
  const icon = game.thumbnail || info?.thumbnail
  const ok = game.status === 'active'
  return (
    <li>
      <Link href="/admin/games" className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02]">
        <span className="w-10 h-10 rounded-xl overflow-hidden border border-[#222] bg-[#141414] shrink-0 flex items-center justify-center">
          {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <GamesIcon size={15} className="text-[#555]" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-white truncate">{game.name}</span>
          <span className="block text-xs text-[#6b6b6b]">
            added {ago(game.createdAt)}{info?.playing != null ? ` · ${compact(info.playing)} playing` : ''}
          </span>
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-success' : 'text-warning'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`} />{ok ? 'Working' : 'Updating'}
        </span>
      </Link>
    </li>
  )
}
