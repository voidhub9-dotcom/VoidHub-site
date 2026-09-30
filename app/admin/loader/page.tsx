'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLoadstring, setLoadstring, getCopyCount, resetCopyCount, addActivityLog } from '@/lib/storage'
import { useToast } from '@/components/Toast'
import { PageHead, Section, Segmented, Field, Switch, inputCls, textareaCls, btnDanger } from '@/components/AdminUI'
import {
  ShieldIcon,
  AlertIcon,
  CheckIcon,
  CopyIcon,
  RefreshIcon,
  EyeOffIcon,
  ExternalIcon,
  UploadIcon,
} from '@/components/Icons'

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024 // 3MB — plenty for even heavily obfuscated Lua

function getAdminKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

async function apiGetLoader() {
  const res = await fetch('/api/admin/loader', {
    headers: { 'x-admin-key': getAdminKey() },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<{ script: string; rawScriptUrl: string; endpointUrl: string; source: string; migration: boolean; migrationInvite: string }>
}

async function apiSaveLoader(payload: { migration?: boolean; script?: string; rawScriptUrl?: string; endpointUrl?: string; testRawUrl?: string }) {
  const res = await fetch('/api/admin/loader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const PROTECTION_STATUS = [
  'Browsers & DevTools redirected to a decoy page',
  'Raw source link hidden server-side, never exposed',
  'Per-IP rate limit slows down bulk scraping (20 req / 10s)',
  'Script fetched fresh on every request (no stale cache)',
  'Cache-Control: no-store on all responses',
  'Clipboard-stealer scripts auto-blocked',
]

const PROTECTION_CAVEAT =
  "Heads up: none of this stops a single curl of the endpoint — a Roblox executor's request looks " +
  'identical to curl at the protocol level, so there’s no header check that can tell them apart. ' +
  'These slow down scraping and hide the raw source; if you want the script itself to survive being ' +
  'copied, obfuscate it before pasting or uploading it above.'

export default function LoaderPage() {
  const { showToast } = useToast()

  const [scriptContent, setScriptContent] = useState('')
  const [rawScriptUrl, setRawScriptUrl] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('https://www.voidon.top/api/loader')
  const [loadstringDisplay, setLoadstringDisplay] = useState('')
  const [copyCount, setCopyCount] = useState(0)
  const [activeSource, setActiveSource] = useState<'raw-url' | 'database' | 'none' | 'migration'>('none')
  const [migration, setMigration] = useState(false)
  const [migrationInvite, setMigrationInvite] = useState('')
  const [savingMigration, setSavingMigration] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingScript, setIsSavingScript] = useState(false)
  const [isSavingRawUrl, setIsSavingRawUrl] = useState(false)
  const [isTestingRawUrl, setIsTestingRawUrl] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false)
  const [isSavingDisplay, setIsSavingDisplay] = useState(false)
  const [storageStatus, setStorageStatus] = useState<'unknown' | 'ok' | 'unavailable'>('unknown')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'raw-url' | 'database'>('raw-url')
  const [showProtection, setShowProtection] = useState(false)

  const loadFromServer = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiGetLoader()
      setScriptContent(data.script || '')
      setRawScriptUrl(data.rawScriptUrl || '')
      setEndpointUrl(data.endpointUrl || 'https://www.voidon.top/api/loader')
      setActiveSource((data.source as any) || 'none')
      setMigration(!!data.migration)
      setMigrationInvite(data.migrationInvite || '')
      setTab(data.source === 'database' ? 'database' : 'raw-url')
      setStorageStatus('ok')
    } catch {
      setStorageStatus('unavailable')
      showToast('Could not load from storage. Check your R2 env vars.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    setLoadstringDisplay(getLoadstring())
    setCopyCount(getCopyCount())
    loadFromServer()
  }, [loadFromServer])

  const handleToggleMigration = async (next: boolean) => {
    setSavingMigration(true)
    try {
      await apiSaveLoader({ migration: next })
      setMigration(next)
      setActiveSource(next ? 'migration' : rawScriptUrl.trim() ? 'raw-url' : scriptContent ? 'database' : 'none')
      addActivityLog('loader', next ? 'Turned ON the "we moved" notice' : 'Turned OFF the "we moved" notice')
      showToast(next ? 'Migration notice is ON. Everyone running the loader now sees it.' : 'Migration notice is OFF. The real script is back.', next ? 'info' : 'success')
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally { setSavingMigration(false) }
  }

  const handleSaveRawUrl = async () => {
    setIsSavingRawUrl(true)
    try {
      await apiSaveLoader({ rawScriptUrl: rawScriptUrl.trim() })
      setActiveSource(rawScriptUrl.trim() ? 'raw-url' : scriptContent ? 'database' : 'none')
      addActivityLog('loader', rawScriptUrl.trim() ? 'Updated protected raw script URL' : 'Cleared raw script URL')
      showToast(rawScriptUrl.trim() ? 'Raw URL saved — loader now proxies it, hidden from users.' : 'Raw URL cleared — falling back to pasted script.', 'success')
      setTestResult(null)
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally { setIsSavingRawUrl(false) }
  }

  const handleTestRawUrl = async () => {
    const url = rawScriptUrl.trim()
    if (!url) { showToast('Enter a URL to test', 'error'); return }
    setIsTestingRawUrl(true)
    setTestResult(null)
    try {
      const data = await apiSaveLoader({ testRawUrl: url })
      if (data.ok) {
        setTestResult({ ok: true, message: `Source is reachable — ${data.lines} lines, ${Number(data.bytes).toLocaleString()} bytes fetched.` })
      } else {
        setTestResult({ ok: false, message: data.error || 'Source could not be fetched.' })
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message })
    } finally { setIsTestingRawUrl(false) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`File too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)`, 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setScriptContent(String(reader.result || ''))
      setUploadedFileName(file.name)
      showToast(`Loaded "${file.name}" — click Save Script to publish it`, 'info')
    }
    reader.onerror = () => showToast('Could not read that file', 'error')
    reader.readAsText(file)
  }

  const handleSaveScript = async () => {
    if (!scriptContent.trim()) { showToast('Script content is empty', 'error'); return }
    setIsSavingScript(true)
    try {
      await apiSaveLoader({ script: scriptContent })
      addActivityLog('loader', 'Updated loader script')
      showToast('Script saved — live instantly, no redeploy needed.', 'success')
    } catch (err: any) {
      showToast(`Failed to save: ${err.message}`, 'error')
    } finally { setIsSavingScript(false) }
  }

  const handleSaveEndpoint = async () => {
    setIsSavingEndpoint(true)
    try {
      await apiSaveLoader({ endpointUrl })
      addActivityLog('loader', `Updated endpoint URL to ${endpointUrl}`)
      showToast('Endpoint URL saved!', 'success')
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally { setIsSavingEndpoint(false) }
  }

  const handleSaveDisplay = () => {
    setIsSavingDisplay(true)
    setLoadstring(loadstringDisplay)
    addActivityLog('loader', 'Updated loadstring display text')
    showToast('Loadstring display text saved!', 'success')
    setIsSavingDisplay(false)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpointUrl)
    showToast('Endpoint URL copied!', 'success')
  }

  const handleResetCounter = () => {
    resetCopyCount()
    setCopyCount(0)
    showToast('Counter reset', 'info')
  }

  const lineCount = scriptContent ? scriptContent.split('\n').length : 0

  const sourceLabel = { 'raw-url': 'Hidden URL', database: 'Pasted script', none: 'Nothing yet', migration: 'Moved notice' }[activeSource]

  return (
    <div className="max-w-6xl mx-auto">
      <PageHead
        eyebrow="Content"
        title="Script loader"
        subtitle={<>What executors get when they run your loadstring. Everything here goes live instantly.</>}
        actions={
          <button onClick={loadFromServer} disabled={isLoading} className="btn-outline h-10 px-4 text-sm">
            <RefreshIcon size={14} className={isLoading ? 'animate-spin' : ''} /> Reload
          </button>
        }
      />

      {storageStatus === 'unavailable' && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/[0.04] p-5 flex flex-col sm:flex-row gap-4">
          <AlertIcon size={20} className="text-danger shrink-0" />
          <div className="flex-1 text-sm text-[#a3a3a3]">
            <p className="text-danger">Cloudflare R2 isn&apos;t connected, so nothing can be saved.</p>
            <p className="mt-1">Set <code className="font-gmono text-white">CLOUDFLARE_R2_ACCOUNT_ID</code>, <code className="font-gmono text-white">_ACCESS_KEY_ID</code>, <code className="font-gmono text-white">_SECRET_ACCESS_KEY</code> and <code className="font-gmono text-white">_BUCKET_NAME</code> in Vercel.</p>
          </div>
          <button onClick={loadFromServer} className={btnDanger}><RefreshIcon size={14} /> Retry</button>
        </div>
      )}

      {/* Migration notice: send old-script users to the new Discord */}
      <section className={`mb-6 rounded-2xl border p-5 md:p-6 transition-colors ${migration ? 'border-warning/40 bg-warning/[0.04]' : 'border-[#1c1c1c] bg-[#070707]'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
              &ldquo;We moved&rdquo; notice
              <span className={`inline-flex items-center h-6 px-2.5 rounded-full border font-gmono text-[0.6rem] uppercase tracking-wider ${migration ? 'border-warning/40 text-warning' : 'border-[#2a2a2a] text-[#6b6b6b]'}`}>{migration ? 'On' : 'Off'}</span>
            </h2>
            <p className="mt-1 text-sm text-[#8a8a8a] leading-relaxed max-w-2xl">
              For people still running the old script. While this is on, <code className="font-gmono text-white">/api/loader</code> shows a small window in-game instead of the script:
              <span className="text-white"> &ldquo;We moved to a new server.&rdquo;</span> The <span className="text-white">Join Discord</span> button copies your invite
              {migrationInvite && <> (<code className="font-gmono text-white">{migrationInvite}</code>)</>} and then leaves the game so they can join. The window says so up front, and <span className="text-white">Not now</span> closes it and carries on loading their script as normal.
            </p>
          </div>
          <Switch checked={migration} onChange={handleToggleMigration} disabled={savingMigration || storageStatus === 'unavailable'} label="Migration notice" />
        </div>
        {migration && (
          <p className="mt-4 flex items-start gap-2 text-xs text-warning">
            <AlertIcon size={14} className="mt-0.5 shrink-0" /> It&apos;s on right now: everyone sees this window each time they run it. Pressing Not now still loads the real script. The invite comes from Settings → Discord invite.
          </p>
        )}
      </section>

      {/* Pipeline: what is being served right now */}
      <div className="mb-6 rounded-2xl border border-[#1c1c1c] bg-[#070707] p-5 md:p-6 overflow-hidden relative">
        <div className="absolute inset-0 mono-dots opacity-30 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-0">
          {[
            { k: 'Executor runs', v: 'loadstring(…)' },
            { k: 'Hits', v: '/api/loader' },
            { k: 'Serves', v: sourceLabel, live: true },
          ].map((step, i) => (
            <div key={step.k} className="flex md:flex-1 items-center gap-3">
              <div className={`flex-1 md:flex-none rounded-xl border px-4 py-3 ${step.live ? (activeSource === 'none' ? 'border-warning/40 bg-warning/[0.05]' : 'border-white/40 bg-white/[0.04]') : 'border-[#222] bg-black'}`}>
                <p className="font-gmono text-[0.6rem] uppercase tracking-[0.18em] text-[#6b6b6b]">{step.k}</p>
                <p className={`mt-0.5 font-gmono text-sm ${step.live && activeSource === 'none' ? 'text-warning' : 'text-white'}`}>{isLoading && step.live ? '…' : step.v}</p>
              </div>
              {i < 2 && <span className="hidden md:block flex-1 h-px mx-3 bg-gradient-to-r from-[#444] to-[#1a1a1a]" />}
            </div>
          ))}
          <div className="md:ml-6 flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${storageStatus === 'ok' ? 'bg-success' : storageStatus === 'unavailable' ? 'bg-danger' : 'bg-[#444]'}`} />
            <span className="text-[#8a8a8a]">{storageStatus === 'ok' ? 'R2 connected' : storageStatus === 'unavailable' ? 'R2 offline' : 'Checking R2…'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* Source */}
        <Section
          title="Script source"
          description="Where the loader gets the script from. A hidden URL wins if one is saved; otherwise the pasted script is used."
          actions={
            <Segmented
              value={tab}
              onChange={v => setTab(v)}
              options={[
                { value: 'raw-url', label: <>Hidden URL{activeSource === 'raw-url' && ' •'}</> },
                { value: 'database', label: <>Pasted script{activeSource === 'database' && ' •'}</> },
              ]}
            />
          }
        >
          {isLoading ? (
            <div className="h-40 rounded-xl bg-[#0d0d0d] animate-pulse" />
          ) : tab === 'raw-url' ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 rounded-xl border border-[#1f1f1f] bg-black p-4 text-sm text-[#8a8a8a] leading-relaxed">
                <EyeOffIcon size={16} className="mt-0.5 shrink-0 text-white" />
                <span>The server fetches this link and passes the script through <code className="font-gmono text-white">/api/loader</code>. Nobody ever sees the link itself, and updating the script at the source updates it for everyone.</span>
              </div>
              <Field label="Raw script URL" hint="Leave empty and save to switch to the pasted script.">
                <input
                  value={rawScriptUrl}
                  onChange={e => { setRawScriptUrl(e.target.value); setTestResult(null) }}
                  placeholder="https://raw.example.com/your-script.lua"
                  className={`${inputCls} font-gmono`}
                  spellCheck={false}
                />
              </Field>
              {testResult && (
                <p className={`flex items-start gap-2 text-sm ${testResult.ok ? 'text-success' : 'text-danger'}`}>
                  {testResult.ok ? <CheckIcon size={15} className="mt-0.5 shrink-0" /> : <AlertIcon size={15} className="mt-0.5 shrink-0" />}
                  {testResult.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSaveRawUrl} disabled={isSavingRawUrl || storageStatus === 'unavailable'} className="btn-white h-11 px-5 text-sm disabled:opacity-40">
                  {isSavingRawUrl ? <RefreshIcon size={15} className="animate-spin" /> : <CheckIcon size={15} />} Save URL
                </button>
                <button onClick={handleTestRawUrl} disabled={isTestingRawUrl || !rawScriptUrl.trim()} className="btn-outline h-11 px-5 text-sm disabled:opacity-40">
                  {isTestingRawUrl ? <RefreshIcon size={15} className="animate-spin" /> : <ExternalIcon size={15} />} Test it
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input ref={fileInputRef} type="file" accept=".lua,.txt,text/plain" onChange={handleFileSelect} className="hidden" />
              <div className="rounded-xl border border-[#1f1f1f] bg-black overflow-hidden focus-within:border-[#555]">
                <div className="flex items-center justify-between h-9 px-4 border-b border-[#1a1a1a] font-gmono text-[0.65rem] text-[#6b6b6b]">
                  <span>{uploadedFileName || 'script.lua'}</span>
                  <span>{lineCount} lines · {scriptContent.length.toLocaleString()} chars</span>
                </div>
                <textarea
                  value={scriptContent}
                  onChange={e => { setScriptContent(e.target.value); setUploadedFileName('') }}
                  placeholder={'-- Paste your full Lua script here, or upload a .lua file'}
                  className="block w-full min-h-[300px] resize-y bg-transparent p-4 font-gmono text-[0.8rem] text-[#e5e5e5] outline-none"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-[#6b6b6b]">Obfuscate it first if you want the source protected once it&apos;s served.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSaveScript} disabled={isSavingScript || storageStatus === 'unavailable'} className="btn-white h-11 px-5 text-sm disabled:opacity-40">
                  {isSavingScript ? <RefreshIcon size={15} className="animate-spin" /> : <CheckIcon size={15} />} Save script
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={storageStatus === 'unavailable'} className="btn-outline h-11 px-5 text-sm disabled:opacity-40">
                  <UploadIcon size={15} /> Upload .lua
                </button>
              </div>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Copy box text" description="What the copy box on the site shows and copies.">
            <textarea
              value={loadstringDisplay}
              onChange={e => setLoadstringDisplay(e.target.value)}
              rows={3}
              spellCheck={false}
              className={`${textareaCls} font-gmono text-[0.8rem]`}
            />
            <button onClick={handleSaveDisplay} disabled={isSavingDisplay} className="btn-outline h-10 px-4 mt-3 text-sm"><CheckIcon size={14} /> Save text</button>
          </Section>

          <Section title="Endpoint URL" description="The URL your Lua loader calls. Change it if you move domains.">
            <div className="flex gap-2">
              <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} className={`${inputCls} font-gmono flex-1 min-w-0`} spellCheck={false} />
              <button onClick={handleCopyUrl} aria-label="Copy endpoint URL" className="btn-outline w-11 h-11 shrink-0"><CopyIcon size={15} /></button>
            </div>
            <button onClick={handleSaveEndpoint} disabled={isSavingEndpoint || storageStatus === 'unavailable'} className="btn-outline h-10 px-4 mt-3 text-sm disabled:opacity-40">
              {isSavingEndpoint ? <RefreshIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />} Save endpoint
            </button>
          </Section>

          <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] p-5 md:p-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-gmono text-[0.6rem] uppercase tracking-[0.18em] text-[#6b6b6b]">Copies from this browser</p>
              <p className="mt-2 text-4xl font-semibold tracking-tighter text-white tabular-nums">{copyCount}</p>
            </div>
            <button onClick={handleResetCounter} className="h-9 px-3 rounded-full text-xs text-[#8a8a8a] hover:text-danger">Reset</button>
          </div>

          <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
            <button onClick={() => setShowProtection(v => !v)} className="w-full flex items-center justify-between gap-3 px-5 md:px-6 h-14 text-left" aria-expanded={showProtection}>
              <span className="flex items-center gap-2.5 text-white"><ShieldIcon size={16} /> Protection</span>
              <span className="text-xs text-[#6b6b6b]">{showProtection ? 'Hide' : `${PROTECTION_STATUS.length} active`}</span>
            </button>
            {showProtection && (
              <div className="px-5 md:px-6 pb-5">
                <ul className="flex flex-col gap-2">
                  {PROTECTION_STATUS.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#a3a3a3]"><CheckIcon size={14} className="mt-0.5 shrink-0 text-success" />{item}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-[#6b6b6b] leading-relaxed">{PROTECTION_CAVEAT}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
