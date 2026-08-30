'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GameCard from '@/components/GameCard'
import GameCardSkeleton from '@/components/GameCardSkeleton'
import { ToastProvider } from '@/components/Toast'
import { SearchIcon, DiscordIcon, StarIcon, CheckIcon, TerminalIcon, XIcon } from '@/components/Icons'

type FilterStatus = 'all' | 'active' | 'outdated'

const supportedExecutors = ['Potassium', 'Seliware', 'Madium', 'Cosmic', 'Macsploit', 'Volt', 'Delta', 'Codex', 'Wave', 'Real']

function applySort(arr: any[]) {
  return [...arr].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => setDiscordLink(data.discord))
      .catch(() => {})

    fetch('/api/public/games')
      .then(r => r.json())
      .then(data => {
        setGames(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    games.forEach(g => { if (g.category) set.add(g.category) })
    return ['all', ...Array.from(set).sort()]
  }, [games])

  const filtered = useMemo(() => {
    let r = [...games]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      r = r.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') r = r.filter(g => g.status === statusFilter)
    if (categoryFilter !== 'all') r = r.filter(g => g.category === categoryFilter)
    return applySort(r)
  }, [games, searchQuery, statusFilter, categoryFilter])

  const isFiltering = searchQuery !== '' || statusFilter !== 'all' || categoryFilter !== 'all'
  const featuredGames = useMemo(() => (isFiltering ? [] : filtered.filter(g => g.featured)), [filtered, isFiltering])
  const regularGames  = useMemo(() => (isFiltering ? filtered : filtered.filter(g => !g.featured)), [filtered, isFiltering])

  const activeCount   = games.filter(g => g.status === 'active').length
  const featuredCount = games.filter(g => g.featured).length

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCategoryFilter('all')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />
        <main className="pt-24 pb-20 px-4">
          <div className="max-w-7xl mx-auto">

            {/* Hero */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black-card border border-border-dim rounded-full mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" aria-hidden="true" />
                <span className="font-body text-xs text-silver-mid tracking-wide">Keyless · Free · One universal loader</span>
              </div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-white mb-3 text-balance">SUPPORTED GAMES</h1>
              <p className="font-body text-silver-mid text-sm md:text-base text-pretty max-w-xl mx-auto">
                Free keyless scripts for the most popular Roblox games. Copy one loadstring and it works in every game below.
              </p>
            </div>

            {/* Stats bar */}
            <div className="flex justify-center gap-3 md:gap-4 mb-8">
              {[
                { label: 'GAMES', value: games.length },
                { label: 'ACTIVE', value: activeCount },
                { label: 'FEATURED', value: featuredCount },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col items-center px-6 py-3 bg-black-card border border-border-dim rounded-xl min-w-[100px]">
                  <span className="font-heading text-xl md:text-2xl text-white">
                    {loading ? '—' : stat.value}
                  </span>
                  <span className="font-body text-[0.65rem] tracking-widest text-silver-muted">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Supported executors strip */}
            <div className="max-w-4xl mx-auto mb-10">
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-black-card border border-border-dim rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 shrink-0">
                  <TerminalIcon size={15} className="text-white" />
                  <span className="font-heading text-xs tracking-widest text-white">WORKS WITH</span>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  {supportedExecutors.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-dim bg-black-void font-body text-xs text-silver-mid"
                    >
                      <CheckIcon size={10} className="text-white" />
                      {name}
                    </span>
                  ))}
                </div>
                <Link
                  href="/status"
                  className="font-body text-xs text-silver-muted underline underline-offset-2 hover:text-white transition-colors duration-200 shrink-0 sm:ml-auto"
                >
                  Full list
                </Link>
              </div>
            </div>

            {/* Search + status filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 max-w-3xl mx-auto">
              <div className="relative flex-1">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  aria-label="Search games"
                  className="w-full h-11 pl-11 pr-10 bg-black-card border border-border-mid rounded-lg text-silver-bright font-body text-sm placeholder:text-silver-muted focus:outline-none focus:border-white focus:shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-muted hover:text-white transition-colors duration-200"
                  >
                    <XIcon size={16} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'outdated'] as FilterStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 h-11 rounded-lg font-body text-sm capitalize transition-all duration-200 ${
                      statusFilter === s
                        ? 'bg-white text-black'
                        : 'border border-silver-faint text-silver-mid hover:border-white hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Category chips */}
            {categories.length > 2 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-3xl mx-auto">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-3 py-1.5 rounded-full font-body text-xs capitalize transition-all duration-200 ${
                      categoryFilter === c
                        ? 'bg-white text-black'
                        : 'bg-black-card border border-border-dim text-silver-muted hover:border-silver-faint hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Results count while filtering */}
            {isFiltering && !loading && (
              <div className="flex items-center justify-center gap-3 mb-8">
                <p className="font-body text-xs text-silver-muted">
                  {filtered.length} {filtered.length === 1 ? 'game' : 'games'} found
                </p>
                <button
                  onClick={clearFilters}
                  className="font-body text-xs text-silver-mid underline underline-offset-2 hover:text-white transition-colors duration-200"
                >
                  Clear filters
                </button>
              </div>
            )}
            {!isFiltering && <div className="mb-4" />}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                {/* Featured section */}
                {featuredGames.length > 0 && (
                  <section className="mb-12" aria-label="Featured games">
                    <div className="flex items-center gap-2 mb-4">
                      <StarIcon size={16} className="text-white" />
                      <h2 className="font-heading text-sm tracking-widest text-white">FEATURED</h2>
                      <div className="flex-1 h-px bg-border-dim" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {featuredGames.map(game => (
                        <GameCard key={game.id} game={game} />
                      ))}
                    </div>
                  </section>
                )}

                {/* All games */}
                {regularGames.length > 0 && (
                  <section aria-label="All games">
                    {featuredGames.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="font-heading text-sm tracking-widest text-white">ALL GAMES</h2>
                        <div className="flex-1 h-px bg-border-dim" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {regularGames.map(game => (
                        <GameCard key={game.id} game={game} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-black-card border border-border-dim rounded-xl max-w-xl mx-auto">
                <SearchIcon size={28} className="text-silver-faint mx-auto mb-4" />
                <p className="font-body text-silver-muted text-lg mb-2">No games found</p>
                <p className="font-body text-silver-faint text-sm mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-silver-faint text-silver-mid rounded-lg font-body text-sm transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="mt-16 bg-black-card border border-border-mid rounded-xl p-8 text-center max-w-2xl mx-auto">
              <h2 className="font-heading text-lg text-white mb-2">Don&apos;t see your game?</h2>
              <p className="font-body text-silver-mid text-sm mb-6 max-w-md mx-auto">
                More games are being added regularly. Join our Discord to suggest your favorite game — the most requested ones get prioritized.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-body text-sm transition-all duration-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-[1.02]"
                >
                  <DiscordIcon size={18} />
                  <span>SUGGEST A GAME</span>
                </a>
                <Link
                  href="/status"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-silver-faint text-silver-mid rounded-lg font-body text-sm transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
                >
                  <span>CHECK SCRIPT STATUS</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
