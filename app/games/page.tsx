'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageHeader from '@/components/PageHeader'
import GameCard, { type PublicGame } from '@/components/GameCard'
import GameCardSkeleton from '@/components/GameCardSkeleton'
import GameSheet from '@/components/GameSheet'
import { ToastProvider } from '@/components/Toast'
import { SearchIcon, DiscordIcon, XIcon, GamesIcon, ChevronRightIcon } from '@/components/Icons'

type StatusFilter = 'all' | 'active' | 'outdated'
type Sort = 'newest' | 'name'

export default function GamesPage() {
  const [games, setGames] = useState<PublicGame[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [open, setOpen] = useState<PublicGame | null>(null)
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')

  useEffect(() => {
    fetch('/api/public/settings').then(r => r.json()).then(d => d.discord && setDiscordLink(d.discord)).catch(() => {})
    fetch('/api/public/games')
      .then(r => r.json())
      .then((data: PublicGame[]) => {
        const list = Array.isArray(data) ? data : []
        setGames(list)
        // Shareable deep link: /games?game=<id> opens that game straight away
        const id = new URLSearchParams(window.location.search).get('game')
        if (id) setOpen(list.find(g => g.id === id) ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openGame = useCallback((g: PublicGame | null) => {
    setOpen(g)
    const url = new URL(window.location.href)
    if (g) url.searchParams.set('game', g.id)
    else url.searchParams.delete('game')
    window.history.replaceState(null, '', url)
  }, [])
  const closeGame = useCallback(() => openGame(null), [openGame])

  const categories = useMemo(
    () => Array.from(new Set(games.map(g => g.category).filter(Boolean))).sort(),
    [games],
  )

  const counts = useMemo(() => ({
    all: games.length,
    active: games.filter(g => g.status !== 'outdated').length,
    outdated: games.filter(g => g.status === 'outdated').length,
  }), [games])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = games.filter(g =>
      (status === 'all' || (status === 'active' ? g.status !== 'outdated' : g.status === 'outdated')) &&
      (category === 'all' || g.category === category) &&
      (!q || g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)),
    )
    return list.sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [games, query, status, category, sort])

  const filtering = query !== '' || status !== 'all' || category !== 'all'
  const clear = () => { setQuery(''); setStatus('all'); setCategory('all') }

  const chip = (active: boolean) =>
    `shrink-0 h-9 px-4 rounded-full text-[0.82rem] transition-colors whitespace-nowrap ${
      active ? 'bg-white text-black' : 'border border-[#262626] text-[#a3a3a3] hover:text-white hover:border-[#444]'
    }`

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black font-display">
        <Navbar />

        <PageHeader
          eyebrow={loading ? 'loading library…' : `${counts.all} ${counts.all === 1 ? 'game' : 'games'} · ${counts.active} working`}
          title="Supported games"
          subtitle="Tap any game for details. They all run off the same keyless loadstring."
        >
          <div className="relative w-full max-w-md">
            <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search games…"
              aria-label="Search games"
              className="w-full h-12 pl-11 pr-10 rounded-full bg-[#0a0a0a] border border-[#262626] text-white text-[16px] md:text-sm placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#6b6b6b] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)] transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-white">
                <XIcon size={15} />
              </button>
            )}
          </div>
        </PageHeader>

        <main className="px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            {/* Filter bar: scrolls sideways on phones, sticks under the nav */}
            {games.length > 0 && (
              <div className="sticky top-[76px] z-30 -mx-4 px-4 py-3 mb-6 bg-black/80 backdrop-blur-xl border-y border-[#141414] md:rounded-full md:border md:mx-0 md:px-2 md:py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {([['all', 'All'], ['active', 'Working'], ['outdated', 'Updating']] as const).map(([key, label]) => (
                      <button key={key} onClick={() => setStatus(key)} className={chip(status === key)}>
                        {label} <span className={status === key ? 'text-black/50' : 'text-[#555]'}>{counts[key]}</span>
                      </button>
                    ))}
                    {categories.length > 1 && <span className="shrink-0 w-px h-5 bg-[#262626] mx-1" />}
                    {categories.length > 1 && categories.map(c => (
                      <button key={c} onClick={() => setCategory(category === c ? 'all' : c)} className={chip(category === c)}>{c}</button>
                    ))}
                  </div>
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value as Sort)}
                    aria-label="Sort games"
                    className="shrink-0 h-9 pl-3 pr-8 rounded-full bg-[#0a0a0a] border border-[#262626] text-[0.82rem] text-[#d4d4d4] focus:outline-none"
                  >
                    <option value="newest">Newest</option>
                    <option value="name">A–Z</option>
                  </select>
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }, (_, i) => <GameCardSkeleton key={i} />)}
              </div>
            ) : games.length === 0 ? (
              <div className="mono-card overflow-hidden">
                <div className="absolute inset-0 mono-dots opacity-60" />
                <div className="relative px-6 py-20 flex flex-col items-center text-center">
                  <span className="w-14 h-14 rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center mb-5">
                    <GamesIcon size={22} className="text-white" />
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Fresh library incoming</h2>
                  <p className="mt-2 text-sm text-[#8a8a8a] max-w-sm">
                    We wiped the slate for the new VoidHub. Games are being added back one by one. Want yours first?
                  </p>
                  <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-white h-11 px-6 mt-7 text-sm">
                    <DiscordIcon size={16} /> Request a game
                  </a>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="mono-card py-16 text-center">
                <SearchIcon size={24} className="mx-auto text-[#444]" />
                <p className="mt-4 text-white">No games match that.</p>
                <p className="mt-1 text-sm text-[#6b6b6b]">Try another search or clear the filters.</p>
                <button onClick={clear} className="btn-outline h-10 px-5 mt-6 text-sm">Clear filters</button>
              </div>
            ) : (
              <>
                {filtering && (
                  <p className="mb-4 font-gmono text-xs text-[#6b6b6b]">
                    {visible.length} {visible.length === 1 ? 'result' : 'results'} ·{' '}
                    <button onClick={clear} className="text-white underline underline-offset-4 decoration-[#444] hover:decoration-white">clear</button>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visible.map(g => <GameCard key={g.id} game={g} onOpen={openGame} />)}
                </div>
              </>
            )}

            {games.length > 0 && (
              <div className="mt-16 mono-card p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Don&apos;t see your game?</h2>
                  <p className="mt-1.5 text-sm text-[#8a8a8a] max-w-md">The most requested games get built first. Drop yours in the Discord.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-white h-11 px-6 text-sm">
                    <DiscordIcon size={16} /> Request a game
                  </a>
                  <Link href="/status" className="btn-outline h-11 px-6 text-sm">Script status <ChevronRightIcon size={14} /></Link>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
        <GameSheet game={open} onClose={closeGame} />
      </div>
    </ToastProvider>
  )
}
