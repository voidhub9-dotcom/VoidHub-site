'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GameCard from '@/components/GameCard'
import GameCardSkeleton from '@/components/GameCardSkeleton'
import { ToastProvider } from '@/components/Toast'
import { SearchIcon, DiscordIcon, StarIcon, CheckIcon, TerminalIcon, XIcon, FilterIcon } from '@/components/Icons'

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

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

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileFiltersOpen])

  const categories = useMemo(() => {
    const set = new Set<string>()
    games.forEach(g => { if (g.category) set.add(g.category) })
    return Array.from(set).sort()
  }, [games])

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    games.forEach(g => { if (g.category) map[g.category] = (map[g.category] || 0) + 1 })
    return map
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

  const activeCount = games.filter(g => g.status === 'active').length
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCategoryFilter('all')
  }

  const statusOptions: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All Games', count: games.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'outdated', label: 'Outdated', count: games.length - activeCount },
  ]

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />
        <main className="pt-24 pb-20 px-4">
          <div className="max-w-[1400px] mx-auto">

            {/* Compact header — title/stats + search, no giant centered hero block */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" aria-hidden="true" />
                  <span className="font-body text-xs text-silver-muted tracking-widest uppercase">Free · One universal loader</span>
                </div>
                <h1 className="font-heading text-[clamp(1.8rem,3.2vw,2.6rem)] text-white text-balance">
                  SUPPORTED <span className="text-glow">GAMES</span>
                </h1>
                <p className="font-body text-silver-mid text-sm mt-1">
                  {loading ? 'Loading catalog...' : `${games.length} ${games.length === 1 ? 'script' : 'scripts'} · ${activeCount} active · one loadstring covers all of them`}
                </p>
              </div>

              <div className="flex items-center gap-2 lg:w-[360px]">
                <div className="relative flex-1">
                  <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search games..."
                    aria-label="Search games"
                    className="w-full h-11 pl-10 pr-9 bg-black-card border border-border-mid rounded-lg text-silver-bright font-body text-sm placeholder:text-silver-muted focus:outline-none focus:border-white focus:shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-muted hover:text-white transition-colors duration-200"
                    >
                      <XIcon size={15} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden relative shrink-0 h-11 w-11 flex items-center justify-center border border-border-mid rounded-lg text-silver-mid hover:border-white hover:text-white transition-all"
                  aria-label="Open filters"
                >
                  <FilterIcon size={17} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black text-[0.6rem] font-heading flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-8">
              {/* Sidebar — desktop only */}
              <aside className="hidden lg:block w-[240px] shrink-0">
                <div className="sticky top-24 flex flex-col gap-6">
                  <div>
                    <h2 className="font-heading text-[0.65rem] tracking-widest text-silver-muted uppercase mb-3">Status</h2>
                    <div className="flex flex-col gap-1">
                      {statusOptions.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setStatusFilter(opt.key)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg font-body text-sm transition-all duration-200 ${
                            statusFilter === opt.key
                              ? 'bg-white text-black'
                              : 'text-silver-mid hover:bg-black-card hover:text-white'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className={statusFilter === opt.key ? 'text-black/60' : 'text-silver-faint'}>{opt.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <h2 className="font-heading text-[0.65rem] tracking-widest text-silver-muted uppercase mb-3">Category</h2>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setCategoryFilter('all')}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg font-body text-sm capitalize transition-all duration-200 ${
                            categoryFilter === 'all'
                              ? 'bg-white text-black'
                              : 'text-silver-mid hover:bg-black-card hover:text-white'
                          }`}
                        >
                          <span>All Categories</span>
                        </button>
                        {categories.map(c => (
                          <button
                            key={c}
                            onClick={() => setCategoryFilter(c)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg font-body text-sm capitalize transition-all duration-200 ${
                              categoryFilter === c
                                ? 'bg-white text-black'
                                : 'text-silver-mid hover:bg-black-card hover:text-white'
                            }`}
                          >
                            <span>{c}</span>
                            <span className={categoryFilter === c ? 'text-black/60' : 'text-silver-faint'}>{categoryCounts[c]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative overflow-hidden bg-black-card border border-border-dim rounded-xl p-4">
                    <div
                      className="absolute inset-x-0 top-0 h-[2px] opacity-60"
                      style={{ background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))' }}
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-2 mb-2.5">
                      <TerminalIcon size={13} className="text-white" />
                      <span className="font-heading text-[0.65rem] tracking-widest text-white uppercase">Works With</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {supportedExecutors.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border-dim bg-black-void font-body text-[0.68rem] text-silver-mid">
                          <CheckIcon size={9} className="text-white" />
                          {name}
                        </span>
                      ))}
                    </div>
                    <Link href="/status" className="block mt-2.5 font-body text-xs text-silver-muted underline underline-offset-2 hover:text-white transition-colors duration-200">
                      Full compatibility list
                    </Link>
                  </div>

                  <a
                    href={discordLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary !w-full !py-2.5 text-sm"
                  >
                    <DiscordIcon size={16} />
                    <span>SUGGEST A GAME</span>
                  </a>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {isFiltering && !loading && (
                  <div className="flex items-center gap-3 mb-5">
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

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <GameCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <>
                    {featuredGames.length > 0 && (
                      <section className="mb-10" aria-label="Featured games">
                        <div className="flex items-center gap-2 mb-4">
                          <StarIcon size={15} className="text-white" />
                          <h2 className="font-heading text-sm tracking-widest text-white">FEATURED</h2>
                          <div className="flex-1 h-px bg-border-dim" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {featuredGames.map(game => (
                            <GameCard key={game.id} game={game} />
                          ))}
                        </div>
                      </section>
                    )}

                    {regularGames.length > 0 && (
                      <section aria-label="All games">
                        {featuredGames.length > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="font-heading text-sm tracking-widest text-white">ALL GAMES</h2>
                            <div className="flex-1 h-px bg-border-dim" />
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {regularGames.map(game => (
                            <GameCard key={game.id} game={game} />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 bg-black-card border border-border-dim rounded-2xl">
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
                <div className="relative overflow-hidden mt-14 bg-black-card border border-border-mid rounded-2xl p-8 text-center">
                  <div
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))' }}
                    aria-hidden="true"
                  />
                  <h2 className="font-heading text-lg text-white mb-2">Don&apos;t see your game?</h2>
                  <p className="font-body text-silver-mid text-sm mb-6 max-w-md mx-auto">
                    More games are being added regularly. Join our Discord to suggest your favorite game — the most requested ones get prioritized.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
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
            </div>
          </div>
        </main>
        <Footer />

        {/* Mobile filter sheet */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-black-surface border-l border-border-dim overflow-y-auto animate-slideUp">
              <div className="flex items-center justify-between p-4 border-b border-border-dim">
                <span className="font-heading text-sm text-white tracking-wide">FILTERS</span>
                <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="p-1.5 text-silver-mid hover:text-white transition-colors">
                  <XIcon size={20} />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-6">
                <div>
                  <h2 className="font-heading text-[0.65rem] tracking-widest text-silver-muted uppercase mb-3">Status</h2>
                  <div className="flex flex-col gap-1">
                    {statusOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setStatusFilter(opt.key)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-body text-sm transition-all duration-200 ${
                          statusFilter === opt.key ? 'bg-white text-black' : 'text-silver-mid hover:bg-black-card hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className={statusFilter === opt.key ? 'text-black/60' : 'text-silver-faint'}>{opt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div>
                    <h2 className="font-heading text-[0.65rem] tracking-widest text-silver-muted uppercase mb-3">Category</h2>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-body text-sm transition-all duration-200 ${
                          categoryFilter === 'all' ? 'bg-white text-black' : 'text-silver-mid hover:bg-black-card hover:text-white'
                        }`}
                      >
                        <span>All Categories</span>
                      </button>
                      {categories.map(c => (
                        <button
                          key={c}
                          onClick={() => setCategoryFilter(c)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-body text-sm capitalize transition-all duration-200 ${
                            categoryFilter === c ? 'bg-white text-black' : 'text-silver-mid hover:bg-black-card hover:text-white'
                          }`}
                        >
                          <span>{c}</span>
                          <span className={categoryFilter === c ? 'text-black/60' : 'text-silver-faint'}>{categoryCounts[c]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { clearFilters(); setMobileFiltersOpen(false) }}
                  className="px-4 py-2.5 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all"
                >
                  Clear all filters
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="btn-primary !w-full"
                >
                  Show {filtered.length} {filtered.length === 1 ? 'game' : 'games'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  )
}
