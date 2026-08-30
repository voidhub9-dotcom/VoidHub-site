'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChartIcon,
  CheckIcon,
  AlertIcon,
  CopyIcon,
  PlusIcon,
  TerminalIcon,
  SettingsIcon,
  ActivityIcon,
  GamesIcon,
  ImageIcon,
  ShieldIcon,
  StarIcon,
  EyeOffIcon,
  BoltIcon,
  ShopIcon,
  CartIcon,
} from '@/components/Icons'
import {
  getCopyCount,
  getActivityLog,
  getLoadstring,
  ActivityLogEntry,
  Game,
} from '@/lib/storage'
import { useToast } from '@/components/Toast'
import LoaderAnalytics from '@/components/LoaderAnalytics'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

export default function AdminDashboardPage() {
  const { showToast } = useToast()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    outdated: 0,
    featured: 0,
    copies: 0,
  })
  const [shopStats, setShopStats] = useState({ orders: 0, fulfilled: 0, revenueCents: 0 })
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([])
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [loaderSource, setLoaderSource] = useState<'raw-url' | 'database' | 'none' | 'error'>('none')
  const [storageOk, setStorageOk] = useState<boolean | null>(null)
  const [storageInfo, setStorageInfo] = useState<{ latencyMs: number | null; objects: number; totalBytes: number } | null>(null)
  const [loadstring, setLoadstringText] = useState('')

  useEffect(() => {
    setLoadstringText(getLoadstring())

    const loadData = async () => {
      // Real R2 health probe (write -> read -> delete round-trip)
      try {
        const healthRes = await fetch('/api/admin/health', { headers: { 'x-admin-key': getAdminKey() } })
        if (healthRes.ok) {
          const h = await healthRes.json()
          setStorageOk(h.ok)
          setStorageInfo({ latencyMs: h.latencyMs, objects: h.objects, totalBytes: h.totalBytes })
        } else {
          setStorageOk(false)
        }
      } catch {
        setStorageOk(false)
      }

      // Games
      try {
        const gamesRes = await fetch('/api/admin/games', { headers: { 'x-admin-key': getAdminKey() } })
        const games = await gamesRes.json()
        const list: Game[] = Array.isArray(games) ? games : []

        setStats({
          total: list.length,
          active: list.filter(g => g.status === 'active').length,
          outdated: list.filter(g => g.status === 'outdated').length,
          featured: list.filter(g => g.featured).length,
          copies: getCopyCount(),
        })
        setRecentGames(list.slice(0, 5))
      } catch {
        /* health probe above is the authoritative storage status */
      }

      // Loader source
      try {
        const loaderRes = await fetch('/api/admin/loader', { headers: { 'x-admin-key': getAdminKey() } })
        if (loaderRes.ok) {
          const data = await loaderRes.json()
          setLoaderSource(data.source || 'none')
        } else {
          setLoaderSource('error')
        }
      } catch {
        setLoaderSource('error')
      }

      // Shop orders
      try {
        const ordersRes = await fetch('/api/admin/shop/orders', { headers: { 'x-admin-key': getAdminKey() } })
        if (ordersRes.ok) {
          const allOrders: { status: string; amountTotal: number; currency: string; isTest?: boolean }[] = await ordersRes.json()
          const orders = allOrders.filter(o => !o.isTest)
          const fulfilled = orders.filter(o => o.status === 'fulfilled')
          setShopStats({
            orders: orders.length,
            fulfilled: fulfilled.length,
            revenueCents: fulfilled.reduce((sum, o) => sum + o.amountTotal, 0),
          })
        }
      } catch {
        /* shop stats are supplemental, ignore failures */
      }

      setRecentActivity(getActivityLog().slice(0, 6))
    }
    loadData()
  }, [])

  const handleCopyLoadstring = () => {
    navigator.clipboard.writeText(loadstring)
    showToast('Loadstring copied!', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl text-white tracking-wider">DASHBOARD</h1>
          <p className="font-body text-sm text-silver-muted">VoidHub control center overview</p>
        </div>
        {storageOk !== null && (
          <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-body ${
            storageOk ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${storageOk ? 'bg-success' : 'bg-danger'}`} />
            {storageOk
              ? `R2 Online${storageInfo?.latencyMs != null ? ` · ${storageInfo.latencyMs}ms` : ''}${storageInfo ? ` · ${storageInfo.objects} objects · ${(storageInfo.totalBytes / 1024).toFixed(1)} KB` : ''}`
              : 'R2 Storage Offline'}
          </div>
        )}
      </div>

      {/* Shop pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="stat-pill">
          <ShopIcon size={13} className="text-violet" />
          {shopStats.orders} shop order{shopStats.orders !== 1 ? 's' : ''}
        </span>
        <span className="stat-pill">
          <CartIcon size={13} className="text-cyber" />
          {shopStats.fulfilled} fulfilled
        </span>
        <span className="stat-pill">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(shopStats.revenueCents / 100)} revenue
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={BarChartIcon} label="TOTAL GAMES" value={stats.total} sub="In library" color="info" />
        <StatCard icon={CheckIcon} label="ACTIVE" value={stats.active} sub="Scripts working" color="success" />
        <StatCard icon={AlertIcon} label="OUTDATED" value={stats.outdated} sub="Needs update" color="danger" />
        <StatCard icon={StarIcon} label="FEATURED" value={stats.featured} sub="On homepage" color="warning" />
        <StatCard icon={CopyIcon} label="COPIES" value={stats.copies} sub="Times copied" color="silver" />
      </div>

      {/* Loader analytics */}
      <LoaderAnalytics />

      {/* Loader status + quick loadstring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="admin-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldIcon size={18} className="text-silver-base" />
            <h2 className="font-heading text-sm text-white">LOADER STATUS</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              loaderSource === 'raw-url'
                ? 'border-info/30 bg-info/10 text-info'
                : loaderSource === 'database'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-warning/30 bg-warning/10 text-warning'
            }`}>
              {loaderSource === 'raw-url' ? <EyeOffIcon size={18} /> : <TerminalIcon size={18} />}
            </div>
            <div>
              <p className="font-body text-sm text-white">
                {loaderSource === 'raw-url' && 'Serving from hidden raw URL'}
                {loaderSource === 'database' && 'Serving pasted script from R2'}
                {loaderSource === 'none' && 'No script configured yet'}
                {loaderSource === 'error' && 'Could not reach loader API'}
              </p>
              <p className="font-body text-xs text-silver-muted">
                {loaderSource === 'raw-url' && 'Source link stays server-side — never exposed'}
                {loaderSource === 'database' && 'Set a raw URL to auto-sync from your source'}
                {(loaderSource === 'none' || loaderSource === 'error') && 'Open the loader page to set it up'}
              </p>
            </div>
          </div>
          <Link
            href="/admin/loader"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-silver-faint text-silver-mid rounded-lg text-xs font-body transition-all hover:border-white hover:text-white"
          >
            <TerminalIcon size={14} />
            Manage Loader
          </Link>
        </div>

        <div className="admin-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <BoltIcon size={18} className="text-silver-base" />
            <h2 className="font-heading text-sm text-white">PUBLIC LOADSTRING</h2>
          </div>
          <div className="rounded-lg border border-border-dim bg-black-surface p-3 font-code text-xs text-silver-bright break-all">
            {loadstring || 'Not set'}
          </div>
          <button
            onClick={handleCopyLoadstring}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-silver-faint text-silver-mid rounded-lg text-xs font-body transition-all hover:border-white hover:text-white"
          >
            <CopyIcon size={14} />
            Copy Loadstring
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <QuickAction href="/admin/games?action=add" icon={PlusIcon} label="Add New Game" />
        <QuickAction href="/admin/games" icon={GamesIcon} label="Manage Games" />
        <QuickAction href="/admin/shop" icon={ShopIcon} label="Manage Shop" />
        <QuickAction href="/admin/loader" icon={TerminalIcon} label="Edit Loader" />
        <QuickAction href="/admin/settings" icon={SettingsIcon} label="Site Settings" />
        <QuickAction href="/admin/activity" icon={ActivityIcon} label="Activity Log" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="admin-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ActivityIcon size={18} className="text-silver-base" />
              <h2 className="font-heading text-sm text-white">RECENT ACTIVITY</h2>
            </div>
            <Link
              href="/admin/activity"
              className="text-xs text-silver-mid hover:text-white transition-colors font-body"
            >
              View All
            </Link>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map(entry => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p className="text-silver-muted text-sm font-body py-4 text-center">No activity yet</p>
          )}
        </div>

        {/* Recent Games */}
        <div className="admin-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GamesIcon size={18} className="text-silver-base" />
              <h2 className="font-heading text-sm text-white">RECENT GAMES</h2>
            </div>
            <Link
              href="/admin/games"
              className="text-xs text-silver-mid hover:text-white transition-colors font-body"
            >
              Manage
            </Link>
          </div>
          {recentGames.length > 0 ? (
            <div className="space-y-2">
              {recentGames.map(game => (
                <GameRow key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <p className="text-silver-muted text-sm font-body py-4 text-center">No games yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof PlusIcon; label: string }) {
  return (
    <Link
      href={href}
      className="
        flex items-center gap-2 px-4 py-2.5
        border border-silver-faint text-silver-mid rounded-lg
        text-sm font-body transition-all duration-200
        hover:border-white hover:text-white
      "
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof BarChartIcon
  label: string
  value: number
  sub: string
  color: 'info' | 'success' | 'danger' | 'warning' | 'silver'
}) {
  const borderColor = {
    info: 'border-t-info',
    success: 'border-t-success',
    danger: 'border-t-danger',
    warning: 'border-t-warning',
    silver: 'border-t-silver-base',
  }[color]

  return (
    <div className={`bg-black-card border border-border-dim rounded-lg p-4 border-t-2 ${borderColor}`}>
      <Icon size={20} className="text-silver-muted mb-2" />
      <p className="font-heading text-[0.6rem] text-silver-muted tracking-wider uppercase">{label}</p>
      <p className="font-heading text-2xl text-white my-1">{value}</p>
      <p className="font-body text-[0.7rem] text-silver-faint">{sub}</p>
    </div>
  )
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const iconMap: Record<string, typeof CheckIcon> = {
    add: CheckIcon,
    edit: SettingsIcon,
    delete: AlertIcon,
    loader: TerminalIcon,
    login: CheckIcon,
    logout: AlertIcon,
    settings: SettingsIcon,
    password: CheckIcon,
  }
  const Icon = iconMap[entry.type] || ActivityIcon

  const colorMap: Record<string, string> = {
    add: 'text-success',
    edit: 'text-silver-mid',
    delete: 'text-danger',
    loader: 'text-info',
    login: 'text-warning',
    logout: 'text-silver-mid',
    settings: 'text-silver-mid',
    password: 'text-warning',
  }

  const timeAgo = getTimeAgo(new Date(entry.timestamp))

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded bg-black-surface/50">
      <Icon size={14} className={colorMap[entry.type] || 'text-silver-mid'} />
      <span className="flex-1 text-sm text-silver-light font-body truncate">{entry.message}</span>
      <span className="text-xs text-silver-faint font-body">{timeAgo}</span>
    </div>
  )
}

function GameRow({ game }: { game: Game }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded bg-black-surface/50">
      <div className="w-10 h-10 rounded bg-black-card border border-border-dim flex items-center justify-center overflow-hidden flex-shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={16} className="text-silver-faint" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-body truncate">{game.name}</p>
        <span
          className={`text-xs font-body ${game.status === 'active' ? 'text-success' : 'text-danger'}`}
        >
          {game.status === 'active' ? 'Active' : 'Outdated'}
        </span>
      </div>
      <span className="text-xs text-silver-faint font-body">{getTimeAgo(new Date(game.createdAt))}</span>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
