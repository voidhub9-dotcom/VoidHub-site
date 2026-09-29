'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PlusIcon, SearchIcon, TrashIcon, CheckIcon, AlertIcon,
  BoltIcon, RefreshIcon, EditIcon, GlobeIcon, DiscordIcon,
} from '@/components/Icons'
import Modal from '@/components/Modal'
import { PageHead, StatStrip, Segmented, Switch, Field, Empty, inputCls, btnDanger } from '@/components/AdminUI'
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
    <div className="max-w-5xl mx-auto">
      <PageHead
        eyebrow="Content"
        title="Executors"
        subtitle="The compatibility list on the public status page. Live version and platform data is added automatically from WEAO."
        actions={
          <>
            <button onClick={load} disabled={loading} className="btn-outline h-10 px-4 text-sm">
              <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openAdd} className="btn-white h-10 px-5 text-sm">
              <PlusIcon size={14} /> Add executor
            </button>
          </>
        }
      />

      <StatStrip items={[
        { label: 'Total', value: loading ? '–' : executors.length, sub: 'on the list' },
        { label: 'Working', value: loading ? '–' : supportedCount, sub: 'shown as ready', dot: 'bg-success' },
        { label: 'Not working', value: loading ? '–' : executors.length - supportedCount, sub: 'shown crossed out', dot: 'bg-danger' },
      ]} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search executors…"
            className={`${inputCls} !pl-10`}
          />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All ${executors.length}` },
            { value: 'supported', label: `Working ${supportedCount}` },
            { value: 'unsupported', label: `Not working ${executors.length - supportedCount}` },
          ]}
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] divide-y divide-[#161616]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-[#141414] animate-pulse" />
              <div className="h-3.5 w-32 rounded bg-[#141414] animate-pulse" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Empty
          icon={<BoltIcon size={20} />}
          title={executors.length === 0 ? 'No executors yet' : 'Nothing matches that'}
          body={executors.length === 0 ? 'Add the executors you have tested with VoidHub.' : 'Try another search or filter.'}
          action={executors.length === 0 ? <button onClick={openAdd} className="btn-white h-10 px-5 text-sm"><PlusIcon size={14} /> Add executor</button> : undefined}
        />
      ) : (
        <ul className="rounded-2xl border border-[#1c1c1c] bg-[#070707] divide-y divide-[#161616] overflow-hidden" aria-label="Executor list">
          {visible.map(exec => {
            const ok = exec.status === 'supported'
            return (
              <li key={`${exec.name}-${exec._index}`} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 sm:px-5 py-3.5">
                <div className="flex flex-col -my-1">
                  <button onClick={() => move(exec._index, -1)} disabled={exec._index === 0 || saving || filter !== 'all' || !!search}
                    className="w-6 h-5 flex items-center justify-center text-[#555] hover:text-white disabled:opacity-20 text-[0.6rem]" aria-label={`Move ${exec.name} up`}>▲</button>
                  <button onClick={() => move(exec._index, 1)} disabled={exec._index === executors.length - 1 || saving || filter !== 'all' || !!search}
                    className="w-6 h-5 flex items-center justify-center text-[#555] hover:text-white disabled:opacity-20 text-[0.6rem]" aria-label={`Move ${exec.name} down`}>▼</button>
                </div>
                <ExecutorIcon name={exec.name} icon={exec.icon} size={40} className="!rounded-xl" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[0.95rem] truncate ${ok ? 'text-white' : 'text-[#8a8a8a] line-through decoration-[#555]'}`}>{exec.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {exec.websiteUrl && <a href={exec.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#6b6b6b] hover:text-white"><GlobeIcon size={11} /> Website</a>}
                    {exec.discordUrl && <a href={exec.discordUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#6b6b6b] hover:text-white"><DiscordIcon size={11} /> Discord</a>}
                    {!exec.websiteUrl && !exec.discordUrl && <span className="text-xs text-[#444]">No links</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto pl-9 sm:pl-0 justify-between sm:justify-end">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <span className={`text-xs ${ok ? 'text-success' : 'text-danger'}`}>{ok ? 'Working' : 'Not working'}</span>
                    <Switch checked={ok} onChange={() => toggleStatus(exec._index)} disabled={saving} label={`${exec.name} works`} />
                  </label>
                  <div className="flex items-center">
                    <button onClick={() => openEdit(exec._index)} className="w-9 h-9 flex items-center justify-center rounded-full text-[#6b6b6b] hover:text-white hover:bg-white/[0.06]" aria-label={`Edit ${exec.name}`}><EditIcon size={15} /></button>
                    <button onClick={() => setDeleteIndex(exec._index)} className="w-9 h-9 flex items-center justify-center rounded-full text-[#6b6b6b] hover:text-danger hover:bg-danger/10" aria-label={`Delete ${exec.name}`}><TrashIcon size={15} /></button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {!loading && executors.length > 1 && (
        <p className="mt-3 text-xs text-[#555]">Use the arrows to set the order they appear on the status page{filter !== 'all' || search ? ' (clear the filter first)' : ''}.</p>
      )}

      {/* Add / Edit */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editIndex === null ? 'Add executor' : 'Edit executor'} maxWidth="max-w-[520px]">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#1c1c1c] bg-black">
            <ExecutorIcon key={form.icon || form.name} name={form.name || '?'} icon={form.icon?.trim() || undefined} size={52} className="!rounded-2xl" />
            <div className="min-w-0">
              <p className="text-white truncate">{form.name || 'Executor name'}</p>
              <p className={`text-xs ${form.status === 'supported' ? 'text-success' : 'text-danger'}`}>{form.status === 'supported' ? 'Working with VoidHub' : 'Not working'}</p>
            </div>
          </div>
          <Field label="Name" htmlFor="exec-name">
            <input id="exec-name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Delta" className={inputCls} autoFocus />
          </Field>
          <Field label="Status">
            <div className="grid grid-cols-2 gap-2">
              {([['supported', 'Working'], ['unsupported', 'Not working']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, status: v })}
                  className={`h-11 rounded-xl border text-sm flex items-center justify-center gap-2 ${form.status === v ? 'bg-white text-black border-white' : 'border-[#262626] text-[#8a8a8a] hover:text-white'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${v === 'supported' ? 'bg-success' : 'bg-danger'}`} />{l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Icon" hint="Optional. Leave empty for a monogram badge." htmlFor="exec-icon">
            <ImageUploadInput id="exec-icon" value={form.icon || ''} onChange={url => setForm({ ...form, icon: url })} placeholder="https://… or upload" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website" htmlFor="exec-website">
              <input id="exec-website" type="url" value={form.websiteUrl || ''} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Discord" htmlFor="exec-discord">
              <input id="exec-discord" type="url" value={form.discordUrl || ''} onChange={e => setForm({ ...form, discordUrl: e.target.value })} placeholder="https://discord.gg/…" className={inputCls} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#181818] -mx-5 md:-mx-6 px-5 md:px-6 pt-5">
            <button onClick={() => setModalOpen(false)} className="h-11 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
            <button onClick={submitForm} disabled={saving} className="btn-white h-11 px-6 text-sm"><CheckIcon size={15} /> {editIndex === null ? 'Add executor' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} title="Delete executor?" maxWidth="max-w-[420px]">
        <p className="text-sm text-[#a3a3a3]">
          <span className="text-white">{deleteIndex !== null ? executors[deleteIndex]?.name : ''}</span> will be removed from the status page right away.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setDeleteIndex(null)} className="h-10 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
          <button onClick={confirmDelete} className={btnDanger}><TrashIcon size={14} /> Delete</button>
        </div>
      </Modal>
    </div>
  )
}
