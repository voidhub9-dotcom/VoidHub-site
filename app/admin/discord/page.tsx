'use client'

import { useState, useEffect, useMemo } from 'react'
import { SearchIcon, RefreshIcon, TrashIcon, DiscordIcon } from '@/components/Icons'
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Avatar({ member, size = 38 }: { member: DiscordMember; size?: number }) {
  const initials = (member.displayName || member.username).slice(0, 1).toUpperCase()
  const [err, setErr] = useState(false)
  return member.avatar && !err ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={member.avatar} alt="" width={size} height={size}
      className="rounded-full object-cover shrink-0 ring-1 ring-white/10"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  ) : (
    <span
      className="rounded-full bg-[#5865F2]/15 text-[#7289da] flex items-center justify-center shrink-0 font-semibold ring-1 ring-[#5865F2]/20"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}

function Stat({ label, value, sub, dot }: { label: string; value: string | number; sub: string; dot?: string }) {
  return (
    <div className="flex flex-col gap-1 p-5 rounded-2xl border border-[#1c1c1c] bg-[#070707]">
      <div className="flex items-center gap-2">
        {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
        <span className="font-gmono text-[0.6rem] uppercase tracking-[0.18em] text-[#555]">{label}</span>
      </div>
      <p className="text-3xl font-semibold tracking-[-0.03em] text-chrome">{value}</p>
      <p className="text-xs text-[#555]">{sub}</p>
    </div>
  )
}

function MemberRow({ m, acting, onManage }: {
  m: DiscordMember
  acting: boolean
  onManage: (action: string) => void
}) {
  return (
    <li className={`group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.02] ${m.banned ? 'opacity-40' : ''}`}>
      <Avatar member={m} size={38} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.9rem] font-medium text-white truncate">{m.displayName}</span>
          {m.displayName !== m.username && (
            <span className="text-[0.72rem] text-[#4a4a4a] truncate">@{m.username}</span>
          )}
          {m.accessToken && (
            <span className="inline-flex items-center h-[18px] px-2 rounded-full bg-success/10 border border-success/20 font-gmono text-[0.5rem] uppercase tracking-wider text-success">
              verified
            </span>
          )}
          {m.banned && (
            <span className="inline-flex items-center h-[18px] px-2 rounded-full bg-danger/10 border border-danger/20 font-gmono text-[0.5rem] uppercase tracking-wider text-danger">
              banned
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[0.7rem] text-[#444] font-gmono">
          {m.discordId}
          <span className="mx-1.5 text-[#2a2a2a]">·</span>
          {timeAgo(m.verifiedAt)}
          {m.roles.length > 0 && (
            <><span className="mx-1.5 text-[#2a2a2a]">·</span>{m.roles.length} role{m.roles.length !== 1 ? 's' : ''}</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!m.banned ? (
          <>
            <button
              onClick={() => onManage('kick')}
              disabled={acting}
              className="h-8 px-3 rounded-lg text-xs text-[#6b6b6b] hover:text-warning hover:bg-warning/8 transition-all disabled:opacity-30"
            >
              Kick
            </button>
            <button
              onClick={() => onManage('ban')}
              disabled={acting}
              className="h-8 px-3 rounded-lg text-xs text-[#6b6b6b] hover:text-danger hover:bg-danger/8 transition-all disabled:opacity-30"
            >
              Ban
            </button>
          </>
        ) : (
          <button
            onClick={() => onManage('unban')}
            disabled={acting}
            className="h-8 px-3 rounded-lg text-xs text-[#6b6b6b] hover:text-success hover:bg-success/8 transition-all disabled:opacity-30"
          >
            Unban
          </button>
        )}
        <button
          onClick={() => onManage('remove_member')}
          disabled={acting}
          title="Remove from database"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#3a3a3a] hover:text-danger hover:bg-danger/8 transition-all disabled:opacity-30"
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </li>
  )
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

  const manage = async (member: DiscordMember, action: string) => {
    setActing(member.discordId)
    try {
      await apiFetch('/api/admin/discord/manage', {
        method: 'POST',
        body: JSON.stringify({ action, discordId: member.discordId }),
      })
      showToast(`Done: ${action} on ${member.displayName}`, 'success')
      if (action === 'remove_member') setMembers(prev => prev.filter(m => m.discordId !== member.discordId))
      else load()
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
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-gmono text-[0.62rem] uppercase tracking-[0.2em] text-[#555] mb-2">Manage</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-chrome">Discord Members</h1>
          <p className="mt-1.5 text-sm text-[#6b6b6b] max-w-md">
            Members who verified through the site or were synced from your Discord server.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline h-10 px-4 text-sm gap-2"
          >
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={sync}
            disabled={syncing}
            className="btn-white h-10 px-5 text-sm gap-2"
          >
            {syncing
              ? <RefreshIcon size={14} className="animate-spin" />
              : <DiscordIcon size={14} />}
            {syncing ? 'Syncing…' : 'Sync Discord'}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total" value={loading ? '–' : members.length} sub="in database" />
        <Stat label="Verified" value={loading ? '–' : verified} sub="via site OAuth" dot="bg-success" />
        <Stat label="Banned" value={loading ? '–' : banned} sub="flagged" dot={banned ? 'bg-danger' : 'bg-[#2a2a2a]'} />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#080808] border border-[#1f1f1f] text-sm text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[#333] transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden divide-y divide-[#121212]">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
              <div className="w-[38px] h-[38px] rounded-full bg-[#111] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 rounded-full bg-[#111] animate-pulse" />
                <div className="h-2.5 w-52 rounded-full bg-[#0d0d0d] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] flex flex-col items-center justify-center py-16 px-6 text-center">
          <span className="w-12 h-12 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] flex items-center justify-center mb-4">
            <DiscordIcon size={20} className="text-[#3a3a3a]" />
          </span>
          <p className="text-[0.95rem] font-medium text-white">
            {members.length === 0 ? 'No members yet' : 'No results'}
          </p>
          <p className="mt-1.5 text-sm text-[#555] max-w-xs">
            {members.length === 0
              ? 'Members show up here after verifying on /-verify or after a Discord sync.'
              : 'Nothing matched that search. Try a username or Discord ID.'}
          </p>
          {members.length === 0 && (
            <button onClick={sync} disabled={syncing} className="btn-outline h-9 px-4 text-xs mt-5 gap-2">
              <DiscordIcon size={13} /> Sync from Discord
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden divide-y divide-[#111]">
          <div className="flex items-center justify-between px-5 h-11 border-b border-[#141414]">
            <span className="font-gmono text-[0.58rem] uppercase tracking-[0.18em] text-[#444]">
              {visible.length} member{visible.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}
            </span>
          </div>
          <ul>
            {visible.map(m => (
              <MemberRow
                key={m.discordId}
                m={m}
                acting={acting === m.discordId}
                onManage={action => manage(m, action)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Setup callout */}
      <div className="mt-6 rounded-2xl border border-[#1a1a1a] bg-[#060606] p-5">
        <p className="font-gmono text-[0.58rem] uppercase tracking-[0.2em] text-[#444] mb-3">Setup</p>
        <div className="space-y-2 text-xs text-[#555] leading-relaxed">
          <p>
            Enter your Bot Token, Guild ID, Client ID, Client Secret and Verified Role ID in{' '}
            <a href="/admin/settings#config" className="text-[#888] hover:text-white underline underline-offset-2 transition-colors">
              Settings → Discord config
            </a>
            {' '}— saved to R2, no redeployment needed when you switch servers.
          </p>
          <p>
            Only{' '}
            <code className="font-gmono text-[#888] bg-white/[0.04] px-1 py-px rounded">NEXT_PUBLIC_SITE_URL</code>{' '}
            still needs to be a Vercel env var. Add{' '}
            <code className="font-gmono text-[#888] bg-white/[0.04] px-1 py-px rounded">/api/discord/callback</code>{' '}
            to your Discord app's redirect URIs. Verify page lives at{' '}
            <code className="font-gmono text-[#888] bg-white/[0.04] px-1 py-px rounded">/-verify</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
