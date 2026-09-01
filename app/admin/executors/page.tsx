'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PlusIcon, SearchIcon, TrashIcon, CheckIcon, AlertIcon,
  BoltIcon, RefreshIcon, EditIcon, GlobeIcon, DiscordIcon,
} from '@/components/Icons'
import Modal from '@/components/Modal'
import ExecutorIcon from '@/components/ExecutorIcon'
import { useToast } from '@/components/Toast'
import ImageUploadInput from '@/components/ImageUploadInput'
import type { Executor } from '@/lib/kv'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiExecutors(method: 'GET' | 'POST', body?: Executor[]) {
  const res = await fetch('/api/admin/executors', {
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

const EMPTY_FORM: Executor = { name: '', status: 'supported', websiteUrl: '', discordUrl: '', icon: '' }

export default function AdminExecutorsPage() {
  const { showToast } = useToast()

  const [executors, setExecutors] = useState<Executor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'supported' | 'unsupported'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<Executor>(EMPTY_FORM)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    apiExecutors('GET')
      .then(data => setExecutors(Array.isArray(data) ? data : []))
      .catch(() => showToast('Failed to load executors', 'error'))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const persist = async (next: Executor[], successMsg: string) => {
    setSaving(true)
    const prev = executors
    setExecutors(next)
    try {
      await apiExecutors('POST', next)
      showToast(successMsg, 'success')
    } catch (e) {
      setExecutors(prev)
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openAdd = () => {
    setEditIndex(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (index: number) => {
    setEditIndex(index)
    setForm({ websiteUrl: '', discordUrl: '', icon: '', ...executors[index] })
    setModalOpen(true)
  }

  const submitForm = () => {
    const name = form.name.trim()
    if (!name) {
      showToast('Name is required', 'error')
      return
    }
    const entry: Executor = { name, status: form.status }
    if (form.websiteUrl?.trim()) entry.websiteUrl = form.websiteUrl.trim()
    if (form.discordUrl?.trim()) entry.discordUrl = form.discordUrl.trim()
    if (form.icon?.trim()) entry.icon = form.icon.trim()
    const next = [...executors]
    if (editIndex === null) {
      if (next.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        showToast('An executor with that name already exists', 'error')
        return
      }
      next.push(entry)
    } else {
      next[editIndex] = entry
    }
    setModalOpen(false)
    persist(next, editIndex === null ? `Added ${name}` : `Updated ${name}`)
  }

  const toggleStatus = (index: number) => {
    const next = executors.map((e, i) =>
      i === index
        ? { ...e, status: e.status === 'supported' ? 'unsupported' as const : 'supported' as const }
        : e,
    )
    persist(next, `${executors[index].name} marked ${next[index].status}`)
  }

  const confirmDelete = () => {
    if (deleteIndex === null) return
    const name = executors[deleteIndex].name
    const next = executors.filter((_, i) => i !== deleteIndex)
    setDeleteIndex(null)
    persist(next, `Deleted ${name}`)
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= executors.length) return
    const next = [...executors]
    ;[next[index], next[target]] = [next[target], next[index]]
    persist(next, 'Order updated')
  }

  const visible = useMemo(() => {
    return executors
      .map((e, i) => ({ ...e, _index: i }))
      .filter(e => filter === 'all' || e.status === filter)
      .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  }, [executors, filter, search])

  const supportedCount = executors.filter(e => e.status === 'supported').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl text-white tracking-widest uppercase">Executors</h1>
          <p className="font-body text-sm text-silver-muted mt-1">
            Manage the executor compatibility list shown on the public status page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost !px-4 !py-2 text-xs" disabled={loading}>
            <RefreshIcon size={14} />
            Refresh
          </button>
          <button onClick={openAdd} className="btn-primary !px-4 !py-2 text-xs">
            <PlusIcon size={14} />
            Add Executor
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="void-card admin-stat-card p-4">
          <p className="font-body text-[0.65rem] text-silver-muted tracking-widest uppercase">Total</p>
          <p className="font-heading text-2xl text-white mt-1">{executors.length}</p>
        </div>
        <div className="void-card admin-stat-card p-4">
          <p className="font-body text-[0.65rem] text-silver-muted tracking-widest uppercase">Working</p>
          <p className="font-heading text-2xl text-success mt-1">{supportedCount}</p>
        </div>
        <div className="void-card admin-stat-card p-4">
          <p className="font-body text-[0.65rem] text-silver-muted tracking-widest uppercase">Not Working</p>
          <p className="font-heading text-2xl text-danger mt-1">{executors.length - supportedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search executors..."
            className="void-input !pl-9"
          />
        </div>
        <div className="flex rounded-md border border-border-mid overflow-hidden">
          {(['all', 'supported', 'unsupported'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-body capitalize transition-colors ${
                filter === f ? 'bg-black-elevated text-white' : 'text-silver-muted hover:text-silver-light'
              }`}
            >
              {f === 'all' ? `All (${executors.length})` : f === 'supported' ? `Working (${supportedCount})` : `Not working (${executors.length - supportedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="void-card h-16 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="void-card flex flex-col items-center justify-center py-16 gap-3">
          <BoltIcon size={32} className="text-silver-faint" />
          <p className="font-body text-sm text-silver-muted">
            {executors.length === 0 ? 'No executors yet. Add your first one.' : 'Nothing matches your search.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Executor list">
          {visible.map(exec => (
            <li key={`${exec.name}-${exec._index}`} className="void-card admin-stagger p-4">
              <div className="flex items-center gap-3">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(exec._index, -1)}
                    disabled={exec._index === 0 || saving}
                    className="text-silver-faint hover:text-white disabled:opacity-30 transition-colors leading-none"
                    aria-label={`Move ${exec.name} up`}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(exec._index, 1)}
                    disabled={exec._index === executors.length - 1 || saving}
                    className="text-silver-faint hover:text-white disabled:opacity-30 transition-colors leading-none"
                    aria-label={`Move ${exec.name} down`}
                  >
                    ▼
                  </button>
                </div>

                {/* Icon + status dot + name */}
                <div className="relative shrink-0">
                  <ExecutorIcon name={exec.name} icon={exec.icon} size={38} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black-card ${
                      exec.status === 'supported' ? 'bg-success shadow-[0_0_8px_rgba(0,255,136,0.6)]' : 'bg-danger shadow-[0_0_8px_rgba(255,51,51,0.6)]'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-white truncate">{exec.name}</p>
                  {(exec.websiteUrl || exec.discordUrl) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {exec.websiteUrl && (
                        <a
                          href={exec.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-body text-xs text-info hover:underline"
                        >
                          <GlobeIcon size={11} />
                          Website
                        </a>
                      )}
                      {exec.discordUrl && (
                        <a
                          href={exec.discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-body text-xs text-info hover:underline"
                        >
                          <DiscordIcon size={11} />
                          Discord
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Status toggle + actions — inline on sm+, moved below on mobile so the name isn't squeezed */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(exec._index)}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.65rem] font-body tracking-wider uppercase border transition-colors ${
                      exec.status === 'supported'
                        ? 'border-success/40 text-success hover:bg-success/10'
                        : 'border-danger/40 text-danger hover:bg-danger/10'
                    }`}
                    title="Click to toggle status"
                  >
                    {exec.status === 'supported' ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
                    {exec.status === 'supported' ? 'Working' : 'Not working'}
                  </button>
                  <button
                    onClick={() => openEdit(exec._index)}
                    className="p-2 text-silver-muted hover:text-white transition-colors"
                    aria-label={`Edit ${exec.name}`}
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteIndex(exec._index)}
                    className="p-2 text-silver-muted hover:text-danger transition-colors"
                    aria-label={`Delete ${exec.name}`}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile-only status toggle + actions row */}
              <div className="flex sm:hidden items-center justify-between gap-2 mt-3 pt-3 border-t border-border-dim">
                <button
                  onClick={() => toggleStatus(exec._index)}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.65rem] font-body tracking-wider uppercase border transition-colors ${
                    exec.status === 'supported'
                      ? 'border-success/40 text-success hover:bg-success/10'
                      : 'border-danger/40 text-danger hover:bg-danger/10'
                  }`}
                  title="Tap to toggle status"
                >
                  {exec.status === 'supported' ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
                  {exec.status === 'supported' ? 'Working' : 'Not working'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(exec._index)}
                    className="p-2 text-silver-muted hover:text-white transition-colors"
                    aria-label={`Edit ${exec.name}`}
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteIndex(exec._index)}
                    className="p-2 text-silver-muted hover:text-danger transition-colors"
                    aria-label={`Delete ${exec.name}`}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex === null ? 'Add Executor' : 'Edit Executor'}
      >
        <div className="flex flex-col gap-4">
          {/* Live icon preview + name */}
          <div className="flex items-end gap-3">
            <ExecutorIcon key={form.icon || form.name} name={form.name || '?'} icon={form.icon?.trim() || undefined} size={52} />
            <div className="flex-1">
              <label htmlFor="exec-name" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Name
              </label>
              <input
                id="exec-name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Delta"
                className="void-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exec-icon" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Icon <span className="text-silver-faint normal-case">(optional — leave empty for auto badge)</span>
            </label>
            <ImageUploadInput
              id="exec-icon"
              value={form.icon || ''}
              onChange={url => setForm({ ...form, icon: url })}
              placeholder="https://... or upload"
            />
          </div>

          <div>
            <span className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">Status</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'supported' })}
                className={`flex-1 py-2.5 rounded-md border text-sm font-body transition-colors ${
                  form.status === 'supported'
                    ? 'border-success/60 bg-success/10 text-success'
                    : 'border-border-mid text-silver-muted hover:text-white'
                }`}
              >
                Working
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'unsupported' })}
                className={`flex-1 py-2.5 rounded-md border text-sm font-body transition-colors ${
                  form.status === 'unsupported'
                    ? 'border-danger/60 bg-danger/10 text-danger'
                    : 'border-border-mid text-silver-muted hover:text-white'
                }`}
              >
                Not working
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="exec-website" className="font-body text-xs text-silver-muted tracking-wider uppercase flex items-center gap-1.5 mb-1.5">
              <GlobeIcon size={12} /> Website <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="exec-website"
              type="url"
              value={form.websiteUrl || ''}
              onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://example.com"
              className="void-input"
            />
          </div>

          <div>
            <label htmlFor="exec-discord" className="font-body text-xs text-silver-muted tracking-wider uppercase flex items-center gap-1.5 mb-1.5">
              <DiscordIcon size={12} /> Discord server <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="exec-discord"
              type="url"
              value={form.discordUrl || ''}
              onChange={e => setForm({ ...form, discordUrl: e.target.value })}
              placeholder="https://discord.gg/..."
              className="void-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost !px-5 !py-2 text-xs">
              Cancel
            </button>
            <button onClick={submitForm} disabled={saving} className="btn-primary !px-5 !py-2 text-xs">
              {editIndex === null ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Delete Executor"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-silver-mid">
            Delete{' '}
            <span className="text-white font-semibold">
              {deleteIndex !== null ? executors[deleteIndex]?.name : ''}
            </span>{' '}
            from the compatibility list? This updates the public status page immediately.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteIndex(null)} className="btn-ghost !px-5 !py-2 text-xs">
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="inline-flex items-center gap-2 rounded-md bg-danger px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <TrashIcon size={14} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
