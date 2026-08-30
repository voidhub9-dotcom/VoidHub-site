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
    <div className="price-card group relative flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-black-surface overflow-hidden">
        {thumbnail && !thumbnailError ? (
          <img
            src={thumbnail}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-silver-faint" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black-card via-transparent to-transparent opacity-60" />

        {/* Status badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider backdrop-blur-sm ${
            game.status === 'active'
              ? 'bg-success/20 text-success border border-success/30'
              : 'bg-danger/20 text-danger border border-danger/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${game.status === 'active' ? 'bg-success' : 'bg-danger'}`} />
            {game.status === 'active' ? 'ACTIVE' : 'OUTDATED'}
          </span>
        </div>

        {/* Badges top-right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
          {game.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider bg-white/10 text-white border border-white/20 backdrop-blur-sm">
              <StarIcon size={10} />
              FEATURED
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title */}
        <h3 className="font-heading text-[0.95rem] text-white leading-tight">{game.name}</h3>

        {/* Description */}
        <p className="font-body text-silver-mid text-[0.8rem] leading-relaxed line-clamp-2 flex-1">
          {game.description}
        </p>

        {/* Features */}
        {game.features && game.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.features.slice(0, 4).map((feature, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black-surface border border-border-dim text-silver-muted text-[0.65rem] font-body">
                <CheckIcon size={9} className="text-success" />
                {feature}
              </span>
            ))}
            {game.features.length > 4 && (
              <span className="px-2 py-0.5 rounded bg-black-surface border border-border-dim text-silver-faint text-[0.65rem] font-body">
                +{game.features.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
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
              className="h-9 w-9 flex items-center justify-center border border-border-mid text-silver-muted rounded-lg hover:border-white hover:text-white transition-all"
            >
              <ExternalIcon size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
