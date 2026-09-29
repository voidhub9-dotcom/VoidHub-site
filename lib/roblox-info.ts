'use client'

import { useEffect, useState } from 'react'

export interface RobloxInfo {
  thumbnail: string
  banner: string
  playing: number | null
  visits: number | null
}

// One request per place per page load, shared by every card/sheet that shows it
// (the marquee renders each game several times).
const cache = new Map<string, Promise<RobloxInfo | null>>()

function load(placeId: string) {
  let p = cache.get(placeId)
  if (!p) {
    p = fetch(`/api/roblox?gameId=${encodeURIComponent(placeId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && {
        thumbnail: d.thumbnail || '',
        banner: d.banner || '',
        playing: typeof d.playing === 'number' ? d.playing : null,
        visits: typeof d.visits === 'number' ? d.visits : null,
      })
      .catch(() => null)
    cache.set(placeId, p)
  }
  return p
}

export function useRobloxInfo(placeId?: string) {
  const [info, setInfo] = useState<RobloxInfo | null>(null)
  useEffect(() => {
    if (!placeId || !/^\d+$/.test(placeId)) return
    let alive = true
    load(placeId).then(d => { if (alive) setInfo(d) })
    return () => { alive = false }
  }, [placeId])
  return info
}

/** Place ID from the stored field or the Roblox URL. */
export function placeIdOf(game: { placeId?: string; robloxUrl?: string }) {
  if (game.placeId && /^\d+$/.test(game.placeId)) return game.placeId
  return game.robloxUrl?.match(/games\/(\d+)/)?.[1]
}

export const compact = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const isNewGame = (createdAt?: string) =>
  !!createdAt && Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
