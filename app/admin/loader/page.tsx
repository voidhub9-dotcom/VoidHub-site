'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLoadstring, setLoadstring, getCopyCount, resetCopyCount, addActivityLog } from '@/lib/storage'
import { useToast } from '@/components/Toast'
import {
  ShieldIcon,
  TerminalIcon,
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
  return res.json() as Promise<{ script: string; rawScriptUrl: string; endpointUrl: string; source: string }>
}

async function apiSaveLoader(payload: { script?: string; rawScriptUrl?: string; endpointUrl?: string; testRawUrl?: string }) {
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
  const [activeSource, setActiveSource] = useState<'raw-url' | 'database' | 'none'>('none')

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

  const loadFromServer = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiGetLoader()
      setScriptContent(data.script || '')
      setRawScriptUrl(data.rawScriptUrl || '')
      setEndpointUrl(data.endpointUrl || 'https://www.voidon.top/api/loader')
      setActiveSource((data.source as any) || 'none')
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

  const inputClass =
    'w-full rounded-lg border border-border-dim bg-black-surface px-3 py-2.5 font-body text-sm text-silver-bright outline-none transition-colors focus:border-white placeholder:text-silver-faint'

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldIcon size={28} className="text-silver-base" />
          <div>
            <h1 className="font-heading text-2xl tracking-wider text-white">SCRIPT LOADER</h1>
            <p className="font-body text-sm text-silver-muted">Manage what executors receive from /api/loader</p>
          </div>
        </div>
        {/* Active source pill */}
        {!isLoading && storageStatus === 'ok' && (
          <div className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-body ${
            activeSource === 'raw-url'
              ? 'border-info/30 bg-info/5 text-info'
              : activeSource === 'database'
                ? 'border-success/30 bg-success/5 text-success'
                : 'border-warning/30 bg-warning/5 text-warning'
          }`}>
            <EyeOffIcon size={15} />
            {activeSource === 'raw-url' && 'Serving: Hidden Raw URL'}
            {activeSource === 'database' && 'Serving: Pasted Script'}
            {activeSource === 'none' && 'No script configured'}
          </div>
        )}
      </div>

      {/* Storage warning */}
      {storageStatus === 'unavailable' && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <AlertIcon size={20} className="mt-0.5 shrink-0 text-danger" />
            <div className="space-y-3 text-sm text-silver-muted font-body">
              <p className="font-medium text-danger">Cloudflare R2 storage is not connected.</p>
              <p>Set these environment variables in your deployment:</p>
              <ul className="space-y-1 pl-4 list-disc font-code text-silver-bright">
                <li>CLOUDFLARE_R2_ACCOUNT_ID</li>
                <li>CLOUDFLARE_R2_ACCESS_KEY_ID</li>
                <li>CLOUDFLARE_R2_SECRET_ACCESS_KEY</li>
                <li>CLOUDFLARE_R2_BUCKET_NAME</li>
              </ul>
              <button
                onClick={loadFromServer}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                <RefreshIcon size={16} />
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {storageStatus === 'ok' && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm font-body text-success">
          <CheckIcon size={16} />
          R2 Storage Connected — changes go live instantly, no redeploy needed
        </div>
      )}

      {/* PANEL 1: Protected Raw Script URL */}
      <section className="rounded-lg border border-info/25 bg-black-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <ExternalIcon size={22} className="text-info" />
          <h2 className="font-heading text-lg tracking-wide text-white">PROTECTED RAW SCRIPT URL</h2>
          <span className="rounded-full border border-info/30 bg-info/10 px-2.5 py-0.5 font-heading text-[0.55rem] tracking-widest text-info uppercase">
            Primary Source
          </span>
        </div>
        <p className="text-sm font-body text-silver-muted mb-4 leading-relaxed">
          Paste the raw link to your script (e.g. a raw loadstring host, pastebin raw, GitHub raw).
          The server fetches it <strong className="text-silver-bright">server-side</strong> and serves the content
          through <span className="font-code text-silver-bright">/api/loader</span> —{' '}
          <strong className="text-silver-bright">the link itself is never exposed to anyone</strong>.
        </p>

        <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-4 mb-4">
          <EyeOffIcon size={18} className="mt-0.5 shrink-0 text-info" />
          <p className="text-sm font-body text-silver-muted leading-relaxed">
            Users only ever see your loadstring pointing at <span className="font-code text-silver-bright">/api/loader</span>.
            The hidden source URL stays server-side in R2. When you update the script at the source,
            executors get the new version instantly — nothing to redeploy.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-sm font-body text-silver-muted">
            <RefreshIcon size={16} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <input
              value={rawScriptUrl}
              onChange={e => { setRawScriptUrl(e.target.value); setTestResult(null) }}
              placeholder="https://raw.example.com/your-hidden-script.lua"
              className={inputClass + ' font-code'}
              spellCheck={false}
            />

            {testResult && (
              <div className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm font-body ${
                testResult.ok ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'
              }`}>
                {testResult.ok ? <CheckIcon size={16} className="mt-0.5 shrink-0" /> : <AlertIcon size={16} className="mt-0.5 shrink-0" />}
                {testResult.message}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSaveRawUrl}
                disabled={isSavingRawUrl || storageStatus === 'unavailable'}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 font-body text-sm font-medium text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(255,255,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRawUrl ? <><RefreshIcon size={16} className="animate-spin" />Saving��</> : <><EyeOffIcon size={16} />SAVE HIDDEN URL</>}
              </button>
              <button
                onClick={handleTestRawUrl}
                disabled={isTestingRawUrl || !rawScriptUrl.trim()}
                className="inline-flex items-center gap-2 rounded-lg border border-silver-faint px-5 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTestingRawUrl ? <><RefreshIcon size={16} className="animate-spin" />Testing…</> : <><CheckIcon size={16} />TEST SOURCE</>}
              </button>
            </div>
            <p className="mt-3 text-xs font-body text-silver-faint">
              Leave empty and save to fall back to the pasted script below.
            </p>
          </>
        )}
      </section>

      {/* PANEL 2: Pasted Script (fallback) */}
      <section className="admin-panel p-6">
        <div className="flex items-center gap-3 mb-1">
          <TerminalIcon size={22} className="text-silver-base" />
          <h2 className="font-heading text-lg tracking-wide text-white">PASTED LUA SCRIPT</h2>
          <span className="rounded-full border border-border-mid bg-black-surface px-2.5 py-0.5 font-heading text-[0.55rem] tracking-widest text-silver-muted uppercase">
            Fallback
          </span>
        </div>
        <p className="text-sm font-body text-silver-muted mb-4">
          Used only when no Raw Script URL is set above. Paste your full Lua script, or upload a
          <span className="font-code text-silver-bright"> .lua</span> file directly — either way it's stored server-side in R2.
          If you've obfuscated the script yourself, this is where it goes: obfuscation protects the source once
          it's served, the rate limit on <span className="font-code text-silver-bright">/api/loader</span> just
          slows down anyone trying to scrape it wholesale.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-3 text-sm font-body text-silver-muted">
            <RefreshIcon size={16} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".lua,.txt,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
            <textarea
              value={scriptContent}
              onChange={e => { setScriptContent(e.target.value); setUploadedFileName('') }}
              placeholder={'-- Paste your full Lua script here, or upload a .lua file below\n-- Saved directly to R2, live instantly'}
              className="min-h-[260px] w-full resize-y rounded-lg border border-border-dim bg-black-surface p-4 font-code text-[0.85rem] text-silver-bright outline-none transition-colors focus:border-white"
              spellCheck={false}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-code text-xs text-silver-muted">
                {lineCount} lines · {scriptContent.length.toLocaleString()} chars
                {uploadedFileName && <span className="text-success"> · from {uploadedFileName}</span>}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSaveScript}
                disabled={isSavingScript || storageStatus === 'unavailable'}
                className="inline-flex items-center gap-2 rounded-lg border border-silver-faint px-6 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingScript ? <><RefreshIcon size={16} className="animate-spin" />Saving…</> : <><TerminalIcon size={16} />SAVE SCRIPT</>}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={storageStatus === 'unavailable'}
                className="inline-flex items-center gap-2 rounded-lg border border-silver-faint px-6 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadIcon size={16} />UPLOAD .LUA FILE
              </button>
            </div>
          </>
        )}
      </section>

      {/* PANEL 3: Loadstring Display */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white">PUBLIC LOADSTRING TEXT</h2>
        <p className="mt-1 text-sm font-body text-silver-muted">
          The text shown in the copy box on the home page. Point it at your protected endpoint.
        </p>
        <textarea
          value={loadstringDisplay}
          onChange={e => setLoadstringDisplay(e.target.value)}
          rows={3}
          spellCheck={false}
          className="mt-4 w-full resize-none rounded-lg border border-border-dim bg-black-surface p-4 font-code text-[0.85rem] text-silver-bright outline-none transition-colors focus:border-white"
        />
        <button
          onClick={handleSaveDisplay}
          disabled={isSavingDisplay}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-silver-faint px-5 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white disabled:opacity-50"
        >
          {isSavingDisplay ? <RefreshIcon size={16} className="animate-spin" /> : <CopyIcon size={16} />}
          SAVE DISPLAY TEXT
        </button>
      </section>

      {/* PANEL 4: Endpoint URL */}
      <section className="admin-panel p-6">
        <h2 className="font-heading text-lg tracking-wide text-white">ENDPOINT URL</h2>
        <p className="mt-1 text-sm font-body text-silver-muted">
          The URL your Lua loader calls. Update this if you change your hosting domain.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={endpointUrl}
            onChange={e => setEndpointUrl(e.target.value)}
            className={inputClass + ' flex-1 font-code'}
            spellCheck={false}
          />
          <button
            onClick={handleCopyUrl}
            aria-label="Copy endpoint URL"
            className="px-4 h-[42px] rounded-lg border border-silver-faint text-silver-mid font-body text-sm transition-all hover:border-white hover:text-white shrink-0"
          >
            <CopyIcon size={16} />
          </button>
        </div>
        <button
          onClick={handleSaveEndpoint}
          disabled={isSavingEndpoint || storageStatus === 'unavailable'}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-silver-faint px-5 py-2.5 font-body text-sm text-silver-mid transition-all hover:border-white hover:text-white disabled:opacity-50"
        >
          {isSavingEndpoint ? <RefreshIcon size={16} className="animate-spin" /> : null}
          SAVE ENDPOINT
        </button>
      </section>

      {/* PANEL 5: Protection Status + Copy Counter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="admin-panel p-6">
          <h2 className="font-heading text-sm tracking-wide text-white mb-4">PROTECTION STATUS</h2>
          <ul className="space-y-2">
            {PROTECTION_STATUS.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm font-body text-silver-muted">
                <CheckIcon size={15} className="mt-0.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 p-3 text-xs font-body text-silver-muted leading-relaxed">
            <AlertIcon size={14} className="mt-0.5 shrink-0 text-warning" />
            {PROTECTION_CAVEAT}
          </p>
        </section>

        <section className="admin-panel p-6">
          <h2 className="font-heading text-sm tracking-wide text-white mb-4">COPY COUNTER</h2>
          <p className="font-heading text-4xl text-white">{copyCount}</p>
          <p className="mt-1 text-sm font-body text-silver-muted">times the loadstring was copied</p>
          <button
            onClick={handleResetCounter}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 font-body text-sm text-danger transition-colors hover:bg-danger/10"
          >
            <RefreshIcon size={15} />
            Reset Counter
          </button>
        </section>
      </div>
    </div>
  )
}
