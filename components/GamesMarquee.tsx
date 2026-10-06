'use client'

import { useState } from 'react'
import GameCard, { type PublicGame } from '@/components/GameCard'
import GameSheet from '@/components/GameSheet'
import Link from 'next/link'
import { ChevronRightIcon, GamesIcon } from '@/components/Icons'

export type MarqueeGame = PublicGame

export default function GamesMarquee({
  games, loading, discordLink,
}: { games: MarqueeGame[]; loading: boolean; discordLink: string }) {
  const [open, setOpen] = useState<PublicGame | null>(null)
  const empty = !loading && games.length === 0
  // Repeat short lists so the track is wider than the screen, then double it
  // so the -50% keyframe loops seamlessly.
  const base = games.length ? Array.from({ length: Math.ceil(8 / games.length) }, () => games).flat() : []
  const track = [...base, ...base]

  return (
    <section className="relative py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-4 flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b] mb-2">Library</p>
          <h2 className="font-display font-semibold tracking-tight text-3xl md:text-4xl text-fade">Supported games</h2>
        </div>
        {!empty && (
          <Link href="/games" className="btn-outline h-9 px-4 text-sm shrink-0">
            View all{games.length ? ` ${games.length}` : ''} <ChevronRightIcon size={14} />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto px-4 flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shrink-0 w-[280px] md:w-[320px] aspect-[4/5] rounded-[20px] bg-[#0e0e0e] animate-pulse" />
          ))}
        </div>
      ) : empty ? (
        <div className="max-w-6xl mx-auto px-4">
          <div className="mono-card overflow-hidden">
            <div className="absolute inset-0 mono-dots opacity-60" />
            <div className="relative px-6 py-14 flex flex-col items-center text-center">
              <span className="w-12 h-12 rounded-full border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center mb-5">
                <GamesIcon size={20} className="text-white" />
              </span>
              <h3 className="font-display font-medium text-xl text-white">Fresh library incoming</h3>
              <p className="mt-2 font-display text-sm text-[#8a8a8a] max-w-sm">
                We wiped the slate for the new VoidHub. Games are being added back one by one. Want yours first?
              </p>
              <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-10 px-5 mt-6 text-sm">
                Request a game <ChevronRightIcon size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="flex w-max gap-5 py-6 animate-marquee hover:[animation-play-state:paused]">
            {track.map((g, i) => (
              <div
                key={`${g.id}-${i}`}
                className="w-[280px] md:w-[320px] shrink-0 animate-card-float"
                style={{ animationDelay: `${(i % 7) * 0.55}s`, animationPlayState: 'inherit' }}
              >
                <GameCard game={g} onOpen={setOpen} />
              </div>
            ))}
          </div>
        </div>
      )}
      <GameSheet game={open} onClose={() => setOpen(null)} />
    </section>
  )
}
