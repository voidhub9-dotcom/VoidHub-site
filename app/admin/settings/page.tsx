'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  logout,
  getUsername,
  addActivityLog,
} from '@/lib/storage'
import { useToast } from '@/components/Toast'
import ImageUploadInput from '@/components/ImageUploadInput'
import { PageHead, Section, Field, Switch, inputCls, btnDanger } from '@/components/AdminUI'
import {
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
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await apiSettings('GET')
      setDiscord(data.discord)
      setTaglineValue(data.tagline)
      setMaintenance(data.maintenance)
      const nextLinks = { ...links, ...(data.links || {}) }
      setLinks(nextLinks)
      setSaved(JSON.stringify({ discord: data.discord, tagline: data.tagline, links: nextLinks }))
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
    setSaving(true)
    try {
      await apiSettings('POST', { discord, tagline, links })
      setSaved(JSON.stringify({ discord, tagline, links }))
      addActivityLog('settings', 'Updated site settings')
      showToast('Settings saved', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }
  const dirty = !loading && saved !== '' && saved !== JSON.stringify({ discord, tagline, links })

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
      await apiGames('DELETE', { all: true })
      addActivityLog('delete', 'Cleared all games')
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

  const nav = [
    { id: 'general', label: 'General' },
    { id: 'branding', label: 'Links & branding' },
    { id: 'data', label: 'Data' },
    { id: 'account', label: 'Account' },
  ]
  const setLink = (k: keyof typeof links) => (e: React.ChangeEvent<HTMLInputElement>) => setLinks({ ...links, [k]: e.target.value })

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <PageHead
        eyebrow="Manage"
        title="Settings"
        subtitle="Site-wide settings. Saved to Cloudflare R2 and live straight away."
        actions={
          <button onClick={loadSettings} disabled={loading} className="btn-outline h-10 px-4 text-sm">
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-10 items-start">
        <nav className="lg:sticky lg:top-24 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {nav.map(n => (
            <a key={n.id} href={`#${n.id}`} className="shrink-0 h-9 lg:h-10 px-4 rounded-full lg:rounded-xl flex items-center text-sm text-[#8a8a8a] hover:text-white hover:bg-white/[0.04] border border-[#1f1f1f] lg:border-0">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-6 min-w-0">
          <div id="general" className="scroll-mt-24">
            <Section title="General" description="The basics shown across the public site.">
              <div className="flex flex-col gap-5">
                <Field label="Discord invite" htmlFor="st-discord" hint="Used by every Discord button and the member widget.">
                  <input id="st-discord" value={discord} onChange={e => setDiscord(e.target.value)} className={inputCls} placeholder="https://discord.gg/…" />
                </Field>
                <Field label="Tagline" htmlFor="st-tagline">
                  <input id="st-tagline" value={tagline} onChange={e => setTaglineValue(e.target.value)} className={inputCls} />
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#1f1f1f] bg-black px-4 py-3.5">
                  <div>
                    <p className="text-sm text-white">Maintenance mode</p>
                    <p className="text-xs text-[#6b6b6b]">Shows a maintenance screen to every visitor. Saves instantly.</p>
                  </div>
                  <Switch checked={maintenance} onChange={handleToggleMaintenance} label="Maintenance mode" />
                </div>
              </div>
            </Section>
          </div>

          <div id="branding" className="scroll-mt-24">
            <Section title="Links & branding" description="Leave a link empty to hide its button.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Site name" htmlFor="lb-sitename">
                  <input id="lb-sitename" value={links.siteName} onChange={setLink('siteName')} placeholder="VoidHub" className={inputCls} />
                </Field>
                <Field label="Logo" htmlFor="lb-logo" hint="Optional. Replaces the chrome V in the nav and footer.">
                  <ImageUploadInput id="lb-logo" value={links.logoUrl} onChange={url => setLinks({ ...links, logoUrl: url })} placeholder="https://… or upload" />
                </Field>
                <Field label="YouTube" htmlFor="lb-youtube">
                  <input id="lb-youtube" type="url" value={links.youtube} onChange={setLink('youtube')} placeholder="https://youtube.com/@…" className={inputCls} />
                </Field>
                <Field label="TikTok" htmlFor="lb-tiktok">
                  <input id="lb-tiktok" type="url" value={links.tiktok} onChange={setLink('tiktok')} placeholder="https://tiktok.com/@…" className={inputCls} />
                </Field>
                <Field label="Telegram" htmlFor="lb-telegram">
                  <input id="lb-telegram" type="url" value={links.telegram} onChange={setLink('telegram')} placeholder="https://t.me/…" className={inputCls} />
                </Field>
                <Field label="Default script link" htmlFor="lb-script" hint="Pre-fills the extra link when you add a game.">
                  <input id="lb-script" type="url" value={links.defaultScriptLink} onChange={setLink('defaultScriptLink')} placeholder="https://…" className={inputCls} />
                </Field>
              </div>
            </Section>
          </div>

          <div id="data" className="scroll-mt-24">
            <Section title="Data" description="Back up or restore the games list and basic settings as a JSON file.">
              <div className="flex flex-wrap gap-2">
                <button onClick={handleExport} className="btn-outline h-11 px-5 text-sm"><DownloadIcon size={15} /> Export backup</button>
                <button onClick={() => fileInputRef.current?.click()} className="btn-outline h-11 px-5 text-sm"><UploadIcon size={15} /> Import backup</button>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </div>
              <div className="mt-6 rounded-xl border border-danger/25 bg-danger/[0.03] p-4">
                <p className="text-sm text-white">Delete every game</p>
                <p className="mt-0.5 text-xs text-[#8a8a8a]">Can&apos;t be undone. Export a backup first. Type <code className="font-gmono text-danger">DELETE</code> to confirm.</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" className={`${inputCls} sm:max-w-[200px] font-gmono`} />
                  <button onClick={handleClearGames} disabled={deleteConfirm !== 'DELETE'} className={btnDanger + ' !h-11'}><TrashIcon size={14} /> Delete all games</button>
                </div>
              </div>
            </Section>
          </div>

          <div id="account" className="scroll-mt-24">
            <Section title="Account">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-semibold uppercase shrink-0">{(username || 'v').slice(0, 1)}</span>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="text-white">{username}</p>
                  <p className="text-xs text-[#6b6b6b]">Session started {sessionStart}</p>
                </div>
                <button onClick={handleLogout} className="btn-outline h-10 px-4 text-sm"><LogoutIcon size={14} /> Log out</button>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#1f1f1f] bg-black p-4">
                <LockIcon size={16} className="text-white mt-0.5 shrink-0" />
                <p className="text-xs text-[#8a8a8a] leading-relaxed">
                  The admin password is the <code className="font-gmono text-white">ADMIN_PASSWORD</code> environment variable. To change it:
                  Vercel → project → Settings → Environment Variables → edit it → redeploy, then log in again.
                </p>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Unsaved changes bar */}
      <div className={`fixed bottom-4 left-4 right-4 lg:left-[calc(240px+2.5rem)] z-40 transition-all duration-300 ${dirty ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 rounded-2xl border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <p className="text-sm text-white">You have unsaved changes</p>
          <div className="flex gap-2">
            <button onClick={loadSettings} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Discard</button>
            <button onClick={handleSaveSettings} disabled={saving} className="btn-white h-10 px-5 text-sm">
              {saving ? <RefreshIcon size={14} className="animate-spin" /> : null} Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
