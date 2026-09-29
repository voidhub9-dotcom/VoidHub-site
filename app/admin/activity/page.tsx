'use client'

import { useState, useEffect, useMemo } from 'react'
import { getActivityLog, clearActivityLog, type ActivityLogEntry } from '@/lib/storage'
import { useToast } from '@/components/Toast'
import { PageHead, Segmented, Empty, btnDanger } from '@/components/AdminUI'
import {
  ActivityIcon, CheckIcon, EditIcon, TrashIcon, TerminalIcon, LockIcon, LogoutIcon, SettingsIcon, RefreshIcon,
} from '@/components/Icons'

const TYPE: Record<ActivityLogEntry['type'], { icon: typeof CheckIcon; label: string; group: Filter }> = {
  add: { icon: CheckIcon, label: 'Added', group: 'games' },
  edit: { icon: EditIcon, label: 'Edited', group: 'games' },
  delete: { icon: TrashIcon, label: 'Deleted', group: 'games' },
  loader: { icon: TerminalIcon, label: 'Loader', group: 'loader' },
  login: { icon: LockIcon, label: 'Login', group: 'account' },
  logout: { icon: LogoutIcon, label: 'Logout', group: 'account' },
  settings: { icon: SettingsIcon, label: 'Settings', group: 'settings' },
  password: { icon: RefreshIcon, label: 'Password', group: 'account' },
}
type Filter = 'all' | 'games' | 'loader' | 'settings' | 'account'

function dayLabel(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function ActivityPage() {
  const { showToast } = useToast()
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => { setLog(getActivityLog()) }, [])

  const groups = useMemo(() => {
    const out: { day: string; items: ActivityLogEntry[] }[] = []
    for (const e of log) {
      if (filter !== 'all' && TYPE[e.type]?.group !== filter) continue
      const day = dayLabel(new Date(e.timestamp))
      const last = out[out.length - 1]
      if (last?.day === day) last.items.push(e)
      else out.push({ day, items: [e] })
    }
    return out
  }, [log, filter])

  const handleClear = () => {
    clearActivityLog()
    setLog([])
    setConfirmClear(false)
    showToast('Activity log cleared', 'info')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHead
        eyebrow="Overview"
        title="Activity"
        subtitle="The last 50 admin actions from this browser."
        actions={confirmClear ? (
          <>
            <span className="text-sm text-[#8a8a8a]">Clear everything?</span>
            <button onClick={() => setConfirmClear(false)} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
            <button onClick={handleClear} className={btnDanger}><TrashIcon size={14} /> Clear</button>
          </>
        ) : log.length > 0 ? (
          <button onClick={() => setConfirmClear(true)} className="btn-outline h-10 px-4 text-sm"><TrashIcon size={14} /> Clear log</button>
        ) : null}
      />

      {log.length > 0 && (
        <div className="mb-6">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${log.length}` },
              { value: 'games', label: 'Games' },
              { value: 'loader', label: 'Loader' },
              { value: 'settings', label: 'Settings' },
              { value: 'account', label: 'Account' },
            ]}
          />
        </div>
      )}

      {log.length === 0 ? (
        <Empty icon={<ActivityIcon size={20} />} title="Nothing yet" body="Adding games, changing the loader or settings, and logging in all show up here." />
      ) : groups.length === 0 ? (
        <Empty title="No activity of that type" />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(g => (
            <section key={g.day}>
              <h2 className="mb-3 font-gmono text-[0.65rem] uppercase tracking-[0.2em] text-[#6b6b6b]">{g.day}</h2>
              <ol className="relative ml-[18px] border-l border-[#1f1f1f]">
                {g.items.map(entry => {
                  const t = TYPE[entry.type] ?? { icon: ActivityIcon, label: entry.type }
                  const Icon = t.icon
                  const danger = entry.type === 'delete'
                  return (
                    <li key={entry.id} className="relative pl-8 pb-4 last:pb-0">
                      <span className={`absolute -left-[18px] top-0 w-9 h-9 rounded-full border flex items-center justify-center bg-black ${danger ? 'border-danger/40 text-danger' : 'border-[#2a2a2a] text-white'}`}>
                        <Icon size={14} />
                      </span>
                      <div className="rounded-xl border border-[#1a1a1a] bg-[#070707] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="text-sm text-white">{entry.message}</p>
                        <p className="font-gmono text-[0.68rem] text-[#6b6b6b] shrink-0">
                          {t.label} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
