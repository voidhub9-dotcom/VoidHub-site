'use client'

import { useState } from 'react'
import { ExternalIcon, CheckIcon, CopyIcon, GamesIcon, UsersIcon } from '@/components/Icons'
import { useRobloxInfo, placeIdOf, compact, isNewGame } from '@/lib/roblox-info'

export interface PublicGame {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'outdated'
  thumbnail: string
  scriptLink?: string
  robloxUrl?: string
  placeId?: string
  createdAt: string
  updatedAt: string
}

/** Every game runs off the same protected loader, so all cards copy this. */
export function loaderScript() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.voidon.top'
  return `loadstring(game:HttpGet("${origin}/api/loader"))()`
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

export function StatusPill({ status, className = '' }: { status: PublicGame['status']; className?: string }) {
  const ok = status !== 'outdated'
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-gmono text-[0.62rem] text-white ${className}`}>
      <span className="relative flex w-1.5 h-1.5">
        {ok && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />}
        <span className={`relative w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
      </span>
      {ok ? 'working' : 'updating'}
    </span>
  )
}

interface GameCardProps {
  game: PublicGame
  onOpen?: (game: PublicGame) => void
  /** Static render for previews (admin wizard): no clicks, no network. */
  preview?: boolean
}

export default function GameCard({ game, onOpen, preview = false }: GameCardProps) {
  const info = useRobloxInfo(preview ? undefined : placeIdOf(game))
  const [copied, setCopied] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const [iconErr, setIconErr] = useState(false)

  const banner = info?.banner || game.thumbnail || info?.thumbnail || ''
  const icon = game.thumbnail || info?.thumbnail || ''
  const fresh = isNewGame(game.createdAt)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (preview) return
    await copyText(loaderScript())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article
      onClick={() => !preview && onOpen?.(game)}
      className={`group relative rounded-[20px] ${fresh ? 'new-ring' : ''} ${preview ? '' : 'cursor-pointer'}`}
    >
      <div className="relative h-full rounded-[20px] overflow-hidden border border-[#1f1f1f] bg-[#0a0a0a] transition-all duration-300 group-hover:border-[#3a3a3a] group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_-24px_rgba(255,255,255,0.18)]">
        {/* Banner */}
        <div className="relative aspect-[16/9] overflow-hidden bg-[#111]">
          {banner && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              loading="lazy"
              onError={() => setImgErr(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="absolute inset-0 mono-dots flex items-center justify-center">
              <GamesIcon size={28} className="text-[#333]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <StatusPill status={game.status} />
            {fresh && (
              <span className="shimmer-pill inline-flex items-center h-6 px-2.5 rounded-full font-gmono text-[0.62rem] text-black">
                just added
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="relative px-4 pb-4">
          <div className="-mt-8 mb-3 flex items-end justify-between gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#0a0a0a] bg-[#161616] shadow-[0_8px_24px_rgba(0,0,0,0.6)] shrink-0">
              {icon && !iconErr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className="w-full h-full object-cover" onError={() => setIconErr(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-semibold text-white">{game.name.slice(0, 1) || '?'}</div>
              )}
            </div>
            {info?.playing != null && (
              <span className="inline-flex items-center gap-1.5 mb-1 font-gmono text-[0.68rem] text-[#a3a3a3]">
                <UsersIcon size={12} className="text-[#6b6b6b]" />
                {compact(info.playing)} playing
              </span>
            )}
          </div>

          <h3 className="font-display font-semibold text-[1.05rem] tracking-tight text-white leading-snug line-clamp-1">
            {game.name || 'Untitled game'}
          </h3>
          <p className="mt-1 font-display text-[0.8rem] text-[#8a8a8a] leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {game.description || 'No description yet.'}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 h-10 text-[0.8rem] ${copied ? 'btn-outline' : 'btn-white'}`}
              aria-label={`Copy script for ${game.name}`}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? 'Copied' : 'Copy script'}
            </button>
            {game.robloxUrl && (
              <a
                href={preview ? undefined : game.robloxUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="Open in Roblox"
                aria-label="Open in Roblox"
                className="btn-outline w-10 h-10 shrink-0"
              >
                <ExternalIcon size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
