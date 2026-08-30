'use client'

import { useEffect, useState } from 'react'
import { DiscordIcon } from '@/components/Icons'

interface DiscordStats {
  ok: boolean
  name: string
  memberCount: number
  onlineCount: number
  iconUrl: string | null
}

/** Live member/online count pulled from the server's own Discord invite — no bot required. */
export default function DiscordWidget() {
  const [stats, setStats] = useState<DiscordStats | null>(null)
  const [iconFailed, setIconFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/discord-widget')
      .then(r => r.json())
      .then(data => { if (!cancelled) setStats(data) })
      .catch(() => { /* widget just doesn't render */ })
    return () => { cancelled = true }
  }, [])

  if (!stats?.ok) return null

  return (
    <div className="inline-flex items-center gap-3 bg-black-card border border-border-mid rounded-full pl-2 pr-4 py-1.5 mb-6">
      {stats.iconUrl && !iconFailed ? (
        <img src={stats.iconUrl} alt="" className="w-7 h-7 rounded-full" onError={() => setIconFailed(true)} />
      ) : (
        <div className="w-7 h-7 rounded-full bg-black-elevated flex items-center justify-center shrink-0">
          <DiscordIcon size={14} className="text-silver-muted" />
        </div>
      )}
      <div className="flex items-center gap-2.5 font-body text-xs text-silver-light">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_6px_rgba(0,255,136,0.6)]" />
          </span>
          {stats.onlineCount.toLocaleString()} online
        </span>
        <span className="text-silver-faint" aria-hidden="true">·</span>
        <span className="text-silver-mid">{stats.memberCount.toLocaleString()} members</span>
      </div>
    </div>
  )
}
