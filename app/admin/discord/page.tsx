'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHead, StatStrip, Empty } from '@/components/AdminUI'
import { SearchIcon, RefreshIcon, TrashIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import type { DiscordMember } from '@/lib/kv'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey(), ...(opts?.headers as any) },
    ...opts,
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function DiscordAvatar({ member, size = 36 }: { member: DiscordMember; size?: number }) {
  const initials = (member.displayName || member.username).slice(0, 1).toUpperCase()
  return member.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatar} alt="" width={size} height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  ) : (
    <span className="rounded-full bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center shrink-0 text-xs font-semibold"
      style={{ width: size, height: size }}>{initials}</span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminDiscordPage() {
  const { showToast } = useToast()
  const [members, setMembers] = useState<DiscordMember[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch('/api/admin/discord-members')
      .then(d => setMembers(Array.isArray(d) ? d : []))
      .catch(() => showToast('Failed to load members', 'error'))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const sync = async () => {
    setSyncing(true)
    try {
      const r = await apiFetch('/api/admin/discord/sync', { method: 'POST' })
      showToast(`Synced ${r.count} members from Discord`, 'success')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed — check DISCORD_BOT_TOKEN', 'error')
    }
    setSyncing(false)
  }

  const manage = async (member: DiscordMember, action: string, opts: object = {}) => {
    setActing(member.discordId)
    try {
      await apiFetch('/api/admin/discord/manage', {
        method: 'POST',
        body: JSON.stringify({ action, discordId: member.discordId, ...opts }),
      })
      showToast(`Done: ${action} on ${member.displayName}`, 'success')
      if (action === 'remove_member') setMembers(prev => prev.filter(m => m.discordId !== member.discordId))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error')
    }
    setActing(null)
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter(m =>
      !q || m.username.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) || m.discordId.includes(q),
    )
  }, [members, search])

  const verified = members.filter(m => m.accessToken).length
  const banned = members.filter(m => m.banned).length

  return (
    <div className="max-w-5xl mx-auto">
      <PageHead
        eyebrow="Manage"
        title="Discord Members"
        subtitle="All members who verified through the site or were synced from the Discord server."
        actions={
          <>
            <button onClick={load} disabled={loading} className="btn-outline h-10 px-4 text-sm">
              <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={sync} disabled={syncing} className="btn-white h-10 px-5 text-sm">
              {syncing ? <RefreshIcon size={14} className="animate-spin" /> : null}
              {syncing ? 'Syncing…' : 'Sync from Discord'}
            </button>
          </>
        }
      />

      <StatStrip items={[
        { label: 'Total', value: loading ? '–' : members.length, sub: 'in database' },
        { label: 'OAuth verified', value: loading ? '–' : verified, sub: 'connected via site', dot: 'bg-success' },
        { label: 'Banned', value: loading ? '–' : banned, sub: 'flagged members', dot: banned ? 'bg-danger' : 'bg-[#333]' },
      ]} />

      <div className="relative mb-4">
        <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#444]"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] divide-y divide-[#161616]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-[#141414] animate-pulse shrink-0" />
              <div className="h-3.5 w-40 rounded bg-[#141414] animate-pulse" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Empty
          icon={<span className="text-xl">👥</span>}
          title={members.length === 0 ? 'No members yet' : 'No results'}
          body={members.length === 0 ? 'Members appear here after verifying on /-verify or after a Discord sync.' : 'Try another search.'}
        />
      ) : (
        <ul className="rounded-2xl border border-[#1c1c1c] bg-[#070707] divide-y divide-[#161616] overflow-hidden">
          {visible.map(m => (
            <li key={m.discordId} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3.5 ${m.banned ? 'opacity-50' : ''}`}>
              <DiscordAvatar member={m} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[0.9rem] text-white truncate">{m.displayName}</p>
                  {m.displayName !== m.username && (
                    <span className="text-[0.7rem] text-[#555] truncate">@{m.username}</span>
                  )}
                  {m.accessToken && (
                    <span className="h-4 px-1.5 rounded-sm bg-success/10 text-success font-gmono text-[0.55rem] flex items-center">verified</span>
                  )}
                  {m.banned && (
                    <span className="h-4 px-1.5 rounded-sm bg-danger/10 text-danger font-gmono text-[0.55rem] flex items-center">banned</span>
                  )}
                </div>
                <p className="text-xs text-[#555]">
                  ID: {m.discordId} · verified {timeAgo(m.verifiedAt)}
                  {m.roles.length > 0 && ` · ${m.roles.length} role${m.roles.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!m.banned ? (
                  <>
                    <button
                      onClick={() => manage(m, 'kick')}
                      disabled={acting === m.discordId}
                      title="Kick from Discord"
                      className="h-8 px-3 rounded-lg text-xs text-[#8a8a8a] hover:text-warning hover:bg-warning/10 transition-colors disabled:opacity-30"
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => manage(m, 'ban')}
                      disabled={acting === m.discordId}
                      title="Ban from Discord"
                      className="h-8 px-3 rounded-lg text-xs text-[#8a8a8a] hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30"
                    >
                      Ban
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => manage(m, 'unban')}
                    disabled={acting === m.discordId}
                    className="h-8 px-3 rounded-lg text-xs text-[#8a8a8a] hover:text-success hover:bg-success/10 transition-colors disabled:opacity-30"
                  >
                    Unban
                  </button>
                )}
                <button
                  onClick={() => manage(m, 'remove_member')}
                  disabled={acting === m.discordId}
                  title="Remove from database"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30"
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 p-4 rounded-xl border border-[#1c1c1c] bg-[#070707] space-y-2">
        <p className="font-gmono text-[0.62rem] uppercase tracking-[0.2em] text-[#555]">Setup</p>
        <p className="text-xs text-[#6b6b6b]">
          Set these env vars: <code className="text-white">DISCORD_CLIENT_ID</code>, <code className="text-white">DISCORD_CLIENT_SECRET</code>,{' '}
          <code className="text-white">DISCORD_BOT_TOKEN</code>, <code className="text-white">DISCORD_GUILD_ID</code>,{' '}
          <code className="text-white">NEXT_PUBLIC_SITE_URL</code> (your site URL),{' '}
          and optionally <code className="text-white">DISCORD_VERIFIED_ROLE_ID</code> to auto-assign a role on verify.
        </p>
        <p className="text-xs text-[#6b6b6b]">
          Add <code className="text-white">/api/discord/callback</code> to your Discord app&apos;s redirect URIs.
          The verify page is at <code className="text-white">/-verify</code>.
        </p>
      </div>
    </div>
  )
}
