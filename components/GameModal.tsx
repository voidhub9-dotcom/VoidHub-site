'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshIcon, CheckIcon, AlertIcon, SparkleIcon, ChevronRightIcon } from '@/components/Icons'
import ImageUploadInput from '@/components/ImageUploadInput'
import GameCard from '@/components/GameCard'

/**
 * Add / Edit game, 3 steps:
 *  1. Import  — paste a Roblox link, everything else fills itself in
 *  2. Details — name, description, category, status, image
 *  3. Publish — links + notes, with the live card exactly as players see it
 *
 * Editing skips straight to Details. The preview card on the right is the
 * real public GameCard, so what you see is what goes live.
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
  // Kept for older saved games / API consumers; the UI no longer edits these.
  features: string[]
  featured: boolean
  notes: string
  tags?: string[]
}

const CATS = ['Roblox', 'FPS', 'RPG', 'Simulator', 'Horror', 'Fighting', 'Strategy', 'Roleplay', 'Tycoon', 'Obby', 'Other']

const empty: GameFormData = {
  name: '', description: '', category: 'Roblox', status: 'active',
  thumbnail: '', scriptLink: '', robloxUrl: '', placeId: '',
  features: [], featured: false, notes: '', tags: [],
}

const STEPS = ['Import', 'Details', 'Publish'] as const

const inputCls =
  'w-full h-11 px-4 rounded-xl bg-black border border-[#262626] text-white text-[16px] md:text-sm ' +
  'placeholder:text-[#555] focus:outline-none focus:border-[#6b6b6b] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)] transition-all'
const labelCls = 'block font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b] mb-2'

const placeFrom = (s: string) => s.match(/roblox\.com\/games\/(\d+)/)?.[1] ?? (/^\d+$/.test(s.trim()) ? s.trim() : '')

export default function GameModal({ game, onSave, onCancel }: GameModalProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<GameFormData>(empty)
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchErr, setFetchErr] = useState('')
  const [imported, setImported] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [stepErr, setStepErr] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const isEdit = !!game

  useEffect(() => {
    if (game) {
      setForm({
        ...empty,
        name: game.name ?? '',
        description: game.description ?? '',
        category: game.category ?? 'Roblox',
        status: game.status ?? 'active',
        thumbnail: game.thumbnail ?? '',
        scriptLink: game.scriptLink ?? '',
        robloxUrl: game.robloxUrl ?? '',
        placeId: game.placeId ?? '',
        features: Array.isArray(game.features) ? game.features : [],
        featured: !!game.featured,
        notes: game.notes ?? '',
        tags: Array.isArray(game.tags) ? game.tags : [],
      })
      setFetchUrl(game.robloxUrl ?? '')
      setStep(1)
    } else {
      setForm(empty)
      setFetchUrl('')
      setStep(0)
      fetch('/api/public/settings')
        .then(r => r.json())
        .then(d => {
          const def = d?.links?.defaultScriptLink?.trim()
          if (def) setForm(p => (p.scriptLink ? p : { ...p, scriptLink: def }))
        })
        .catch(() => {})
    }
    setFetchErr(''); setImported(''); setGenMsg(null); setStepErr('')
  }, [game])

  const set = <K extends keyof GameFormData>(k: K, v: GameFormData[K]) => setForm(p => ({ ...p, [k]: v }))

  const importGame = async () => {
    const id = placeFrom(fetchUrl)
    if (!id) { setFetchErr('Paste a Roblox game link or a place ID.'); return }
    setFetching(true); setFetchErr(''); setImported('')
    try {
      const res = await fetch(`/api/roblox?gameId=${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setForm(p => ({
        ...p,
        name: data.name || p.name,
        description: data.description || p.description,
        thumbnail: data.thumbnail || p.thumbnail,
        robloxUrl: data.robloxUrl || `https://www.roblox.com/games/${id}`,
        placeId: data.placeId || id,
      }))
      setImported(data.name || 'Game')
      setTimeout(() => setStep(1), 600)
    } catch (e: any) {
      setFetchErr(e.message || 'Import failed. You can fill it in by hand instead.')
    } finally {
      setFetching(false)
    }
  }

  const generate = async () => {
    if (!form.name.trim()) { setGenMsg({ ok: false, text: 'Add a name first.' }); return }
    setGenerating(true); setGenMsg(null)
    try {
      const params = new URLSearchParams({ name: form.name, description: form.description, ...(form.placeId ? { placeId: form.placeId } : {}) })
      const res = await fetch(`/api/generate-desc?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setForm(p => ({ ...p, description: data.description || p.description, tags: data.tags || p.tags }))
      setGenMsg({ ok: true, text: 'Description written.' })
    } catch (e: any) {
      setGenMsg({ ok: false, text: e.message || 'Generation failed.' })
    } finally {
      setGenerating(false)
    }
  }

  const next = () => {
    if (step === 1 && !form.name.trim()) { setStepErr('Give the game a name.'); nameRef.current?.focus(); return }
    setStepErr('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => { setStepErr(''); setStep(s => Math.max(s - 1, isEdit ? 1 : 0)) }
  const save = () => {
    if (!form.name.trim()) { setStep(1); setStepErr('Give the game a name.'); return }
    const placeId = form.placeId || placeFrom(form.robloxUrl)
    onSave({ ...form, placeId, featured: false })
  }

  const now = new Date().toISOString()
  const previewGame = {
    id: 'preview',
    name: form.name,
    description: form.description,
    category: form.category,
    status: form.status,
    thumbnail: form.thumbnail,
    robloxUrl: form.robloxUrl,
    placeId: form.placeId || placeFrom(form.robloxUrl),
    createdAt: isEdit ? (game?.createdAt ?? now) : now,
    updatedAt: now,
  }

  return (
    <div className="flex flex-col">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => {
          const done = i < step
          const current = i === step
          return (
            <button
              key={label}
              type="button"
              onClick={() => i < step && (isEdit ? i >= 1 : true) && setStep(i)}
              className={`flex-1 text-left ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`block h-1 rounded-full transition-colors ${current || done ? 'bg-white' : 'bg-[#222]'}`} />
              <span className={`mt-2 flex items-center gap-1.5 text-xs ${current ? 'text-white' : done ? 'text-[#a3a3a3]' : 'text-[#555]'}`}>
                {done && <CheckIcon size={11} />} {i + 1}. {label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div className="min-w-0">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">Paste the Roblox link</h3>
                <p className="mt-1 text-sm text-[#8a8a8a]">Name, icon, banner and description fill themselves in. Live player counts show on the card automatically.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={fetchUrl}
                  onChange={e => { setFetchUrl(e.target.value); setFetchErr('') }}
                  onKeyDown={e => e.key === 'Enter' && !(e.nativeEvent as any).isComposing && importGame()}
                  placeholder="roblox.com/games/2753915549/…  or  2753915549"
                  className={inputCls}
                  aria-label="Roblox game link or place ID"
                  autoFocus
                />
                <button onClick={importGame} disabled={fetching || !fetchUrl.trim()} className="btn-white h-11 px-5 text-sm shrink-0 disabled:opacity-40 disabled:pointer-events-none">
                  {fetching ? <RefreshIcon size={15} className="animate-spin" /> : <SparkleIcon size={15} />}
                  {fetching ? 'Importing…' : 'Import'}
                </button>
              </div>
              {imported && (
                <p className="flex items-center gap-2 text-sm text-white"><CheckIcon size={14} className="text-success" /> Imported {imported}</p>
              )}
              {fetchErr && (
                <p className="flex items-center gap-2 text-sm text-danger"><AlertIcon size={14} /> {fetchErr}</p>
              )}
              <button onClick={() => setStep(1)} className="self-start text-sm text-[#8a8a8a] underline underline-offset-4 decoration-[#333] hover:text-white hover:decoration-white">
                Or fill it in by hand
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="gw-name" className={labelCls}>Name</label>
                <input
                  id="gw-name"
                  ref={nameRef}
                  value={form.name}
                  onChange={e => { set('name', e.target.value); setStepErr('') }}
                  placeholder="e.g. Blox Fruits"
                  className={`${inputCls} ${stepErr && !form.name.trim() ? '!border-danger/70' : ''}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="gw-desc" className={`${labelCls} !mb-0`}>Description</label>
                  <button onClick={generate} disabled={generating} className="btn-outline h-7 px-3 text-[0.7rem] disabled:opacity-40">
                    <SparkleIcon size={11} className={generating ? 'animate-pulse' : ''} />
                    {generating ? 'Writing…' : 'Write it for me'}
                  </button>
                </div>
                <textarea
                  id="gw-desc"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="One or two lines on what the script does…"
                  rows={3}
                  className={`${inputCls} !h-auto py-3 resize-none leading-relaxed`}
                />
                <div className="mt-1.5 flex justify-between text-[0.7rem]">
                  <span className={genMsg ? (genMsg.ok ? 'text-[#a3a3a3]' : 'text-danger') : ''}>{genMsg?.text}</span>
                  <span className={form.description.length > 150 ? 'text-warning' : 'text-[#555]'}>{form.description.length}/150</span>
                </div>
              </div>

              <div>
                <span className={labelCls}>Status</span>
                <div className="grid grid-cols-2 gap-2">
                  {([['active', 'Working'], ['outdated', 'Updating']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('status', key)}
                      className={`h-11 rounded-xl border text-sm flex items-center justify-center gap-2 transition-colors ${
                        form.status === key ? 'bg-white text-black border-white' : 'border-[#262626] text-[#8a8a8a] hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${key === 'active' ? 'bg-success' : 'bg-danger'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={labelCls}>Category</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('category', c)}
                      className={`h-8 px-3.5 rounded-full text-[0.8rem] transition-colors ${
                        form.category === c ? 'bg-white text-black' : 'border border-[#262626] text-[#8a8a8a] hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="gw-thumb" className={labelCls}>Icon image <span className="normal-case tracking-normal">(optional, Roblox icon is used otherwise)</span></label>
                <ImageUploadInput
                  id="gw-thumb"
                  value={form.thumbnail}
                  onChange={url => set('thumbnail', url)}
                  placeholder="Paste or upload an image"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="gw-roblox" className={labelCls}>Roblox link</label>
                <input
                  id="gw-roblox"
                  value={form.robloxUrl}
                  onChange={e => set('robloxUrl', e.target.value)}
                  placeholder="https://www.roblox.com/games/…"
                  className={inputCls}
                />
                <p className="mt-1.5 text-[0.72rem] text-[#6b6b6b]">Powers the banner, live player count and the Play on Roblox button.</p>
              </div>
              <div>
                <label htmlFor="gw-script" className={labelCls}>Extra script link <span className="normal-case tracking-normal">(optional)</span></label>
                <input
                  id="gw-script"
                  value={form.scriptLink}
                  onChange={e => set('scriptLink', e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                />
                <p className="mt-1.5 text-[0.72rem] text-[#6b6b6b]">Shows as a Script link button in the game details. Copy script always uses the loader.</p>
              </div>
              <div>
                <label htmlFor="gw-notes" className={labelCls}>Private notes <span className="normal-case tracking-normal">(only admins see these)</span></label>
                <textarea
                  id="gw-notes"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  placeholder="e.g. check after the next game patch"
                  className={`${inputCls} !h-auto py-3 resize-none`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className={step === 0 ? 'hidden md:block' : ''}>
          <span className={labelCls}>Live preview</span>
          <div className="pointer-events-none">
            <GameCard game={previewGame} preview />
          </div>
          <p className="mt-2 text-[0.7rem] text-[#555]">
            {isEdit ? 'How the card looks on the site.' : 'New games get the “just added” glow for 7 days.'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-7 pt-5 border-t border-[#181818]">
        <p className="text-xs text-danger min-h-[1rem]">{stepErr}</p>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="h-11 px-4 rounded-full text-sm text-[#8a8a8a] hover:text-white">Cancel</button>
          {step > (isEdit ? 1 : 0) && <button onClick={back} className="btn-outline h-11 px-5 text-sm">Back</button>}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-white h-11 px-6 text-sm flex-1 sm:flex-none">
              {step === 0 ? 'Skip' : 'Next'} <ChevronRightIcon size={14} />
            </button>
          ) : (
            <button onClick={save} className="btn-white h-11 px-6 text-sm flex-1 sm:flex-none">
              <CheckIcon size={15} /> {isEdit ? 'Save changes' : 'Add game'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
