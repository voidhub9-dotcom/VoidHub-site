'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  logout,
  getUsername,
  addActivityLog,
} from '@/lib/storage'
import { useToast } from '@/components/Toast'
import {
  SettingsIcon,
  LockIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  LogoutIcon,
  RefreshIcon
} from '@/components/Icons'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiSettings(method: string, body?: object) {
  const res = await fetch('/api/admin/settings', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiGames(method: string, body?: object) {
  const res = await fetch('/api/admin/games', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [discord, setDiscord] = useState('')
  const [tagline, setTaglineValue] = useState('')
  const [maintenance, setMaintenance] = useState(false)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState({
    youtube: '',
    tiktok: '',
    telegram: '',
    siteName: 'VoidHub',
    logoUrl: '',
    defaultScriptLink: '',
  })

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [sessionStart] = useState(() => new Date().toLocaleString())

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await apiSettings('GET')
      setDiscord(data.discord)
      setTaglineValue(data.tagline)
      setMaintenance(data.maintenance)
      if (data.links) setLinks(prev => ({ ...prev, ...data.links }))
      setUsername(getUsername() || 'voidhub')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    try {
      await apiSettings('POST', { discord, tagline, links })
      addActivityLog('settings', 'Updated site settings')
      showToast('Settings saved to database', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleToggleMaintenance = async () => {
    const next = !maintenance
    try {
      await apiSettings('POST', { maintenance: next })
      setMaintenance(next)
      showToast(next ? 'Maintenance mode enabled' : 'Maintenance mode disabled', 'info')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleExport = async () => {
    try {
      const games = await (await fetch('/api/admin/games', { headers: { 'x-admin-key': getAdminKey() } })).json()
      const data = {
        games,
        discord,
        tagline,
        exportedAt: new Date().toISOString(),
      }
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `voidhub-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Data exported', 'success')
    } catch (e: any) {
      showToast('Export failed: ' + e.message, 'error')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string
        const data = JSON.parse(text)
        
        if (data.discord || data.tagline) {
          await apiSettings('POST', { discord: data.discord, tagline: data.tagline })
        }
        
        if (data.games && Array.isArray(data.games)) {
          for (const g of data.games) {
            const { id, createdAt, updatedAt, ...game } = g
            await apiGames('POST', game)
          }
          showToast(`Settings imported and ${data.games.length} game(s) added`, 'success')
        } else {
          showToast('Settings imported', 'success')
        }
        loadSettings()
      } catch (e: any) {
        showToast('Import failed: ' + e.message, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearGames = async () => {
    if (deleteConfirm !== 'DELETE') return
    try {
      const games = await (await fetch('/api/admin/games', { headers: { 'x-admin-key': getAdminKey() } })).json()
      for (const g of games) {
        await fetch('/api/admin/games', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
          body: JSON.stringify({ id: g.id })
        })
      }
      setDeleteConfirm('')
      showToast('All games cleared from database', 'info')
    } catch (e: any) {
      showToast('Clear failed: ' + e.message, 'error')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  const inputClass =
    'w-full rounded-lg border border-border-dim bg-black-surface px-4 py-2.5 text-silver-bright font-body text-sm outline-none transition-colors focus:border-white'

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon size={28} className="text-silver-base" />
          <h1 className="font-heading text-2xl tracking-wider text-white">SETTINGS</h1>
        </div>
        <button onClick={loadSettings} className="p-2 text-silver-muted hover:text-white transition-colors">
          <RefreshIcon size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Credentials */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white mb-4">CREDENTIALS</h2>
        <div className="flex items-start gap-3 rounded-lg border border-border-dim bg-black-surface p-4 max-w-xl">
          <LockIcon size={18} className="text-info mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="font-body text-sm text-silver-bright">
              The admin password is managed by the{' '}
              <code className="rounded bg-black-card px-1.5 py-0.5 text-xs text-white">ADMIN_PASSWORD</code>{' '}
              environment variable.
            </p>
            <p className="font-body text-xs text-silver-muted leading-relaxed">
              To change it: Vercel Dashboard &rarr; your project &rarr; Settings &rarr; Environment
              Variables &rarr; edit <code className="text-silver-bright">ADMIN_PASSWORD</code> &rarr;
              redeploy. Then log in again with the new password. This keeps the password server-side
              and consistent across all devices.
            </p>
          </div>
        </div>
      </section>

      {/* Site Settings */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white mb-4">SITE SETTINGS</h2>
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Discord Link
            </label>
            <input
              value={discord}
              onChange={e => setDiscord(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Site Tagline
            </label>
            <input
              value={tagline}
              onChange={e => setTaglineValue(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border-dim bg-black-surface px-4 py-3">
            <div>
              <p className="text-sm font-body text-silver-bright">Maintenance Mode</p>
              <p className="text-xs font-body text-silver-muted">Shows a banner to all visitors</p>
            </div>
            <button
              onClick={handleToggleMaintenance}
              role="switch"
              aria-checked={maintenance}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
                maintenance ? 'bg-success' : 'bg-black-card border border-border-mid'
              }`}
            >
              <span
                className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200 ${
                  maintenance ? 'left-[26px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Links & Branding */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white mb-1">LINKS &amp; BRANDING</h2>
        <p className="font-body text-xs text-silver-muted mb-4">
          Shown across the public site — leave a link empty to hide it
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label htmlFor="lb-sitename" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Site Name
            </label>
            <input
              id="lb-sitename"
              value={links.siteName}
              onChange={e => setLinks({ ...links, siteName: e.target.value })}
              placeholder="VoidHub"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lb-logo" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Logo Image URL <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="lb-logo"
              type="url"
              value={links.logoUrl}
              onChange={e => setLinks({ ...links, logoUrl: e.target.value })}
              placeholder="https://.../logo.png"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lb-youtube" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              YouTube Link
            </label>
            <input
              id="lb-youtube"
              type="url"
              value={links.youtube}
              onChange={e => setLinks({ ...links, youtube: e.target.value })}
              placeholder="https://youtube.com/@..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lb-tiktok" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              TikTok Link
            </label>
            <input
              id="lb-tiktok"
              type="url"
              value={links.tiktok}
              onChange={e => setLinks({ ...links, tiktok: e.target.value })}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lb-telegram" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Telegram Link
            </label>
            <input
              id="lb-telegram"
              type="url"
              value={links.telegram}
              onChange={e => setLinks({ ...links, telegram: e.target.value })}
              placeholder="https://t.me/..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lb-script" className="mb-1.5 block font-heading text-[0.6rem] tracking-widest text-silver-muted uppercase">
              Default Script Link <span className="text-silver-faint normal-case">(pre-fills Add Game)</span>
            </label>
            <input
              id="lb-script"
              type="url"
              value={links.defaultScriptLink}
              onChange={e => setLinks({ ...links, defaultScriptLink: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>
        {links.logoUrl.trim() && (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-body text-xs text-silver-muted">Logo preview:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={links.logoUrl} alt="Logo preview" className="h-9 w-9 rounded-md object-cover border border-border-dim" />
          </div>
        )}
        <button
          onClick={handleSaveSettings}
          className="btn-primary mt-5 !px-5 !py-2.5"
        >
          Save Settings
        </button>
      </section>

      {/* Data Management */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white mb-4">DATA MANAGEMENT</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-silver-faint px-5 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white"
          >
            <DownloadIcon size={16} />
            EXPORT ALL DATA AS JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-silver-faint px-5 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white"
          >
            <UploadIcon size={16} />
            IMPORT FROM JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <div className="mt-6 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-body text-silver-muted mb-3">
            To clear all games, type{' '}
            <span className="font-code text-danger">DELETE</span> below to confirm.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="rounded-lg border border-border-dim bg-black-surface px-4 py-2.5 font-body text-sm text-silver-bright outline-none transition-colors focus:border-danger"
            />
            <button
              onClick={handleClearGames}
              disabled={deleteConfirm !== 'DELETE'}
              className="inline-flex items-center gap-2 rounded-lg bg-danger/80 px-5 py-2.5 font-body text-sm text-white transition-all hover:bg-danger disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon size={16} />
              CLEAR ALL GAMES
            </button>
          </div>
        </div>
      </section>

      {/* Session Info */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white mb-4">SESSION INFO</h2>
        <div className="space-y-1 text-sm font-body text-silver-muted">
          <p>Logged in as: <span className="text-silver-bright">{username}</span></p>
          <p>Session started: <span className="text-silver-bright">{sessionStart}</span></p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-danger/40 px-5 py-2.5 font-body text-sm text-danger transition-colors hover:bg-danger/10"
        >
          <LogoutIcon size={16} />
          LOGOUT NOW
        </button>
      </section>
    </div>
  )
}
