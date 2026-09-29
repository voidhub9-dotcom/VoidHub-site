'use client'

import { useEffect, useState } from 'react'
import { XIcon, CheckIcon, CopyIcon, ExternalIcon, UsersIcon, ClockIcon, BarChartIcon, CodeIcon } from '@/components/Icons'
import { useRobloxInfo, placeIdOf, compact, isNewGame } from '@/lib/roblox-info'
import { loaderScript, copyText, StatusPill, type PublicGame } from '@/components/GameCard'

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']]
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`
  return 'just now'
}

/** Game details: bottom sheet on phones, centred dialog on desktop. */
export default function GameSheet({ game, onClose }: { game: PublicGame | null; onClose: () => void }) {
  const info = useRobloxInfo(game ? placeIdOf(game) : undefined)
  const [copied, setCopied] = useState(false)
  const [bannerErr, setBannerErr] = useState(false)
  const [iconErr, setIconErr] = useState(false)

  useEffect(() => {
    if (!game) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [game, onClose])

  useEffect(() => { setCopied(false); setBannerErr(false); setIconErr(false) }, [game])

  if (!game) return null

  const script = loaderScript()
  const banner = info?.banner || game.thumbnail || info?.thumbnail || ''
  const icon = game.thumbnail || info?.thumbnail || ''

  const handleCopy = async () => {
    await copyText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const stats = [
    { icon: UsersIcon, label: 'Playing now', value: info?.playing != null ? compact(info.playing) : '–' },
    { icon: BarChartIcon, label: 'Visits', value: info?.visits != null ? compact(info.visits) : '–' },
    { icon: ClockIcon, label: 'Updated', value: game.updatedAt ? timeAgo(game.updatedAt) : '–' },
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-6 font-display" role="dialog" aria-modal="true" aria-label={game.name}>
      <div className="sheet-backdrop absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="sheet-panel relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[28px] md:rounded-[28px] border border-[#222] bg-[#080808] shadow-[0_-20px_80px_-20px_rgba(255,255,255,0.15)]">
        {/* grab handle on phones */}
        <div className="md:hidden absolute top-2.5 left-1/2 -translate-x-1/2 z-10 w-10 h-1 rounded-full bg-white/40" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80"
        >
          <XIcon size={16} />
        </button>

        <div className="relative aspect-[16/8] md:aspect-[16/7] bg-[#111] overflow-hidden">
          {banner && !bannerErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" onError={() => setBannerErr(true)} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 mono-dots" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/30 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <StatusPill status={game.status} />
            {isNewGame(game.createdAt) && (
              <span className="shimmer-pill inline-flex items-center h-6 px-2.5 rounded-full font-gmono text-[0.62rem] text-black">just added</span>
            )}
          </div>
        </div>

        <div className="relative px-5 md:px-7 pb-6 md:pb-7" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="-mt-10 flex items-end gap-4">
            <div className="w-20 h-20 rounded-[22px] overflow-hidden border-[3px] border-[#080808] bg-[#161616] shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
              {icon && !iconErr
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={icon} alt="" onError={() => setIconErr(true)} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-semibold">{game.name.slice(0, 1)}</div>}
            </div>
            <div className="min-w-0 pb-1">
              {game.category && <p className="font-gmono text-[0.65rem] uppercase tracking-[0.2em] text-[#6b6b6b]">{game.category}</p>}
              <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.03em] text-white leading-tight">{game.name}</h2>
            </div>
          </div>

          {game.description && (
            <p className="mt-4 text-sm md:text-[0.95rem] text-[#a3a3a3] leading-relaxed">{game.description}</p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-[#1c1c1c] bg-[#0d0d0d] px-3 py-3">
                <Icon size={14} className="text-[#6b6b6b]" />
                <p className="mt-2 text-lg font-semibold tracking-tight text-white">{value}</p>
                <p className="text-[0.68rem] text-[#6b6b6b]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#1c1c1c] bg-black overflow-hidden">
            <div className="flex items-center justify-between h-9 px-4 border-b border-[#1c1c1c]">
              <span className="font-gmono text-[0.65rem] text-[#6b6b6b]">loader.lua · works for every game</span>
            </div>
            <code className="block px-4 py-3 font-gmono text-[0.75rem] text-[#d4d4d4] break-all select-text">{script}</code>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button onClick={handleCopy} className={`w-full sm:flex-1 h-12 shrink-0 text-sm ${copied ? 'btn-outline' : 'btn-white'}`}>
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              {copied ? 'Copied, paste it in your executor' : 'Copy script'}
            </button>
            {game.robloxUrl && (
              <a href={game.robloxUrl} target="_blank" rel="noopener noreferrer" className="btn-outline h-12 px-5 text-sm">
                <ExternalIcon size={15} /> Play on Roblox
              </a>
            )}
            {game.scriptLink?.trim().startsWith('http') && (
              <a href={game.scriptLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-12 px-5 text-sm">
                <CodeIcon size={15} /> Script link
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
