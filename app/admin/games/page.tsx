'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  PlusIcon, SearchIcon, EditIcon, TrashIcon,
  AlertIcon, ImageIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon,
  CheckIcon, GamesIcon,
} from '@/components/Icons'
import Modal from '@/components/Modal'
import { isNewGame, useRobloxInfo, placeIdOf, compact } from '@/lib/roblox-info'
import { PageHead, StatStrip, Segmented, Empty, inputCls, btnDanger } from '@/components/AdminUI'
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

  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const handleResetAll = async () => {
    if (!games.length || resetText !== 'RESET') return
    setResetOpen(false)
    setResetText('')
    try {
      await apiGames('DELETE', { all: true })
      showToast('All games removed', 'success')
      await loadGames()
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
    fresh: games.filter(g => isNewGame(g.createdAt)).length,
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <PageHead
        eyebrow="Content"
        title="Games"
        subtitle="Everything on the public games page. Paste a Roblox link to add one."
        actions={
          <>
            <button onClick={loadGames} aria-label="Refresh" className="btn-outline w-10 h-10"><RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={() => { setEditingGame(null); setIsModalOpen(true) }} className="btn-white h-10 px-5 text-sm"><PlusIcon size={14} /> Add game</button>
          </>
        }
      />

      <StatStrip items={[
        { label: 'Total', value: loading ? '–' : stats.total, sub: 'games' },
        { label: 'Working', value: loading ? '–' : stats.active, dot: 'bg-success', sub: 'live' },
        { label: 'Updating', value: loading ? '–' : stats.outdated, dot: stats.outdated ? 'bg-warning' : 'bg-[#333]', sub: 'need a fix' },
        { label: 'New this week', value: loading ? '–' : stats.fresh, dot: 'bg-white', sub: 'glowing on the site' },
      ]} />

      {kvError && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/[0.04] px-5 py-4 flex items-center gap-3 text-sm">
          <AlertIcon size={16} className="text-danger shrink-0" />
          <span className="flex-1 text-[#a3a3a3]">Couldn&apos;t reach storage. Check the R2 environment variables.</span>
          <button onClick={loadGames} className={btnDanger}>Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
          <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search games…" className={`${inputCls} !pl-10`} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: `All ${stats.total}` },
              { value: 'active', label: `Working ${stats.active}` },
              { value: 'outdated', label: `Updating ${stats.outdated}` },
            ]}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} aria-label="Sort"
            className="shrink-0 h-10 pl-3 pr-8 rounded-full bg-[#0a0a0a] border border-[#1f1f1f] text-xs text-[#d4d4d4] focus:outline-none">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">A–Z</option>
          </select>
          <Segmented value={view} onChange={setViewPersist} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
        </div>
      </div>

      {!loading && pagedGames.length > 0 && (
        <div className="flex items-center justify-between mb-3 text-xs text-[#6b6b6b]">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-white">
            <SelectCheck isSelected={allPageSelected} onSelect={toggleSelectAll} /> Select page
          </button>
          <span>{filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/3] rounded-2xl bg-[#0b0b0b] border border-[#161616] animate-pulse" />)}
        </div>
      ) : pagedGames.length === 0 ? (
        <Empty
          icon={<GamesIcon size={20} />}
          title={games.length === 0 ? 'No games yet' : 'Nothing matches that'}
          body={games.length === 0 ? 'Paste a Roblox link and the name, icon and banner fill themselves in.' : 'Try another search or filter.'}
          action={games.length === 0 ? <button onClick={() => { setEditingGame(null); setIsModalOpen(true) }} className="btn-white h-10 px-5 text-sm"><PlusIcon size={14} /> Add your first game</button> : undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedGames.map((game, i) => (
            <GameGridCard key={game.id} game={game} index={i} isSelected={selected.has(game.id)} onSelect={() => toggleSelect(game.id)}
              onEdit={() => { setEditingGame(game); setIsModalOpen(true) }} onDelete={() => setDeleteConfirm(game)} onToggleStatus={() => handleToggleStatus(game)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] divide-y divide-[#141414] overflow-hidden">
          {pagedGames.map((game, i) => (
            <GameListRow key={game.id} game={game} index={i} isSelected={selected.has(game.id)} onSelect={() => toggleSelect(game.id)}
              onEdit={() => { setEditingGame(game); setIsModalOpen(true) }} onDelete={() => setDeleteConfirm(game)} onToggleStatus={() => handleToggleStatus(game)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-outline w-10 h-10 disabled:opacity-30" aria-label="Previous page"><ChevronLeftIcon size={15} /></button>
          <span className="font-gmono text-xs text-[#8a8a8a] px-3">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-outline w-10 h-10 disabled:opacity-30" aria-label="Next page"><ChevronRightIcon size={15} /></button>
        </div>
      )}

      {games.length > 0 && !loading && (
        <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-danger/20 px-5 py-4">
          <div>
            <p className="text-sm text-white">Start the list over</p>
            <p className="text-xs text-[#6b6b6b]">Deletes every game. Export a backup in Settings first.</p>
          </div>
          <button onClick={() => setResetOpen(true)} className={btnDanger}><TrashIcon size={14} /> Reset all games</button>
        </div>
      )}

      {/* Bulk action bar */}
      <div className={`fixed bottom-4 left-4 right-4 lg:left-[calc(240px+2.5rem)] z-40 transition-all duration-300 ${selected.size ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <span className="text-sm text-white">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelected(new Set())} className="h-9 px-3 rounded-full text-xs text-[#8a8a8a] hover:text-white">Clear</button>
            <button onClick={() => handleBulkStatus('active')} disabled={bulkLoading} className="btn-outline h-9 px-3.5 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Working</button>
            <button onClick={() => handleBulkStatus('outdated')} disabled={bulkLoading} className="btn-outline h-9 px-3.5 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> Updating</button>
            <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkLoading} className={btnDanger + ' !h-9 !text-xs'}><TrashIcon size={13} /> Delete</button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGame(null) }} title={editingGame ? 'Edit game' : 'Add a game'} maxWidth="max-w-[960px]">
        <GameModal game={editingGame} onSave={handleSaveGame} onCancel={() => { setIsModalOpen(false); setEditingGame(null) }} />
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete game?" maxWidth="max-w-[420px]">
        <p className="text-sm text-[#a3a3a3]"><span className="text-white">{deleteConfirm?.name}</span> will disappear from the site right away.</p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
          <button onClick={handleDeleteGame} className={btnDanger}><TrashIcon size={14} /> Delete</button>
        </div>
      </Modal>

      <Modal isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title={`Delete ${selected.size} games?`} maxWidth="max-w-[420px]">
        <p className="text-sm text-[#a3a3a3]">They&apos;ll disappear from the site right away. This can&apos;t be undone.</p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setBulkDeleteConfirm(false)} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className={btnDanger}>{bulkLoading ? <RefreshIcon size={14} className="animate-spin" /> : <TrashIcon size={14} />} Delete</button>
        </div>
      </Modal>

      <Modal isOpen={resetOpen} onClose={() => { setResetOpen(false); setResetText('') }} title="Reset all games?" maxWidth="max-w-[440px]">
        <p className="text-sm text-[#a3a3a3]">This deletes all <span className="text-white">{games.length}</span> games. Type <code className="font-gmono text-danger">RESET</code> to confirm.</p>
        <input value={resetText} onChange={e => setResetText(e.target.value)} placeholder="RESET" className={`${inputCls} mt-4 font-gmono`} autoFocus />
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => { setResetOpen(false); setResetText('') }} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
          <button onClick={handleResetAll} disabled={resetText !== 'RESET'} className={btnDanger}><TrashIcon size={14} /> Delete everything</button>
        </div>
      </Modal>
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

function SelectCheck({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
  return (
    <span
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSelect() } }}
      className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-white border-white text-black' : 'border-[#444] bg-black/60 backdrop-blur hover:border-white'}`}
    >
      {isSelected && <CheckIcon size={12} />}
    </span>
  )
}

function StatusToggle({ status, onClick }: { status: Game['status']; onClick: () => void }) {
  const ok = status === 'active'
  return (
    <button onClick={onClick} title="Tap to switch" className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs transition-colors ${ok ? 'border-success/25 text-success hover:bg-success/10' : 'border-warning/30 text-warning hover:bg-warning/10'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`} />{ok ? 'Working' : 'Updating'}
    </button>
  )
}

function GameGridCard({ game, isSelected, onSelect, onEdit, onDelete, onToggleStatus }: GameItemProps) {
  const info = useRobloxInfo(placeIdOf(game))
  const banner = info?.banner || game.thumbnail || info?.thumbnail
  const icon = game.thumbnail || info?.thumbnail
  return (
    <div className={`group rounded-2xl border bg-[#070707] overflow-hidden transition-colors ${isSelected ? 'border-white' : 'border-[#1c1c1c] hover:border-[#333]'}`}>
      <div className="relative aspect-[16/9] bg-[#111] overflow-hidden cursor-pointer" onClick={onEdit}>
        {banner ? <img src={banner} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full mono-dots flex items-center justify-center"><ImageIcon size={22} className="text-[#333]" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-black/30" />
        <div className={`absolute top-3 left-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
          <SelectCheck isSelected={isSelected} onSelect={onSelect} />
        </div>
        {isNewGame(game.createdAt) && <span className="absolute top-3 right-3 shimmer-pill h-6 px-2.5 rounded-full font-gmono text-[0.6rem] text-black flex items-center">just added</span>}
      </div>
      <div className="px-4 pb-4 -mt-6 relative">
        <div className="flex items-end justify-between gap-2">
          <span className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#070707] bg-[#161616] shrink-0 flex items-center justify-center">
            {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold">{game.name.slice(0, 1)}</span>}
          </span>
          <StatusToggle status={game.status} onClick={onToggleStatus} />
        </div>
        <p className="mt-2.5 text-[0.95rem] font-medium text-white truncate">{game.name}</p>
        <p className="text-xs text-[#6b6b6b] truncate">
          {game.category || 'Uncategorized'} · {timeAgo(new Date(game.createdAt))}{info?.playing != null ? ` · ${compact(info.playing)} playing` : ''}
        </p>
        {game.notes?.trim() && <p className="mt-2 text-xs text-[#8a8a8a] line-clamp-1" title={game.notes}>📝 {game.notes}</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={onEdit} className="btn-outline flex-1 h-9 text-xs"><EditIcon size={13} /> Edit</button>
          <button onClick={onDelete} aria-label={`Delete ${game.name}`} className="w-9 h-9 rounded-full border border-[#262626] flex items-center justify-center text-[#6b6b6b] hover:text-danger hover:border-danger/40"><TrashIcon size={13} /></button>
        </div>
      </div>
    </div>
  )
}

function GameListRow({ game, isSelected, onSelect, onEdit, onDelete, onToggleStatus }: GameItemProps) {
  const info = useRobloxInfo(placeIdOf(game))
  const icon = game.thumbnail || info?.thumbnail
  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 ${isSelected ? 'bg-white/[0.04]' : ''}`}>
      <SelectCheck isSelected={isSelected} onSelect={onSelect} />
      <span className="w-11 h-11 rounded-xl overflow-hidden border border-[#222] bg-[#141414] shrink-0 flex items-center justify-center">
        {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={15} className="text-[#444]" />}
      </span>
      <button onClick={onEdit} className="flex-1 min-w-0 text-left">
        <span className="flex items-center gap-2">
          <span className="text-sm text-white truncate">{game.name}</span>
          {isNewGame(game.createdAt) && <span className="shimmer-pill h-5 px-2 rounded-full font-gmono text-[0.55rem] text-black flex items-center shrink-0">new</span>}
        </span>
        <span className="block text-xs text-[#6b6b6b] truncate">{game.category || 'Uncategorized'} · {timeAgo(new Date(game.createdAt))}{info?.playing != null ? ` · ${compact(info.playing)} playing` : ''}</span>
      </button>
      <div className="flex items-center gap-1 ml-auto">
        <StatusToggle status={game.status} onClick={onToggleStatus} />
        <button onClick={onEdit} aria-label={`Edit ${game.name}`} className="w-9 h-9 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-white hover:bg-white/[0.06]"><EditIcon size={14} /></button>
        <button onClick={onDelete} aria-label={`Delete ${game.name}`} className="w-9 h-9 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-danger hover:bg-danger/10"><TrashIcon size={14} /></button>
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
