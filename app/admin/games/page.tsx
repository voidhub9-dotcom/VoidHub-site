'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  PlusIcon, SearchIcon, EditIcon, TrashIcon,
  AlertIcon, ImageIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon,
  CheckIcon, GamesIcon, BoltIcon, StarIcon,
} from '@/components/Icons'
import Modal from '@/components/Modal'
import GameModal, { GameFormData } from '@/components/GameModal'
import { useToast } from '@/components/Toast'

export interface Game {
  id: string; name: string; description: string; category: string
  status: 'active' | 'outdated'; thumbnail: string; scriptLink: string
  robloxUrl: string; features: string[]; featured: boolean; notes: string
  createdAt: string; updatedAt: string
}

const ITEMS_PER_PAGE = 12

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiGames(method: string, body?: object) {
  const res = await fetch('/api/admin/games', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function AdminGamesPage() {
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [games, setGames]                 = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [searchQuery, setSearchQuery]     = useState('')
  const [statusFilter, setStatusFilter]   = useState<'all'|'active'|'outdated'>('all')
  const [sortBy, setSortBy]               = useState<'newest'|'oldest'|'name'>('newest')
  const [currentPage, setCurrentPage]     = useState(1)
  const [loading, setLoading]             = useState(true)
  const [kvError, setKvError]             = useState(false)
  const [view, setView]                   = useState<'grid'|'list'>('grid')

  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [editingGame, setEditingGame]     = useState<Game | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Game | null>(null)

  // Bulk selection
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkLoading, setBulkLoading]     = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('voidhub_admin_games_view')
    if (saved === 'list' || saved === 'grid') setView(saved)
  }, [])

  const setViewPersist = (v: 'grid'|'list') => {
    setView(v)
    localStorage.setItem('voidhub_admin_games_view', v)
  }

  const loadGames = useCallback(async () => {
    setLoading(true)
    setKvError(false)
    setSelected(new Set())
    try {
      const data = await apiGames('GET')
      setGames(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setKvError(true)
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadGames() }, [loadGames])
  useEffect(() => { if (searchParams.get('action') === 'add') setIsModalOpen(true) }, [searchParams])

  useEffect(() => {
    let r = [...games]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      r = r.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') r = r.filter(g => g.status === statusFilter)
    switch (sortBy) {
      case 'newest': r.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': r.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'name':   r.sort((a,b) => a.name.localeCompare(b.name)); break
    }
    setFilteredGames(r)
    setCurrentPage(1)
    setSelected(new Set())
  }, [games, searchQuery, statusFilter, sortBy])

  const handleSaveGame = async (data: GameFormData) => {
    try {
      if (editingGame) {
        await apiGames('PUT', { id: editingGame.id, ...data })
        showToast(`Updated "${data.name}"`, 'success')
      } else {
        await apiGames('POST', data)
        showToast(`Added "${data.name}"`, 'success')
      }
      await loadGames()
      setIsModalOpen(false)
      setEditingGame(null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleDeleteGame = async () => {
    if (!deleteConfirm) return
    try {
      await apiGames('DELETE', { id: deleteConfirm.id })
      showToast(`Deleted "${deleteConfirm.name}"`, 'success')
      await loadGames()
      setDeleteConfirm(null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleToggleStatus = async (game: Game) => {
    const status = game.status === 'active' ? 'outdated' : 'active'
    try {
      await apiGames('PUT', { ...game, status })
      showToast(`"${game.name}" marked ${status}`, 'success')
      await loadGames()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  // Bulk helpers
  const pagedIds = filteredGames
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    .map(g => g.id)

  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selected.has(id))

  const toggleSelectAll = () => {
    const next = new Set(selected)
    if (allPageSelected) pagedIds.forEach(id => next.delete(id))
    else pagedIds.forEach(id => next.add(id))
    setSelected(next)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleBulkDelete = async () => {
    setBulkLoading(true)
    const ids = [...selected]
    let success = 0
    for (const id of ids) {
      try {
        await apiGames('DELETE', { id })
        success++
      } catch {}
    }
    showToast(`Deleted ${success} of ${ids.length} game${ids.length !== 1 ? 's' : ''}`, success > 0 ? 'success' : 'error')
    setBulkDeleteConfirm(false)
    setBulkLoading(false)
    await loadGames()
  }

  const handleBulkStatus = async (status: 'active' | 'outdated') => {
    setBulkLoading(true)
    const ids = [...selected]
    let success = 0
    for (const id of ids) {
      const game = games.find(g => g.id === id)
      if (!game) continue
      try {
        await apiGames('PUT', { ...game, id, status })
        success++
      } catch {}
    }
    showToast(`Updated ${success} game${success !== 1 ? 's' : ''} to ${status}`, success > 0 ? 'success' : 'error')
    setBulkLoading(false)
    await loadGames()
  }

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE)
  const pagedGames = filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const stats = {
    total: games.length,
    active: games.filter(g => g.status === 'active').length,
    outdated: games.filter(g => g.status === 'outdated').length,
    featured: games.filter(g => g.featured).length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 admin-stagger">
        <div>
          <p className="font-body text-xs text-silver-muted tracking-[0.3em] uppercase mb-1">Library</p>
          <h1 className="font-heading text-2xl text-white tracking-wide">MANAGE GAMES</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={loadGames} aria-label="Refresh games"
            className="flex items-center gap-2 px-3 h-10 border border-border-mid text-silver-mid rounded-lg font-body text-sm hover:text-white hover:border-white transition-all">
            <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => { setEditingGame(null); setIsModalOpen(true) }}
            className="flex items-center gap-2 px-4 h-10 bg-white text-black rounded-lg font-body text-sm font-semibold hover:shadow-[0_0_18px_rgba(255,255,255,0.35)] hover:scale-[1.02] transition-all">
            <PlusIcon size={16} /><span>ADD GAME</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={GamesIcon} label="Total Games" value={stats.total} delay={0} />
        <StatCard icon={BoltIcon} label="Active" value={stats.active} tone="success" delay={60} />
        <StatCard icon={AlertIcon} label="Outdated" value={stats.outdated} tone="danger" delay={120} />
        <StatCard icon={StarIcon} label="Featured" value={stats.featured} delay={180} />
      </div>

      {kvError && (
        <div className="mb-6 p-4 rounded-lg border border-danger/40 bg-danger/5 text-sm text-danger font-body">
          <strong>Storage error.</strong> Could not reach Cloudflare R2. Check that CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET_NAME are set correctly in your environment variables, then redeploy.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6 admin-stagger" style={{ animationDelay: '120ms' }}>
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-muted" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search games..."
            className="w-full h-10 pl-10 pr-4 bg-black-card border border-border-mid rounded-lg text-silver-bright font-body text-sm placeholder:text-silver-muted focus:outline-none focus:border-white transition-colors" />
        </div>

        {/* Segmented status filter */}
        <div className="flex items-center h-10 p-1 bg-black-card border border-border-mid rounded-lg">
          {([
            ['all', `All · ${stats.total}`],
            ['active', `Active · ${stats.active}`],
            ['outdated', `Outdated · ${stats.outdated}`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`h-full px-3 rounded-md font-body text-xs transition-all whitespace-nowrap ${
                statusFilter === key
                  ? 'bg-white text-black font-semibold'
                  : 'text-silver-muted hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} aria-label="Sort games"
            className="h-10 px-3 bg-black-card border border-border-mid rounded-lg text-silver-bright font-body text-sm focus:outline-none focus:border-white">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center h-10 p-1 bg-black-card border border-border-mid rounded-lg">
            <button onClick={() => setViewPersist('grid')} aria-label="Grid view"
              className={`h-full px-2.5 rounded-md transition-all ${view === 'grid' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button onClick={() => setViewPersist('list')} aria-label="List view"
              className={`h-full px-2.5 rounded-md transition-all ${view === 'list' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-4 z-20 mb-4 flex flex-wrap items-center gap-2 px-4 py-3 bg-black-elevated/95 backdrop-blur border border-border-bright rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] animate-fade-up">
          <button onClick={toggleSelectAll}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allPageSelected ? 'bg-white border-white' : 'border-border-mid hover:border-white'}`}
            aria-label="Select all on page">
            {allPageSelected && <CheckIcon size={10} className="text-black" />}
          </button>
          <span className="font-body text-sm text-white font-semibold">{selected.size} selected</span>
          <div className="h-4 w-px bg-border-mid mx-1" />
          <button onClick={() => handleBulkStatus('active')} disabled={bulkLoading}
            className="px-3 py-1.5 text-xs font-body text-success border border-success/40 rounded-lg hover:bg-success/10 transition-all disabled:opacity-50">
            Mark Active
          </button>
          <button onClick={() => handleBulkStatus('outdated')} disabled={bulkLoading}
            className="px-3 py-1.5 text-xs font-body text-danger border border-danger/40 rounded-lg hover:bg-danger/10 transition-all disabled:opacity-50">
            Mark Outdated
          </button>
          <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkLoading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-body text-white bg-danger/80 rounded-lg hover:bg-danger transition-all disabled:opacity-50">
            <TrashIcon size={13} />Delete {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-xs font-body text-silver-muted border border-border-dim rounded-lg hover:text-white transition-all">
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`bg-black-card border border-border-dim rounded-xl animate-pulse ${view === 'grid' ? 'h-52' : 'h-20'}`} />
          ))}
        </div>
      ) : pagedGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-black-card border border-border-dim rounded-xl text-center">
          <GamesIcon size={36} className="text-silver-faint mb-4" />
          <p className="font-heading text-sm text-silver-light tracking-wider mb-1">NO GAMES FOUND</p>
          <p className="font-body text-sm text-silver-muted mb-6">
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first game to get started.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button onClick={() => { setEditingGame(null); setIsModalOpen(true) }}
              className="flex items-center gap-2 px-4 h-10 bg-white text-black rounded-lg font-body text-sm font-semibold hover:scale-[1.02] transition-all">
              <PlusIcon size={16} /><span>ADD GAME</span>
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedGames.map((game, i) => (
            <GameGridCard
              key={game.id}
              game={game}
              index={i}
              isSelected={selected.has(game.id)}
              onSelect={() => toggleSelect(game.id)}
              onEdit={() => { setEditingGame(game); setIsModalOpen(true) }}
              onDelete={() => setDeleteConfirm(game)}
              onToggleStatus={() => handleToggleStatus(game)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pagedGames.map((game, i) => (
            <GameListRow
              key={game.id}
              game={game}
              index={i}
              isSelected={selected.has(game.id)}
              onSelect={() => toggleSelect(game.id)}
              onEdit={() => { setEditingGame(game); setIsModalOpen(true) }}
              onDelete={() => setDeleteConfirm(game)}
              onToggleStatus={() => handleToggleStatus(game)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
            className="flex items-center gap-1 px-3 py-2 border border-border-mid rounded-lg text-silver-mid font-body text-sm disabled:opacity-40 hover:text-white hover:border-white transition-all">
            <ChevronLeftIcon size={16} /><span>Prev</span>
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} aria-label={`Page ${i + 1}`}
                className={`w-8 h-8 rounded-lg font-body text-xs transition-all ${
                  currentPage === i + 1 ? 'bg-white text-black font-semibold' : 'text-silver-muted hover:text-white border border-border-dim'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
            className="flex items-center gap-1 px-3 py-2 border border-border-mid rounded-lg text-silver-mid font-body text-sm disabled:opacity-40 hover:text-white hover:border-white transition-all">
            <span>Next</span><ChevronRightIcon size={16} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGame(null) }} title={editingGame?'EDIT GAME':'ADD NEW GAME'} maxWidth="max-w-[720px]">
        <GameModal game={editingGame} onSave={handleSaveGame} onCancel={() => { setIsModalOpen(false); setEditingGame(null) }} />
      </Modal>

      {/* Single Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="DELETE GAME?" maxWidth="max-w-[360px]">
        <div className="text-center">
          <AlertIcon size={32} className="mx-auto text-danger mb-4" />
          <p className="text-silver-light font-body text-sm mb-6">Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This cannot be undone.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-5 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all">CANCEL</button>
            <button onClick={handleDeleteGame} className="flex items-center gap-2 px-5 h-10 bg-danger text-white rounded-lg font-body text-sm hover:bg-danger/80 transition-all">
              <TrashIcon size={16} /><span>DELETE</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirm */}
      <Modal isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title="DELETE SELECTED?" maxWidth="max-w-[380px]">
        <div className="text-center">
          <AlertIcon size={32} className="mx-auto text-danger mb-4" />
          <p className="text-silver-light font-body text-sm mb-2">
            You are about to delete <strong className="text-white">{selected.size} game{selected.size !== 1 ? 's' : ''}</strong>.
          </p>
          <p className="text-silver-muted font-body text-xs mb-6">This cannot be undone.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setBulkDeleteConfirm(false)} className="px-5 h-10 border border-silver-faint text-silver-mid rounded-lg font-body text-sm hover:border-white hover:text-white transition-all">CANCEL</button>
            <button onClick={handleBulkDelete} disabled={bulkLoading} className="flex items-center gap-2 px-5 h-10 bg-danger text-white rounded-lg font-body text-sm hover:bg-danger/80 disabled:opacity-60 transition-all">
              <TrashIcon size={16} />
              <span>{bulkLoading ? 'Deleting…' : `DELETE ${selected.size}`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, tone, delay }: {
  icon: typeof GamesIcon; label: string; value: number; tone?: 'success' | 'danger'; delay: number
}) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-silver-base'
  return (
    <div className="admin-stat-card admin-stagger bg-black-card border border-border-dim rounded-xl p-4 flex items-center gap-4 hover:border-border-bright transition-colors"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-lg bg-black-elevated border border-border-dim flex items-center justify-center ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="font-heading text-xl text-white leading-none">{value}</p>
        <p className="font-body text-xs text-silver-muted mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

interface GameItemProps {
  game: Game
  index: number
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}

function StatusBadge({ status, onClick }: { status: Game['status']; onClick: () => void }) {
  const active = status === 'active'
  return (
    <button onClick={onClick} title={`Click to mark ${active ? 'outdated' : 'active'}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-body border transition-all hover:scale-105 ${
        active
          ? 'bg-success/10 text-success border-success/30'
          : 'bg-danger/10 text-danger border-danger/30'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-danger'}`} />
      {active ? 'Active' : 'Outdated'}
    </button>
  )
}

function SelectCheck({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onSelect() }}
      aria-label={isSelected ? 'Deselect game' : 'Select game'}
      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
        isSelected ? 'bg-white border-white' : 'bg-black/60 backdrop-blur border-border-bright hover:border-white'
      }`}>
      {isSelected && <CheckIcon size={11} className="text-black" />}
    </button>
  )
}

function GameGridCard({ game, index, isSelected, onSelect, onEdit, onDelete, onToggleStatus }: GameItemProps) {
  return (
    <div
      className={`group admin-stagger relative bg-black-card border rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)] ${
        isSelected ? 'border-white shadow-[0_0_0_1px_#fff]' : 'border-border-dim hover:border-border-bright'
      }`}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-black-surface overflow-hidden">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={24} className="text-silver-faint" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black-card via-transparent to-transparent" />

        {/* Selection checkbox */}
        <div className={`absolute top-3 left-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <SelectCheck isSelected={isSelected} onSelect={onSelect} />
        </div>

        {/* Featured ribbon */}
        {game.featured && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[0.6rem] font-heading tracking-wider bg-white text-black">
            FEATURED
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-body font-semibold text-white text-sm leading-snug text-pretty">{game.name}</h3>
          <StatusBadge status={game.status} onClick={onToggleStatus} />
        </div>
        <div className="flex items-center gap-2 text-silver-muted font-body text-xs mb-4">
          <span className="px-1.5 py-0.5 rounded bg-black-elevated border border-border-dim">{game.category || 'Uncategorized'}</span>
          <span>·</span>
          <span>{timeAgo(new Date(game.createdAt))}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border-mid text-silver-mid font-body text-xs hover:text-white hover:border-white transition-all">
            <EditIcon size={13} /><span>Edit</span>
          </button>
          <button onClick={onDelete} aria-label={`Delete ${game.name}`}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-mid text-silver-muted hover:text-danger hover:border-danger/60 transition-all">
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function GameListRow({ game, index, isSelected, onSelect, onEdit, onDelete, onToggleStatus }: GameItemProps) {
  return (
    <div
      className={`group admin-stagger flex items-center gap-4 px-4 py-3 bg-black-card border rounded-xl transition-all ${
        isSelected ? 'border-white' : 'border-border-dim hover:border-border-bright'
      }`}
      style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
    >
      <SelectCheck isSelected={isSelected} onSelect={onSelect} />
      <div className="w-12 h-12 rounded-lg bg-black-surface border border-border-dim flex items-center justify-center overflow-hidden shrink-0">
        {game.thumbnail
          ? <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
          : <ImageIcon size={16} className="text-silver-faint" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-body font-semibold text-white text-sm truncate">{game.name}</span>
          {game.featured && (
            <span className="px-1.5 py-0.5 rounded-full text-[0.6rem] font-heading tracking-wider bg-white text-black shrink-0">FEAT</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-silver-muted font-body text-xs mt-0.5">
          <span>{game.category || 'Uncategorized'}</span>
          <span>·</span>
          <span>{timeAgo(new Date(game.createdAt))}</span>
        </div>
      </div>
      <div className="hidden sm:block">
        <StatusBadge status={game.status} onClick={onToggleStatus} />
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} aria-label={`Edit ${game.name}`}
          className="p-2 rounded-lg text-silver-muted hover:text-white hover:bg-black-elevated transition-all">
          <EditIcon size={15} />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${game.name}`}
          className="p-2 rounded-lg text-silver-muted hover:text-danger hover:bg-danger/10 transition-all">
          <TrashIcon size={15} />
        </button>
      </div>
    </div>
  )
}

function timeAgo(date: Date) {
  const d = Date.now() - date.getTime()
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${dy}d ago`
}
