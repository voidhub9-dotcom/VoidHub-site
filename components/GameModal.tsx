'use client'

import { useState, useEffect, useRef } from 'react'
import {
  RefreshIcon, CheckIcon, AlertIcon, PlusIcon, ImageIcon, XIcon,
  SparkleIcon, StarIcon, ExternalIcon,
} from '@/components/Icons'
import ImageUploadInput from '@/components/ImageUploadInput'

/**
 * Add / Edit game — 4-step wizard:
 *  1. IMPORT    — auto-fill from Roblox, or start blank
 *  2. DETAILS   — name, category, status, thumbnail
 *  3. CONTENT   — description (AI generate), feature chips
 *  4. PUBLISH   — script link, featured, notes + live review card
 *
 * Per-step validation: you can't advance past a step with a missing
 * required field, and errors highlight the exact input. Editing an
 * existing game skips straight to step 2.
 */

interface GameModalProps {
  game?: any | null
  onSave: (data: GameFormData) => void
  onCancel: () => void
}

export interface GameFormData {
  name: string
  description: string
  category: string
  status: 'active' | 'outdated'
  thumbnail: string
  scriptLink: string
  robloxUrl: string
  placeId?: string
  features: string[]
  featured: boolean
  notes: string
  tags?: string[]
}

const CATS = ['Roblox', 'FPS', 'RPG', 'Simulator', 'Horror', 'Fighting', 'Strategy', 'MMO', 'Other']

const QUICK_FEATURES = [
  'Auto Farm', 'Auto Kill', 'Speed Hack', 'Fly Hack', 'ESP',
  'Aimbot', 'Infinite Jump', 'God Mode', 'Auto Rebirth', 'No Clip',
  'Keyless', 'Auto Quest', 'Teleport', 'Auto Collect', 'Anti AFK',
]

const empty: GameFormData = {
  name: '', description: '', category: 'Roblox', status: 'active',
  thumbnail: '', scriptLink: 'https://discord.gg/kPPsdZtndn',
  robloxUrl: '', features: [], featured: false, notes: '', tags: [],
}

type FetchState = 'idle' | 'ok' | 'err'

const STEPS = ['Import', 'Details', 'Content', 'Publish'] as const

const inputCls =
  'w-full h-10 px-3 bg-black-surface border border-border-mid rounded-lg text-white font-body text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:border-white focus:shadow-[0_0_0_1px_rgba(255,255,255,0.35)] transition-all'

const labelCls = 'block font-heading text-[0.62rem] tracking-widest text-silver-mid uppercase mb-1.5'

export default function GameModal({ game, onSave, onCancel }: GameModalProps) {
  const [step, setStep]             = useState(0)
  const [form, setForm]             = useState<GameFormData>(empty)
  const [fetchUrl, setFetchUrl]     = useState('')
  const [fetching, setFetching]     = useState(false)
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [fetchMsg, setFetchMsg]     = useState('')
  const [newFeature, setNewFeature] = useState('')
  const [thumbErr, setThumbErr]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genState, setGenState]     = useState<FetchState>('idle')
  const [genMsg, setGenMsg]         = useState('')
  const [stepErr, setStepErr]       = useState('')
  const nameRef   = useRef<HTMLInputElement>(null)
  const scriptRef = useRef<HTMLInputElement>(null)

  const isEdit = !!game

  useEffect(() => {
    if (game) {
      setForm({
        name:        game.name        ?? '',
        description: game.description ?? '',
        category:    game.category    ?? 'Roblox',
        status:      game.status      ?? 'active',
        thumbnail:   game.thumbnail   ?? '',
        scriptLink:  game.scriptLink  ?? '',
        robloxUrl:   game.robloxUrl   ?? '',
        placeId:     game.placeId     ?? '',
        features:    Array.isArray(game.features) ? game.features : [],
        featured:    game.featured    ?? false,
        notes:       game.notes       ?? '',
        tags:        Array.isArray(game.tags) ? game.tags : [],
      })
      if (game.robloxUrl) setFetchUrl(game.robloxUrl)
      setStep(1) // editing: skip the import step
    } else {
      setForm(empty)
      setFetchUrl('')
      setStep(0)
      // Pre-fill the script link from the editable admin setting (Settings → Links & Branding)
      fetch('/api/public/settings')
        .then(r => r.json())
        .then(d => {
          const def = d?.links?.defaultScriptLink?.trim()
          if (def) setForm(prev => (prev.name === '' ? { ...prev, scriptLink: def } : prev))
        })
        .catch(() => { /* keep the built-in default */ })
    }
    setFetchState('idle')
    setGenState('idle')
    setThumbErr(false)
    setStepErr('')
  }, [game])

  const set = <K extends keyof GameFormData>(k: K, v: GameFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  // ── Roblox auto-fetch ──────────────────────────────────────────────
  const handleFetch = async (): Promise<boolean> => {
    const url = fetchUrl.trim()
    if (!url) return false
    setFetching(true); setFetchState('idle'); setFetchMsg('')
    try {
      const match  = url.match(/roblox\.com\/games\/(\d+)/)
      const gameId = match ? match[1] : url.replace(/\D/g, '')
      if (!gameId || isNaN(Number(gameId))) {
        throw new Error('Paste a valid Roblox game URL or plain place ID')
      }
      const res  = await fetch(`/api/roblox?gameId=${gameId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      setThumbErr(false)
      setForm(p => ({
        ...p,
        name:        data.name        || p.name,
        description: data.description || p.description,
        thumbnail:   data.thumbnail   || p.thumbnail,
        robloxUrl:   data.robloxUrl   || (url.includes('roblox.com') ? url : `https://www.roblox.com/games/${gameId}`),
        placeId:     data.placeId     || p.placeId,
      }))
      setFetchState('ok')
      setFetchMsg(`"${data.name || 'Game'}" imported — name, description & thumbnail filled in.`)
      return true
    } catch (e: any) {
      setFetchState('err')
      setFetchMsg(e.message || 'Auto-fetch failed. You can fill everything in manually instead.')
      return false
    } finally {
      setFetching(false)
    }
  }

  const fetchAndAdvance = async () => {
    const ok = await handleFetch()
    if (ok) setTimeout(() => { setStep(1); setStepErr('') }, 650)
  }

  // ── AI SEO description + tags ──────────────────────────────────────
  const handleGenerate = async () => {
    if (!form.name.trim()) {
      setGenState('err')
      setGenMsg('Enter a game name first so we know what to write about.')
      return
    }
    setGenerating(true); setGenState('idle'); setGenMsg('')
    try {
      const params = new URLSearchParams({
        name: form.name,
        description: form.description,
        ...(form.robloxUrl.match(/\/(\d+)/) ? { placeId: form.robloxUrl.match(/\/(\d+)/)![1] } : {}),
      })
      const res  = await fetch(`/api/generate-desc?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setForm(p => ({
        ...p,
        description: data.description || p.description,
        tags:        data.tags        || p.tags,
        features:    data.suggestedFeatures?.length
          ? [...new Set([...p.features, ...data.suggestedFeatures])].slice(0, 12)
          : p.features,
      }))
      setGenState('ok')
      setGenMsg('SEO description & tags generated.')
    } catch (e: any) {
      setGenState('err')
      setGenMsg(e.message || 'Generation failed — try again or write it manually.')
    } finally {
      setGenerating(false)
    }
  }

  const addFeature = (f: string) => {
    const t = f.trim()
    if (!t || form.features.includes(t) || form.features.length >= 12) return
    set('features', [...form.features, t])
    setNewFeature('')
  }

  // ── Step navigation with per-step validation ───────────────────────
  const validateStep = (s: number): string => {
    if (s === 1 && !form.name.trim()) return 'Game name is required before continuing.'
    return ''
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setStepErr(err)
      if (step === 1) nameRef.current?.focus()
      return
    }
    setStepErr('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => { setStepErr(''); setStep(s => Math.max(s - 1, 0)) }

  const jumpTo = (target: number) => {
    // allow going backwards freely; forward only one validated step at a time
    if (target < step) { setStepErr(''); setStep(target); return }
    if (target === step + 1) goNext()
  }

  const handleSave = () => {
    if (!form.name.trim()) { setStep(1); setStepErr('Game name is required.'); return }
    onSave(form)
  }

  const stepDone = (s: number) => {
    if (s === 0) return step > 0
    if (s === 1) return !!form.name.trim() && step > 1
    if (s === 2) return step > 2
    return false
  }

  return (
    <div className="flex flex-col">

      {/* ── Step indicator ─────────────────────────────────────────── */}
      <div className="flex items-center mb-6" role="tablist" aria-label="Wizard steps">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              onClick={() => jumpTo(i)}
              role="tab"
              aria-selected={step === i}
              className={`flex items-center gap-2 group ${i > step + 1 ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full font-heading text-[0.68rem] border transition-all ${
                  step === i
                    ? 'bg-white text-black border-white shadow-[0_0_14px_rgba(255,255,255,0.35)]'
                    : stepDone(i)
                      ? 'bg-success/15 text-success border-success/50'
                      : 'bg-black-surface text-silver-muted border-border-mid'
                }`}
              >
                {stepDone(i) ? <CheckIcon size={13} /> : i + 1}
              </span>
              <span
                className={`font-heading text-[0.62rem] tracking-widest uppercase transition-colors hidden sm:inline ${
                  step === i ? 'text-white' : stepDone(i) ? 'text-success' : 'text-silver-muted'
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 transition-colors ${stepDone(i) ? 'bg-success/40' : 'bg-border-dim'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: IMPORT ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-xl bg-gradient-to-b from-black-surface to-black-card border border-border-mid text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-border-mid mx-auto mb-3">
              <SparkleIcon size={20} className="text-white" />
            </div>
            <h3 className="font-heading text-sm tracking-widest text-white uppercase mb-1">Import from Roblox</h3>
            <p className="font-body text-xs text-silver-muted mb-4 text-pretty">
              Paste a Roblox game URL or place ID and we&apos;ll pull the name, description and thumbnail automatically.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                value={fetchUrl}
                onChange={e => { setFetchUrl(e.target.value); setFetchState('idle') }}
                onKeyDown={e => e.key === 'Enter' && !(e.nativeEvent as any).isComposing && fetchAndAdvance()}
                placeholder="https://www.roblox.com/games/2753915549/..."
                className={inputCls}
                aria-label="Roblox game URL or place ID"
              />
              <button
                onClick={fetchAndAdvance}
                disabled={fetching || !fetchUrl.trim()}
                className="btn-primary !h-10 !py-0 flex-shrink-0"
              >
                <RefreshIcon size={15} className={fetching ? 'animate-spin' : ''} />
                {fetching ? 'Importing…' : 'IMPORT'}
              </button>
            </div>
            {fetchState === 'ok' && (
              <div className="flex items-start justify-center gap-2 mt-3 p-2.5 rounded-lg bg-success/10 border border-success/30 max-w-md mx-auto">
                <CheckIcon size={13} className="text-success mt-0.5 flex-shrink-0" />
                <p className="text-success text-xs font-body">{fetchMsg}</p>
              </div>
            )}
            {fetchState === 'err' && (
              <div className="flex items-start justify-center gap-2 mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 max-w-md mx-auto">
                <AlertIcon size={13} className="text-danger mt-0.5 flex-shrink-0" />
                <p className="text-danger text-xs font-body">{fetchMsg}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-dim" />
            <span className="font-body text-[0.65rem] text-silver-muted tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-border-dim" />
          </div>

          <button
            onClick={() => { setStepErr(''); setStep(1) }}
            className="w-full py-3 rounded-xl border border-dashed border-border-mid text-silver-mid font-body text-sm hover:border-silver-faint hover:text-white transition-all"
          >
            Start from scratch — fill everything in manually
          </button>
        </div>
      )}

      {/* ── STEP 2: DETAILS ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Thumbnail preview */}
            <div className="w-32 flex-shrink-0">
              <span className={labelCls}>Thumbnail</span>
              <div className="w-32 h-32 rounded-xl overflow-hidden border border-border-mid bg-black-surface flex items-center justify-center">
                {form.thumbnail && !thumbErr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.thumbnail || "/placeholder.svg"}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={() => setThumbErr(true)}
                  />
                ) : (
                  <ImageIcon size={26} className="text-silver-faint" />
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-3.5 min-w-0">
              <div>
                <label htmlFor="gw-name" className={labelCls}>
                  Game name <span className="text-danger">*</span>
                </label>
                <input
                  id="gw-name"
                  ref={nameRef}
                  value={form.name}
                  onChange={e => { set('name', e.target.value); setStepErr('') }}
                  placeholder="e.g. Blox Fruits"
                  className={`${inputCls} ${stepErr && !form.name.trim() ? '!border-danger' : ''}`}
                />
              </div>
              <div>
                <label htmlFor="gw-thumb" className={labelCls}>Image source</label>
                <ImageUploadInput
                  id="gw-thumb"
                  value={form.thumbnail}
                  onChange={url => { set('thumbnail', url); setThumbErr(false) }}
                  placeholder="Auto-filled by import, or paste/upload"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gw-cat" className={labelCls}>Category</label>
              <select
                id="gw-cat"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span className={labelCls}>Status</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('status', 'active')}
                  className={`flex-1 h-10 rounded-lg border font-body text-sm transition-all ${
                    form.status === 'active'
                      ? 'border-success/60 bg-success/10 text-success'
                      : 'border-border-mid text-silver-muted hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => set('status', 'outdated')}
                  className={`flex-1 h-10 rounded-lg border font-body text-sm transition-all ${
                    form.status === 'outdated'
                      ? 'border-warning/60 bg-warning/10 text-warning'
                      : 'border-border-mid text-silver-muted hover:text-white'
                  }`}
                >
                  Outdated
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: CONTENT ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="gw-desc" className={`${labelCls} !mb-0`}>Description</label>
              <div className="flex items-center gap-3">
                <span className={`font-body text-[0.65rem] ${form.description.length > 150 ? 'text-warning' : 'text-silver-muted'}`}>
                  {form.description.length}/150
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-mid text-silver-mid font-body text-xs hover:border-white hover:text-white disabled:opacity-40 transition-all"
                >
                  <SparkleIcon size={12} className={generating ? 'animate-pulse' : ''} />
                  {generating ? 'Generating…' : 'Auto Generate'}
                </button>
              </div>
            </div>
            <textarea
              id="gw-desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Short SEO description shown on the public games page…"
              rows={4}
              className={`${inputCls} !h-auto py-2.5 resize-none leading-relaxed`}
            />
            {genState === 'ok' && <p className="text-success text-xs font-body mt-1.5">{genMsg}</p>}
            {genState === 'err' && <p className="text-danger text-xs font-body mt-1.5">{genMsg}</p>}
          </div>

          <div>
            <span className={labelCls}>
              Features <span className="text-silver-faint normal-case">({form.features.length}/12 — shown as chips on the game card)</span>
            </span>

            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.features.map(f => (
                  <span key={f} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white/8 border border-border-mid text-white font-body text-xs">
                    {f}
                    <button
                      onClick={() => set('features', form.features.filter(x => x !== f))}
                      className="p-0.5 rounded-full hover:bg-white/15 transition-colors"
                      aria-label={`Remove ${f}`}
                    >
                      <XIcon size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) { e.preventDefault(); addFeature(newFeature) }
                }}
                placeholder="Type a custom feature and press Enter…"
                className={inputCls}
                aria-label="Add custom feature"
              />
              <button
                onClick={() => addFeature(newFeature)}
                disabled={!newFeature.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-border-mid text-silver-mid hover:border-white hover:text-white disabled:opacity-40 transition-all flex-shrink-0"
                aria-label="Add feature"
              >
                <PlusIcon size={15} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_FEATURES.filter(f => !form.features.includes(f)).map(f => (
                <button
                  key={f}
                  onClick={() => addFeature(f)}
                  disabled={form.features.length >= 12}
                  className="px-2.5 py-1 rounded-full border border-border-dim text-silver-muted font-body text-xs hover:border-silver-faint hover:text-white disabled:opacity-40 transition-all"
                >
                  + {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: PUBLISH ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <label htmlFor="gw-script" className={labelCls}>
                Script link <span className="text-silver-faint normal-case">(optional)</span>
              </label>
              <input
                id="gw-script"
                ref={scriptRef}
                value={form.scriptLink}
                onChange={e => set('scriptLink', e.target.value)}
                placeholder="https://discord.gg/… or pastebin link"
                className={inputCls}
              />
              <p className="font-body text-[0.68rem] text-silver-muted mt-1">
                Adds a secondary &quot;Get Script&quot; link button on the game card. The main COPY SCRIPT button
                always works site-wide regardless — it&apos;s powered by Admin → Loader, not this field.
              </p>
            </div>

            <div>
              <label htmlFor="gw-roblox" className={labelCls}>Roblox game URL <span className="text-silver-faint normal-case">(optional)</span></label>
              <input
                id="gw-roblox"
                value={form.robloxUrl}
                onChange={e => set('robloxUrl', e.target.value)}
                placeholder="https://www.roblox.com/games/…"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="gw-notes" className={labelCls}>Internal notes <span className="text-silver-faint normal-case">(only you see these)</span></label>
              <textarea
                id="gw-notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="e.g. needs update after next game patch…"
                className={`${inputCls} !h-auto py-2.5 resize-none`}
              />
            </div>

            <button
              type="button"
              onClick={() => set('featured', !form.featured)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                form.featured
                  ? 'border-warning/60 bg-warning/10'
                  : 'border-border-mid hover:border-silver-faint'
              }`}
              aria-pressed={form.featured}
            >
              <StarIcon size={18} className={form.featured ? 'text-warning' : 'text-silver-muted'} />
              <span className="flex-1">
                <span className={`block font-body text-sm ${form.featured ? 'text-warning' : 'text-white'}`}>Featured game</span>
                <span className="block font-body text-xs text-silver-muted">Pinned with a FEATURED ribbon at the top of the games page.</span>
              </span>
              <span
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${form.featured ? 'bg-warning' : 'bg-black-elevated border border-border-mid'}`}
                style={{ height: 22 }}
              >
                <span
                  className={`block w-4.5 h-4.5 rounded-full bg-white transition-transform ${form.featured ? 'translate-x-4' : ''}`}
                  style={{ width: 17, height: 17 }}
                />
              </span>
            </button>
          </div>

          {/* Review card */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <span className={labelCls}>Review</span>
            <div className="rounded-xl border border-border-mid bg-black-card overflow-hidden">
              <div className="relative h-28 bg-black-surface flex items-center justify-center">
                {form.thumbnail && !thumbErr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.thumbnail || "/placeholder.svg"} alt="" className="w-full h-full object-cover" onError={() => setThumbErr(true)} />
                ) : (
                  <ImageIcon size={22} className="text-silver-faint" />
                )}
                {form.featured && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-warning text-black font-heading text-[0.55rem] tracking-widest">FEATURED</span>
                )}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded font-heading text-[0.55rem] tracking-widest ${form.status === 'active' ? 'bg-success/90 text-black' : 'bg-warning/90 text-black'}`}>
                  {form.status === 'active' ? 'ACTIVE' : 'OUTDATED'}
                </span>
              </div>
              <div className="p-3.5">
                <p className="font-heading text-xs tracking-wider text-white uppercase truncate">{form.name || 'Untitled game'}</p>
                <p className="font-body text-[0.7rem] text-silver-muted leading-relaxed mt-1 line-clamp-3">
                  {form.description || 'No description yet.'}
                </p>
                {form.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.features.slice(0, 4).map(f => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-white/8 text-silver-mid font-body text-[0.6rem]">{f}</span>
                    ))}
                    {form.features.length > 4 && (
                      <span className="px-1.5 py-0.5 text-silver-muted font-body text-[0.6rem]">+{form.features.length - 4}</span>
                    )}
                  </div>
                )}
                {form.scriptLink.trim() && (
                  <p className="flex items-center gap-1 font-body text-[0.65rem] text-info mt-2 truncate">
                    <ExternalIcon size={10} /> {form.scriptLink}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mt-7 pt-4 border-t border-border-dim">
        <div className="flex-1 min-w-0">
          {stepErr && (
            <p className="flex items-center gap-1.5 text-danger text-xs font-body">
              <AlertIcon size={12} className="flex-shrink-0" /> {stepErr}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 h-10 rounded-lg text-silver-muted font-body text-sm hover:text-white transition-colors">
            Cancel
          </button>
          {step > (isEdit ? 1 : 0) && (
            <button
              onClick={goBack}
              className="px-5 h-10 rounded-lg border border-border-mid text-silver-mid font-body text-sm hover:border-white hover:text-white transition-all"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              className="btn-primary !h-10 !py-0"
            >
              {step === 0 ? 'Skip →' : 'Next →'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="btn-primary !h-10 !py-0"
            >
              {isEdit ? 'SAVE CHANGES' : 'ADD GAME'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
