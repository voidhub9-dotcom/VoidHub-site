'use client'

import { useState, useEffect } from 'react'
import { getActivityLog, clearActivityLog, type ActivityLogEntry } from '@/lib/storage'
import { useToast } from '@/components/Toast'
import {
  ActivityIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  TerminalIcon,
  LockIcon,
  LogoutIcon,
  SettingsIcon,
  RefreshIcon,
} from '@/components/Icons'

function getLogIcon(type: ActivityLogEntry['type']) {
  switch (type) {
    case 'add':      return <CheckIcon size={16} className="text-success flex-shrink-0" />
    case 'edit':     return <EditIcon size={16} className="text-silver-muted flex-shrink-0" />
    case 'delete':   return <TrashIcon size={16} className="text-danger flex-shrink-0" />
    case 'loader':   return <TerminalIcon size={16} className="text-info flex-shrink-0" />
    case 'login':    return <LockIcon size={16} className="text-warning flex-shrink-0" />
    case 'logout':   return <LogoutIcon size={16} className="text-silver-muted flex-shrink-0" />
    case 'settings': return <SettingsIcon size={16} className="text-silver-muted flex-shrink-0" />
    case 'password': return <RefreshIcon size={16} className="text-silver-mid flex-shrink-0" />
    default:         return <ActivityIcon size={16} className="text-silver-muted flex-shrink-0" />
  }
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}

export default function ActivityPage() {
  const { showToast } = useToast()
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setLog(getActivityLog())
  }, [])

  const handleClear = () => {
    clearActivityLog()
    setLog([])
    setConfirmClear(false)
    showToast('Activity log cleared', 'info')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <ActivityIcon size={28} className="text-silver-base" />
            <h1 className="font-heading text-2xl tracking-wider text-white">ACTIVITY LOG</h1>
          </div>
          <p className="mt-1 text-sm text-silver-muted font-body">
            Last 50 admin actions — persists across sessions
          </p>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-silver-muted font-body">
              Are you sure? This cannot be undone.
            </span>
            <button
              onClick={handleClear}
              className="rounded-lg bg-danger/80 px-3 py-1.5 text-sm font-body text-white transition-colors hover:bg-danger"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-border-mid px-3 py-1.5 text-sm font-body text-silver-mid transition-colors hover:border-white hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-body text-danger transition-colors hover:bg-danger/10"
          >
            <TrashIcon size={16} />
            CLEAR LOG
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border-dim bg-black-card">
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ActivityIcon size={40} className="text-silver-faint" />
            <p className="text-silver-muted font-body">No activity recorded yet</p>
          </div>
        ) : (
          log.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between gap-4 px-5 py-3 ${
                i % 2 === 0 ? 'bg-black-surface' : 'bg-black-card'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {getLogIcon(entry.type)}
                <span className="text-sm text-silver-bright font-body truncate">
                  {entry.message}
                </span>
              </div>
              <span className="shrink-0 font-code text-xs text-silver-muted">
                {formatTime(entry.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
