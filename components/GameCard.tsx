'use client'

import { useState, useEffect } from 'react'
import { ExternalIcon, StarIcon, ImageIcon, CheckIcon } from '@/components/Icons'

interface Game {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'outdated'
  thumbnail: string
  scriptLink: string
  robloxUrl: string
  placeId?: string
  features: string[]
  featured: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

interface GameCardProps {
  game: Game
}

export default function GameCard({ game }: GameCardProps) {
  const [thumbnail, setThumbnail] = useState<string>(game.thumbnail || '')
  const [thumbnailError, setThumbnailError] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (game.thumbnail) {
      setThumbnail(game.thumbnail)
    } else if (game.placeId) {
      fetchRobloxThumbnail((game as any).placeId)
    }
  }, [game.placeId, game.thumbnail])

  const fetchRobloxThumbnail = async (placeId: string) => {
    try {
      const res = await fetch(`/api/roblox?gameId=${placeId}`)
      const data = await res.json()
      if (data?.thumbnail) setThumbnail(data.thumbnail)
    } catch {
      setThumbnailError(true)
    }
  }

  // Never expose the raw script link. Users always copy a loadstring that
  // goes through the protected /api/loader endpoint (browser-blocked).
  const getProtectedLoadstring = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `loadstring(game:HttpGet("${origin}/api/loader"))()`
  }

  const handleCopy = async () => {
    const protectedScript = getProtectedLoadstring()
    try {
      await navigator.clipboard.writeText(protectedScript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = protectedScript
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isNew = Date.now() - new Date(game.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-border-dim transition-all duration-300 hover:border-border-bright hover:-translate-y-1 hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6)]">
      {/* Background art */}
      <div className="absolute inset-0 bg-black-surface">
        {thumbnail && !thumbnailError ? (
          <img
            src={thumbnail}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={36} className="text-silver-faint" />
          </div>
        )}
      </div>

      {/* Scrim — keeps overlaid text readable over any art, deepens on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10 transition-opacity duration-300 group-hover:from-black group-hover:via-black/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider backdrop-blur-md ${
          game.status === 'active'
            ? 'bg-success/20 text-success border border-success/30'
            : 'bg-danger/20 text-danger border border-danger/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${game.status === 'active' ? 'bg-success' : 'bg-danger'}`} />
          {game.status === 'active' ? 'ACTIVE' : 'OUTDATED'}
        </span>
        <div className="flex flex-col gap-1 items-end">
          {game.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider bg-white/10 text-white border border-white/20 backdrop-blur-md">
              <StarIcon size={10} />
              FEATURED
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Overlaid content */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
        {game.category && (
          <span className="font-body text-[0.65rem] tracking-widest uppercase text-silver-light/80">{game.category}</span>
        )}
        <h3 className="font-heading text-base text-white leading-tight text-balance">{game.name}</h3>
        <p className="font-body text-silver-light/70 text-[0.78rem] leading-relaxed line-clamp-2">
          {game.description}
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg font-body text-xs transition-all duration-200 ${
              copied
                ? 'bg-success/20 text-success border border-success/40'
                : 'btn-primary !h-9 !py-0 !rounded-lg'
            }`}
          >
            {copied ? (
              <>
                <CheckIcon size={13} />
                <span>COPIED!</span>
              </>
            ) : (
              <span>COPY SCRIPT</span>
            )}
          </button>

          {game.robloxUrl && (
            <a
              href={game.robloxUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="h-9 w-9 shrink-0 flex items-center justify-center border border-white/20 bg-white/5 backdrop-blur-md text-silver-light rounded-lg hover:border-white hover:text-white hover:bg-white/10 transition-all"
            >
              <ExternalIcon size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
