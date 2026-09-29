'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import { CopyIcon, CheckIcon, BoltIcon, GlobeIcon, ShieldIcon, RefreshIcon } from '@/components/Icons'

const BASE = 'https://www.voidon.top'

const EXAMPLE_RESPONSE = `[
  {
    "id": "1788154138376",
    "name": "Blox Fruits",
    "description": "Auto farm levels, masteries and bosses.",
    "category": "RPG",
    "status": "active",
    "thumbnail": "https://...",
    "scriptLink": "",
    "robloxUrl": "https://www.roblox.com/games/2753915549",
    "placeId": "2753915549",
    "createdAt": "2026-09-28T05:28:58.376Z",
    "updatedAt": "2026-09-29T11:02:10.004Z"
  }
]`

const SNIPPETS: Record<string, string> = {
  curl: `curl "${BASE}/api/public/games?status=active"`,
  JavaScript: `const res = await fetch("${BASE}/api/public/games?status=active")
const games = await res.json()
console.log(games.map(g => g.name))`,
  Lua: `local HttpService = game:GetService("HttpService")
local body = game:HttpGet("${BASE}/api/public/games?status=active")
for _, g in ipairs(HttpService:JSONDecode(body)) do
  print(g.name, g.status)
end`,
}

const PARAMS = [
  { name: 'status', type: 'active | outdated', desc: 'Only games with this status.' },
  { name: 'category', type: 'string', desc: 'Only games in this category (case-insensitive).' },
]

const FIELDS = [
  { name: 'id', type: 'string', desc: 'Stable unique identifier.' },
  { name: 'name', type: 'string', desc: 'Game name.' },
  { name: 'description', type: 'string', desc: 'Short description.' },
  { name: 'category', type: 'string', desc: 'e.g. "RPG", "Simulator".' },
  { name: 'status', type: 'string', desc: '"active" (working) or "outdated" (being updated).' },
  { name: 'thumbnail', type: 'string', desc: 'Icon URL, may be empty.' },
  { name: 'scriptLink', type: 'string', desc: 'Optional extra link, may be empty.' },
  { name: 'robloxUrl', type: 'string', desc: 'Roblox game page, if set.' },
  { name: 'placeId', type: 'string', desc: 'Roblox place ID, if known.' },
  { name: 'createdAt', type: 'ISO date', desc: 'When the game was added.' },
  { name: 'updatedAt', type: 'ISO date', desc: 'Last change.' },
]

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text) } catch {
    const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
  }
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => { await copy(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#262626] text-[0.7rem] text-[#a3a3a3] hover:text-white hover:border-[#444]"
      aria-label="Copy"
    >
      {done ? <CheckIcon size={11} /> : <CopyIcon size={11} />}{done ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Tiny JSON colouring in greys: keys white, strings mid, punctuation dim. */
function Json({ text }: { text: string }) {
  const parts = text.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        if (/^".*"$/.test(p) && text.slice(text.indexOf(p)).length && parts[i + 1]?.trimStart().startsWith(':'))
          return <span key={i} className="text-white">{p}</span>
        if (/^"/.test(p)) return <span key={i} className="text-[#9a9a9a]">{p}</span>
        if (/^(true|false|null|-?\d)/.test(p)) return <span key={i} className="text-[#d4d4d4]">{p}</span>
        return <span key={i} className="text-[#555]">{p}</span>
      })}
    </>
  )
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
      <div className="flex items-center justify-between gap-2 h-11 px-4 border-b border-[#1a1a1a]">
        <span className="font-gmono text-[0.68rem] text-[#6b6b6b]">{title}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

function Inner() {
  const [lang, setLang] = useState<keyof typeof SNIPPETS>('curl')
  const [live, setLive] = useState<{ ms: number; status: number; body: string } | null>(null)
  const [trying, setTrying] = useState(false)

  const tryIt = async () => {
    setTrying(true)
    const t = performance.now()
    try {
      const res = await fetch('/api/public/games?status=active')
      const data = await res.json()
      const arr = Array.isArray(data) ? data.slice(0, 2) : data
      setLive({ ms: Math.round(performance.now() - t), status: res.status, body: JSON.stringify(arr, null, 2) + (Array.isArray(data) && data.length > 2 ? `\n// …and ${data.length - 2} more` : '') })
    } catch (e: any) {
      setLive({ ms: 0, status: 0, body: String(e?.message || e) })
    } finally {
      setTrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-black font-display">
      <Navbar />

      <section className="relative px-4 pt-28 md:pt-36 pb-12 mono-grain">
        <div className="absolute inset-0 mono-spot pointer-events-none" />
        <div className="absolute inset-0 mono-dots pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">Public API</p>
          <h1 className="mt-4 font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.4rem,6vw,4.4rem)] text-chrome">Build on VoidHub.</h1>
          <p className="mt-5 max-w-xl text-base md:text-lg text-[#8a8a8a]">A free, read-only API for the games catalog. No key, no sign-up. Use it for bots, sites or your own tools.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[[GlobeIcon, 'CORS open'], [BoltIcon, 'No auth'], [ShieldIcon, '60 req / min per IP']].map(([Icon, label]) => {
              const I = Icon as typeof GlobeIcon
              return (
                <span key={label as string} className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[#262626] bg-white/[0.02] text-sm text-[#d4d4d4]">
                  <I size={14} className="text-[#8a8a8a]" />{label as string}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <main className="px-4 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Reference */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="h-7 px-2.5 rounded-lg bg-white text-black font-gmono text-xs font-semibold flex items-center">GET</span>
              <code className="font-gmono text-[0.95rem] text-white break-all">/api/public/games</code>
              <CopyButton text={`${BASE}/api/public/games`} />
            </div>
            <p className="mt-4 text-sm text-[#8a8a8a] leading-relaxed">
              Every supported game as a JSON array. Private admin fields (like notes) are never included. Responses are never cached, so you always get the live list.
            </p>

            <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-white">Query parameters</h2>
            <div className="rounded-2xl border border-[#1c1c1c] divide-y divide-[#161616] overflow-hidden">
              {PARAMS.map(p => (
                <div key={p.name} className="px-4 py-3.5 grid grid-cols-[110px_1fr] gap-3">
                  <code className="font-gmono text-sm text-white">{p.name}</code>
                  <div>
                    <span className="font-gmono text-[0.7rem] text-[#6b6b6b]">{p.type}</span>
                    <p className="text-sm text-[#9a9a9a]">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-white">Response fields</h2>
            <div className="rounded-2xl border border-[#1c1c1c] divide-y divide-[#161616] overflow-hidden">
              {FIELDS.map(f => (
                <div key={f.name} className="px-4 py-3 grid grid-cols-[110px_1fr] gap-3">
                  <code className="font-gmono text-sm text-white">{f.name}</code>
                  <p className="text-sm text-[#9a9a9a]"><span className="font-gmono text-[0.7rem] text-[#555] mr-2">{f.type}</span>{f.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-white">Errors</h2>
            <div className="rounded-2xl border border-[#1c1c1c] px-4 py-3.5 grid grid-cols-[110px_1fr] gap-3">
              <code className="font-gmono text-sm text-white">429</code>
              <p className="text-sm text-[#9a9a9a]">Over 60 requests a minute. Wait for the <code className="font-gmono text-xs text-white">Retry-After</code> seconds and try again.</p>
            </div>
          </div>

          {/* Code */}
          <div className="lg:sticky lg:top-24 flex flex-col gap-4 min-w-0">
            <Panel
              title="Request"
              right={
                <div className="flex items-center gap-1">
                  {Object.keys(SNIPPETS).map(k => (
                    <button key={k} onClick={() => setLang(k)} className={`h-7 px-2.5 rounded-lg text-[0.7rem] ${lang === k ? 'bg-white text-black' : 'text-[#8a8a8a] hover:text-white'}`}>{k}</button>
                  ))}
                </div>
              }
            >
              <div className="relative">
                <pre className="overflow-x-auto p-4 pr-20 font-gmono text-[0.78rem] leading-relaxed text-[#d4d4d4]"><code>{SNIPPETS[lang]}</code></pre>
                <div className="absolute top-3 right-3"><CopyButton text={SNIPPETS[lang]} /></div>
              </div>
            </Panel>

            <Panel
              title={live ? `Live response · ${live.status} · ${live.ms}ms` : 'Example response'}
              right={
                <button onClick={tryIt} disabled={trying} className="btn-white h-7 px-3 text-[0.7rem]">
                  <RefreshIcon size={11} className={trying ? 'animate-spin' : ''} /> {live ? 'Run again' : 'Send request'}
                </button>
              }
            >
              <pre className="overflow-auto max-h-[420px] p-4 font-gmono text-[0.76rem] leading-relaxed"><code><Json text={live?.body ?? EXAMPLE_RESPONSE} /></code></pre>
            </Panel>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function DevelopersPage() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  )
}
