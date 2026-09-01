'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider, useToast } from '@/components/Toast'
import { CodeIcon, CopyIcon, CheckIcon, GlobeIcon, BoltIcon } from '@/components/Icons'

const EXAMPLE_RESPONSE = `[
  {
    "id": "1788154138376",
    "name": "Blox Fruits",
    "description": "Auto farm + ESP for Blox Fruits.",
    "category": "Roblox",
    "status": "active",
    "thumbnail": "https://...",
    "scriptLink": "https://discord.gg/...",
    "robloxUrl": "https://www.roblox.com/games/2753915549",
    "placeId": "2753915549",
    "features": ["Auto Farm", "ESP"],
    "featured": true,
    "createdAt": "2026-08-31T05:28:58.376Z",
    "updatedAt": "2026-08-31T05:28:58.376Z"
  }
]`

const PARAMS = [
  { name: 'status', example: 'active | outdated', desc: 'Only return games with this status.' },
  { name: 'category', example: 'Roblox', desc: 'Only return games in this category (case-insensitive).' },
  { name: 'featured', example: 'true', desc: 'Only return featured games.' },
]

const FIELDS = [
  { name: 'id', desc: 'Stable unique identifier.' },
  { name: 'name', desc: 'Game name.' },
  { name: 'description', desc: 'Short SEO description.' },
  { name: 'category', desc: 'Category label, e.g. "Roblox", "Simulator".' },
  { name: 'status', desc: '"active" or "outdated".' },
  { name: 'thumbnail', desc: 'Thumbnail image URL.' },
  { name: 'scriptLink', desc: 'Optional secondary script link (may be empty).' },
  { name: 'robloxUrl', desc: 'Roblox game page URL, if set.' },
  { name: 'placeId', desc: 'Roblox place ID, if known.' },
  { name: 'features', desc: 'Array of feature tag strings.' },
  { name: 'featured', desc: 'Boolean.' },
  { name: 'createdAt / updatedAt', desc: 'ISO timestamps.' },
]

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    showToast('Copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="relative rounded-xl border border-border-dim bg-black-surface overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 h-9 border-b border-border-dim">
          <span className="font-body text-[0.65rem] tracking-widest uppercase text-silver-muted">{label}</span>
        </div>
      )}
      <button
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-mid bg-black-card text-silver-mid font-body text-xs hover:border-white hover:text-white transition-all"
        style={label ? { top: '2.75rem' } : undefined}
      >
        {copied ? <CheckIcon size={12} className="text-success" /> : <CopyIcon size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto p-4 pr-20 font-code text-[0.8rem] leading-relaxed text-silver-bright">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function DevelopersPageInner() {
  return (
    <div className="min-h-screen bg-black-void">
      <Navbar />
      <main className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-mid bg-black-card px-4 py-1.5 mb-5">
              <CodeIcon size={13} className="text-silver-muted" />
              <span className="font-body text-xs text-silver-muted tracking-wider">PUBLIC API</span>
            </div>
            <h1 className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-white mb-3 text-balance">
              BUILD ON <span className="text-glow">VOIDHUB</span>
            </h1>
            <p className="font-body text-silver-mid text-sm md:text-base text-pretty">
              A read-only, no-auth API for the games catalog. Free to use, no API key required.
            </p>
          </div>

          {/* At a glance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            <div className="void-card p-4 flex items-start gap-3">
              <GlobeIcon size={16} className="text-silver-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-body text-sm text-white">CORS enabled</p>
                <p className="font-body text-xs text-silver-muted mt-0.5">Call it from any origin — browser or server.</p>
              </div>
            </div>
            <div className="void-card p-4 flex items-start gap-3">
              <BoltIcon size={16} className="text-silver-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-body text-sm text-white">No auth needed</p>
                <p className="font-body text-xs text-silver-muted mt-0.5">It's the same public data the site itself reads.</p>
              </div>
            </div>
            <div className="void-card p-4 flex items-start gap-3">
              <ShieldRateIcon />
              <div>
                <p className="font-body text-sm text-white">Rate limited</p>
                <p className="font-body text-xs text-silver-muted mt-0.5">60 requests / minute per IP.</p>
              </div>
            </div>
          </div>

          {/* Endpoint */}
          <section className="mb-10">
            <h2 className="font-heading text-lg tracking-wide text-white mb-3">GET GAMES</h2>
            <p className="font-body text-sm text-silver-muted mb-4 leading-relaxed">
              Returns the current games catalog. This is the same list shown on the{' '}
              <a href="/games" className="text-silver-bright underline hover:text-white">Games page</a> — internal
              admin-only fields (like private notes) are stripped before this response is built.
            </p>

            <CodeBlock label="Request" code={`GET https://www.voidon.top/api/public/games`} />

            <p className="font-body text-xs text-silver-muted mt-4 mb-2 uppercase tracking-widest">Query params (all optional)</p>
            <div className="rounded-xl border border-border-dim overflow-hidden">
              {PARAMS.map((p, i) => (
                <div key={p.name} className={`flex items-start gap-4 p-3.5 ${i > 0 ? 'border-t border-border-dim' : ''}`}>
                  <code className="shrink-0 w-24 font-code text-xs text-silver-bright">{p.name}</code>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs text-silver-mid">{p.desc}</p>
                    <p className="font-code text-[0.7rem] text-silver-muted mt-1">e.g. ?{p.name}={p.example}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="font-body text-xs text-silver-muted mt-6 mb-2 uppercase tracking-widest">Example</p>
            <CodeBlock label="curl" code={`curl "https://www.voidon.top/api/public/games?status=active&featured=true"`} />

            <p className="font-body text-xs text-silver-muted mt-6 mb-2 uppercase tracking-widest">Response — 200 OK</p>
            <CodeBlock label="application/json" code={EXAMPLE_RESPONSE} />

            <p className="font-body text-xs text-silver-muted mt-6 mb-2 uppercase tracking-widest">Fields</p>
            <div className="rounded-xl border border-border-dim overflow-hidden">
              {FIELDS.map((f, i) => (
                <div key={f.name} className={`flex items-start gap-4 p-3.5 ${i > 0 ? 'border-t border-border-dim' : ''}`}>
                  <code className="shrink-0 w-32 font-code text-xs text-silver-bright">{f.name}</code>
                  <p className="font-body text-xs text-silver-mid">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="void-card p-5">
            <p className="font-body text-sm text-silver-mid leading-relaxed">
              Rate limited to 60 requests per minute per IP; excess requests get a{' '}
              <code className="text-silver-bright">429</code> with a <code className="text-silver-bright">Retry-After</code> header.
              This endpoint reflects live admin edits with no cache, so there's no need to poll faster than your own use case needs.
              Something else you'd find useful here? Ask in Discord.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}

function ShieldRateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="text-silver-muted mt-0.5 shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export default function DevelopersPage() {
  return (
    <ToastProvider>
      <DevelopersPageInner />
    </ToastProvider>
  )
}
