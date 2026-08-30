'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyIcon, PlusIcon, TrashIcon, CheckIcon, EditIcon, RefreshIcon } from '@/components/Icons'
import Modal from '@/components/Modal'
import { useToast } from '@/components/Toast'

interface KeyProvider {
  id: string
  name: string
  url: string
  description: string
  badge: string
  iconUrl: string
  keyDuration: string
  checkpoints: string
  buttonText: string
  enabled: boolean
}

interface KeyPageConfig {
  enabled: boolean
  title: string
  subtitle: string
  requireDiscord: boolean
  discordGateText: string
  instructions: string
  bannerImageUrl: string
  footerNote: string
  discordUrlOverride: string
  providers: KeyProvider[]
}

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiKeyPage(method: 'GET' | 'POST', body?: Partial<KeyPageConfig>) {
  const res = await fetch('/api/admin/keypage', {
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

const EMPTY_PROVIDER: KeyProvider = {
  id: '',
  name: '',
  url: '',
  description: '',
  badge: '',
  iconUrl: '',
  keyDuration: '',
  checkpoints: '',
  buttonText: '',
  enabled: true,
}

export default function AdminKeysPage() {
  const { showToast } = useToast()

  const [config, setConfig] = useState<KeyPageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<KeyProvider>(EMPTY_PROVIDER)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    apiKeyPage('GET')
      .then(data => setConfig(data))
      .catch(() => showToast('Failed to load key page settings', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { load() }, [load])

  const persist = async (next: KeyPageConfig, successMsg: string) => {
    setSaving(true)
    const prev = config
    setConfig(next)
    try {
      await apiKeyPage('POST', next)
      showToast(successMsg, 'success')
    } catch (e) {
      setConfig(prev)
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof KeyPageConfig>(key: K, value: KeyPageConfig[K]) => {
    if (!config) return
    setConfig({ ...config, [key]: value })
  }

  const openAdd = () => {
    setEditIndex(null)
    setForm({ ...EMPTY_PROVIDER, id: `prov-${Date.now()}` })
    setModalOpen(true)
  }

  const openEdit = (index: number) => {
    if (!config) return
    setEditIndex(index)
    setForm({ ...config.providers[index] })
    setModalOpen(true)
  }

  const submitProvider = () => {
    if (!config) return
    const name = form.name.trim()
    const url = form.url.trim()
    if (!name) { showToast('Option name is required', 'error'); return }
    if (!url) { showToast('Link URL is required', 'error'); return }

    const entry: KeyProvider = {
      ...form,
      name,
      url,
      description: form.description.trim(),
      badge: form.badge.trim(),
      iconUrl: form.iconUrl.trim(),
    }
    const providers = [...config.providers]
    if (editIndex === null) providers.push(entry)
    else providers[editIndex] = entry

    setModalOpen(false)
    persist({ ...config, providers }, editIndex === null ? `Added ${name}` : `Updated ${name}`)
  }

  const toggleProvider = (index: number) => {
    if (!config) return
    const providers = config.providers.map((p, i) =>
      i === index ? { ...p, enabled: !p.enabled } : p,
    )
    persist(
      { ...config, providers },
      providers[index].enabled ? `Enabled ${providers[index].name}` : `Disabled ${providers[index].name}`,
    )
  }

  const confirmDelete = () => {
    if (!config || deleteIndex === null) return
    const name = config.providers[deleteIndex].name
    const providers = config.providers.filter((_, i) => i !== deleteIndex)
    setDeleteIndex(null)
    persist({ ...config, providers }, `Deleted ${name}`)
  }

  const moveProvider = (index: number, dir: -1 | 1) => {
    if (!config) return
    const target = index + dir
    if (target < 0 || target >= config.providers.length) return
    const providers = [...config.providers]
    ;[providers[index], providers[target]] = [providers[target], providers[index]]
    persist({ ...config, providers }, 'Order updated')
  }

  if (loading || !config) {
    return (
      <div className="void-card p-10 text-center">
        <RefreshIcon size={22} className="text-silver-muted animate-spin mx-auto" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl text-white tracking-wider">KEY PAGE</h1>
          <p className="font-body text-sm text-silver-muted mt-1">
            Control the public <span className="font-mono text-white">/getkey</span> page — texts, links, and options are all editable here
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/getkey" target="_blank" rel="noopener noreferrer" className="void-btn-secondary">
            VIEW PAGE
          </a>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon size={16} />
            ADD OPTION
          </button>
        </div>
      </div>

      {/* Master toggle banner */}
      <div className={`rounded-lg border p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
        config.enabled ? 'border-success/40 bg-success/5' : 'border-border-dim bg-black-card'
      }`}>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
          config.enabled ? 'bg-success/15 text-success' : 'bg-black-elevated text-silver-muted'
        }`}>
          <KeyIcon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-white">
            Key page is{' '}
            <span className={config.enabled ? 'text-success font-semibold' : 'text-silver-muted font-semibold'}>
              {config.enabled ? 'LIVE' : 'HIDDEN'}
            </span>
          </p>
          <p className="font-body text-xs text-silver-muted mt-0.5">
            {config.enabled
              ? 'Visitors can access /getkey and the GET KEY button shows in the navbar.'
              : 'The /getkey page shows a "not available" message and the navbar button is hidden.'}
          </p>
        </div>
        <button
          onClick={() => persist({ ...config, enabled: !config.enabled }, config.enabled ? 'Key page hidden' : 'Key page is now live')}
          disabled={saving}
          className={`shrink-0 px-5 py-2.5 rounded-md font-heading text-xs tracking-wider transition-all duration-200 border ${
            config.enabled
              ? 'border-danger/40 text-danger hover:bg-danger/10'
              : 'border-success/40 text-success hover:bg-success/10'
          } disabled:opacity-50`}
        >
          {saving ? '...' : config.enabled ? 'HIDE PAGE' : 'GO LIVE'}
        </button>
      </div>

      {/* Page settings */}
      <div className="void-card p-5 mb-6 flex flex-col gap-4">
        <h2 className="font-heading text-sm text-white tracking-wider">PAGE TEXT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="kp-title" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Title
            </label>
            <input
              id="kp-title"
              type="text"
              value={config.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Get Your Key"
              className="void-input"
            />
          </div>
          <div>
            <label htmlFor="kp-subtitle" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Subtitle
            </label>
            <input
              id="kp-subtitle"
              type="text"
              value={config.subtitle}
              onChange={e => updateField('subtitle', e.target.value)}
              placeholder="Complete one of the options below to receive your key."
              className="void-input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="kp-instructions" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
            Extra instructions <span className="text-silver-faint normal-case">(optional)</span>
          </label>
          <textarea
            id="kp-instructions"
            value={config.instructions}
            onChange={e => updateField('instructions', e.target.value)}
            placeholder="e.g. Keys last 24 hours. Do not share your key."
            className="void-input min-h-[70px] resize-y"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="kp-banner" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Banner image URL <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="kp-banner"
              type="url"
              value={config.bannerImageUrl}
              onChange={e => updateField('bannerImageUrl', e.target.value)}
              placeholder="https://.../banner.png"
              className="void-input"
            />
          </div>
          <div>
            <label htmlFor="kp-footer" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Footer note <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="kp-footer"
              type="text"
              value={config.footerNote}
              onChange={e => updateField('footerNote', e.target.value)}
              placeholder="e.g. Keys reset daily at 00:00 UTC"
              className="void-input"
            />
          </div>
        </div>
        {config.bannerImageUrl.trim() && (
          <div className="rounded-lg overflow-hidden border border-border-dim">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.bannerImageUrl} alt="Banner preview" className="w-full max-h-36 object-cover" />
          </div>
        )}

        <div className="border-t border-border-dim pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-sm text-white">Discord gate</p>
              <p className="font-body text-xs text-silver-muted mt-0.5">
                Require visitors to join your Discord before showing the key options
              </p>
            </div>
            <button
              onClick={() => updateField('requireDiscord', !config.requireDiscord)}
              aria-pressed={config.requireDiscord}
              className={`shrink-0 px-4 py-2 rounded-md font-heading text-xs tracking-wider border transition-colors duration-200 ${
                config.requireDiscord
                  ? 'border-success/40 text-success bg-success/10'
                  : 'border-border-dim text-silver-muted hover:text-white'
              }`}
            >
              {config.requireDiscord ? 'ON' : 'OFF'}
            </button>
          </div>
          {config.requireDiscord && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="kp-gate" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                  Gate text
                </label>
                <input
                  id="kp-gate"
                  type="text"
                  value={config.discordGateText}
                  onChange={e => updateField('discordGateText', e.target.value)}
                  placeholder="You need to join our Discord server before you can access the key system."
                  className="void-input"
                />
              </div>
              <div>
                <label htmlFor="kp-discord" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                  Discord link override <span className="text-silver-faint normal-case">(optional — uses site Discord if empty)</span>
                </label>
                <input
                  id="kp-discord"
                  type="url"
                  value={config.discordUrlOverride}
                  onChange={e => updateField('discordUrlOverride', e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="void-input"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => persist(config, 'Page settings saved')}
          disabled={saving}
          className="btn-primary self-end disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'SAVE SETTINGS'}
        </button>
      </div>

      {/* Key options */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-sm text-white tracking-wider">
          KEY OPTIONS <span className="text-silver-muted">({config.providers.length})</span>
        </h2>
      </div>

      {config.providers.length === 0 ? (
        <div className="void-card p-10 text-center">
          <KeyIcon size={28} className="text-silver-faint mx-auto mb-3" />
          <p className="font-body text-sm text-silver-muted">No key options yet.</p>
          <p className="font-body text-xs text-silver-faint mt-1">
            Add options like Linkvertise, Work.ink, Lootlabs, or a direct Discord link.
          </p>
          <button onClick={openAdd} className="btn-primary mt-4 inline-flex items-center gap-2">
            <PlusIcon size={16} />
            ADD YOUR FIRST OPTION
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {config.providers.map((p, i) => (
            <div
              key={p.id}
              className={`void-card p-4 flex items-center gap-3 ${p.enabled ? '' : 'opacity-50'}`}
            >
              {/* Reorder */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => moveProvider(i, -1)}
                  disabled={i === 0 || saving}
                  className="text-silver-muted hover:text-white disabled:opacity-30 text-[0.6rem] leading-tight px-1 transition-colors duration-200"
                  aria-label={`Move ${p.name} up`}
                >
                  ▲
                </button>
                <button
                  onClick={() => moveProvider(i, 1)}
                  disabled={i === config.providers.length - 1 || saving}
                  className="text-silver-muted hover:text-white disabled:opacity-30 text-[0.6rem] leading-tight px-1 transition-colors duration-200"
                  aria-label={`Move ${p.name} down`}
                >
                  ▼
                </button>
              </div>

              {/* Icon */}
              {p.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.iconUrl} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-black-elevated text-white font-heading flex items-center justify-center shrink-0">
                  {p.name.charAt(0).toUpperCase() || '?'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm font-semibold text-white truncate">{p.name}</span>
                  {p.badge && (
                    <span className="px-1.5 py-0.5 rounded border border-success/40 bg-success/10 text-success font-body text-[0.6rem] uppercase tracking-wider">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-silver-muted truncate mt-0.5">
                  {p.description || p.url}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleProvider(i)}
                  disabled={saving}
                  aria-pressed={p.enabled}
                  className={`px-2.5 py-1 rounded border font-body text-[0.65rem] uppercase tracking-wider transition-colors duration-200 ${
                    p.enabled
                      ? 'border-success/40 text-success bg-success/10'
                      : 'border-border-dim text-silver-muted hover:text-white'
                  }`}
                >
                  {p.enabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => openEdit(i)}
                  className="p-1.5 rounded text-silver-muted hover:text-white hover:bg-black-elevated transition-colors duration-200"
                  aria-label={`Edit ${p.name}`}
                >
                  <EditIcon size={15} />
                </button>
                <button
                  onClick={() => setDeleteIndex(i)}
                  className="p-1.5 rounded text-silver-muted hover:text-danger hover:bg-danger/10 transition-colors duration-200"
                  aria-label={`Delete ${p.name}`}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit option modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex === null ? 'ADD KEY OPTION' : 'EDIT KEY OPTION'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="prov-name" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Name *
            </label>
            <input
              id="prov-name"
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Linkvertise"
              className="void-input"
            />
          </div>
          <div>
            <label htmlFor="prov-url" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Link URL *
            </label>
            <input
              id="prov-url"
              type="url"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="void-input"
            />
          </div>
          <div>
            <label htmlFor="prov-desc" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
              Description <span className="text-silver-faint normal-case">(optional)</span>
            </label>
            <input
              id="prov-desc"
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Complete 2 ads — key lasts 24 hours"
              className="void-input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prov-badge" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Badge <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="prov-badge"
                type="text"
                value={form.badge}
                onChange={e => setForm({ ...form, badge: e.target.value })}
                placeholder="e.g. FASTEST"
                className="void-input"
              />
            </div>
            <div>
              <label htmlFor="prov-icon" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Icon URL <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="prov-icon"
                type="url"
                value={form.iconUrl}
                onChange={e => setForm({ ...form, iconUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="void-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prov-duration" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Key duration <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="prov-duration"
                type="text"
                value={form.keyDuration}
                onChange={e => setForm({ ...form, keyDuration: e.target.value })}
                placeholder="e.g. 24 hours"
                className="void-input"
              />
            </div>
            <div>
              <label htmlFor="prov-checkpoints" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Checkpoints <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="prov-checkpoints"
                type="text"
                value={form.checkpoints}
                onChange={e => setForm({ ...form, checkpoints: e.target.value })}
                placeholder="e.g. 2 checkpoints"
                className="void-input"
              />
            </div>
            <div>
              <label htmlFor="prov-btntext" className="font-body text-xs text-silver-muted tracking-wider uppercase block mb-1.5">
                Button text <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="prov-btntext"
                type="text"
                value={form.buttonText}
                onChange={e => setForm({ ...form, buttonText: e.target.value })}
                placeholder="Get Key"
                className="void-input"
              />
            </div>
          </div>

          {form.iconUrl.trim() && (
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-silver-muted">Icon preview:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.iconUrl} alt="Icon preview" className="w-9 h-9 rounded-md object-cover" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalOpen(false)} className="void-btn-secondary">
              CANCEL
            </button>
            <button onClick={submitProvider} className="btn-primary flex items-center gap-2">
              <CheckIcon size={15} />
              {editIndex === null ? 'ADD OPTION' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} title="DELETE OPTION">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-silver-mid">
            Delete{' '}
            <span className="font-semibold text-white">
              {deleteIndex !== null ? config.providers[deleteIndex]?.name : ''}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteIndex(null)} className="void-btn-secondary">
              CANCEL
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 rounded-md border border-danger/40 text-danger font-heading text-xs tracking-wider hover:bg-danger/10 transition-colors duration-200"
            >
              DELETE
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
