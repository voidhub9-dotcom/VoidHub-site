'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import { ChevronDownIcon, DiscordIcon, SearchIcon, XIcon, ChevronRightIcon } from '@/components/Icons'

type Category = 'getting-started' | 'scripts' | 'executors' | 'safety'

interface Faq {
  q: string
  a: string
  category: Category
}

const faqs: Faq[] = [
  {
    q: 'How do I use the script?',
    a: 'Copy the loadstring from the home page or any game on the Games page, paste it into your executor while in a supported Roblox game, and execute it. The loader automatically detects which game you are in and loads the right script.',
    category: 'getting-started',
  },
  {
    q: 'Do I need a key to use VoidHub?',
    a: 'No. VoidHub is fully keyless. Copy the loadstring, execute it, and you are in.',
    category: 'getting-started',
  },
  {
    q: 'Is VoidHub free?',
    a: 'Yes, 100% free forever. No subscription, no premium tier, no key system.',
    category: 'getting-started',
  },
  {
    q: 'Why does the same loadstring work for every game?',
    a: 'The universal loader detects the game you are playing by its Place ID and automatically serves the matching script. One loadstring covers the entire catalog — no need to copy a different script per game.',
    category: 'scripts',
  },
  {
    q: 'The script is not working. What should I do?',
    a: 'First check the Status page to see if the script for your game is marked as Working. If it is marked Updating, we are already on it. If it shows Working but still fails, make sure your executor is up to date, then report the issue in our Discord.',
    category: 'scripts',
  },
  {
    q: 'How often are scripts updated?',
    a: 'Scripts update automatically through the loader, so you always execute the latest version without changing anything. When a game update breaks a script, we mark it as Updating on the Status page and push a fix as fast as possible.',
    category: 'scripts',
  },
  {
    q: 'Can I request a new game?',
    a: 'Yes! Join our Discord and drop your suggestion in the game requests channel. The most requested games get prioritized.',
    category: 'scripts',
  },
  {
    q: 'Which executors are supported?',
    a: 'The Status page has the live list: which executors work with VoidHub right now, whether each one is updated for the current Roblox version, the platform and whether it is free.',
    category: 'executors',
  },
  {
    q: 'My executor is not on the list. Will it work?',
    a: 'Maybe — any executor with a working loadstring + HttpGet implementation should run the loader. But we only guarantee the ones on the Status page. If yours is unsupported, we recommend switching to one from the supported list.',
    category: 'executors',
  },
  {
    q: 'Is it safe to use?',
    a: 'Every script is tested before release and the loader is served through a protected endpoint. That said, using any script in Roblox carries inherent risk of moderation action — use an alt account if you are concerned.',
    category: 'safety',
  },
  {
    q: 'Will I get banned for using this?',
    a: 'No script is 100% ban-proof — that is true for every script hub. Our scripts avoid the most detectable patterns, but Roblox moderation always carries some risk. Play smart and consider using an alt account.',
    category: 'safety',
  },
  {
    q: 'Do you collect any of my data?',
    a: 'No. VoidHub has no accounts, no tracking scripts on the loader, and collects zero personal data. The loader endpoint only serves the script.',
    category: 'safety',
  },
]

const topics: { id: Category; label: string; blurb: string }[] = [
  { id: 'getting-started', label: 'Getting started', blurb: 'Copy, paste, execute' },
  { id: 'scripts', label: 'Scripts', blurb: 'Games, updates, requests' },
  { id: 'executors', label: 'Executors', blurb: 'What runs VoidHub' },
  { id: 'safety', label: 'Safety', blurb: 'Bans, data, risk' },
]

function Row({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#171717] last:border-b-0">
      <button onClick={onToggle} aria-expanded={open} className="group w-full flex items-center justify-between gap-4 px-5 py-5 text-left">
        <span className={`text-[0.98rem] transition-colors ${open ? 'text-white' : 'text-[#c4c4c4] group-hover:text-white'}`}>{faq.q}</span>
        <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all ${open ? 'bg-white border-white text-black rotate-180' : 'border-[#2a2a2a] text-[#8a8a8a]'}`}>
          <ChevronDownIcon size={14} />
        </span>
      </button>
      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pr-14 text-sm text-[#9a9a9a] leading-relaxed">{faq.a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqPage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<Category | 'all'>('all')
  const [open, setOpen] = useState<string | null>(faqs[0]?.q ?? null)

  useEffect(() => {
    fetch('/api/public/settings').then(r => r.json()).then(d => d?.discord && setDiscordLink(d.discord)).catch(() => {})
  }, [])

  const q = query.trim().toLowerCase()
  const groups = useMemo(() => topics
    .filter(t => topic === 'all' || t.id === topic)
    .map(t => ({
      ...t,
      items: faqs.filter(f => f.category === t.id && (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))),
    }))
    .filter(g => g.items.length), [topic, q])

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const chip = (on: boolean) =>
    `shrink-0 h-9 px-4 rounded-full text-[0.82rem] whitespace-nowrap transition-colors ${on ? 'bg-white text-black' : 'border border-[#262626] text-[#a3a3a3] hover:text-white'}`

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black font-display">
        <Navbar />

        <section className="relative px-4 pt-28 md:pt-36 pb-10 mono-grain">
          <div className="absolute inset-0 mono-spot pointer-events-none" />
          <div className="absolute inset-0 mono-dots pointer-events-none" />
          <div className="relative max-w-6xl mx-auto">
            <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">Help center</p>
            <h1 className="mt-4 font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.4rem,6vw,4.4rem)] text-chrome">
              How can we help?
            </h1>
            <div className="relative mt-8 max-w-xl">
              <SearchIcon size={17} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search: executor, mobile, banned…"
                aria-label="Search the FAQ"
                className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#0a0a0a] border border-[#262626] text-white text-[16px] placeholder:text-[#555] focus:outline-none focus:border-[#555] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)] transition-all"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear" className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-[#8a8a8a] hover:text-white hover:bg-white/10">
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        <main className="px-4 pb-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12 items-start">
            {/* Topics: sidebar on desktop, swipeable chips on phones */}
            <aside className="lg:sticky lg:top-28">
              <div className="flex lg:hidden gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                <button onClick={() => setTopic('all')} className={chip(topic === 'all')}>All</button>
                {topics.map(t => <button key={t.id} onClick={() => setTopic(t.id)} className={chip(topic === t.id)}>{t.label}</button>)}
              </div>
              <nav className="hidden lg:flex flex-col gap-1">
                {[{ id: 'all' as const, label: 'Everything', blurb: `${faqs.length} answers` }, ...topics].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTopic(t.id)}
                    className={`text-left px-4 py-3 rounded-2xl transition-colors ${topic === t.id ? 'bg-white text-black' : 'text-[#a3a3a3] hover:bg-white/[0.04] hover:text-white'}`}
                  >
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className={`block text-xs ${topic === t.id ? 'text-black/55' : 'text-[#555]'}`}>{t.blurb}</span>
                  </button>
                ))}
              </nav>
              <a href={discordLink} target="_blank" rel="noopener noreferrer" className="hidden lg:flex mt-6 mono-card p-4 items-center gap-3 hover:!border-[#333]">
                <span className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shrink-0"><DiscordIcon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm text-white">Still stuck?</span>
                  <span className="block text-xs text-[#6b6b6b]">Ask in the Discord</span>
                </span>
              </a>
            </aside>

            <div className="flex flex-col gap-10 min-w-0">
              {q && <p className="font-gmono text-xs text-[#6b6b6b]">{total} {total === 1 ? 'answer' : 'answers'} for “{query.trim()}”</p>}
              {groups.map(g => (
                <section key={g.id}>
                  <h2 className="mb-3 flex items-baseline gap-3">
                    <span className="text-xl font-semibold tracking-tight text-white">{g.label}</span>
                    <span className="font-gmono text-xs text-[#555]">{g.items.length}</span>
                  </h2>
                  <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
                    {g.items.map(f => (
                      <Row key={f.q} faq={f} open={open === f.q} onToggle={() => setOpen(open === f.q ? null : f.q)} />
                    ))}
                  </div>
                </section>
              ))}
              {!groups.length && (
                <div className="mono-card py-14 text-center">
                  <p className="text-white">No answers for that.</p>
                  <p className="mt-1 text-sm text-[#6b6b6b]">Try different words, or just ask us.</p>
                  <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-white h-10 px-5 mt-5 text-sm"><DiscordIcon size={15} /> Ask in Discord</a>
                </div>
              )}

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-white">Script not working?</h2>
                  <p className="mt-1 text-sm text-[#8a8a8a]">Check if it&apos;s already being patched, and which executors are ready right now.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href="/status" className="btn-white h-11 px-5 text-sm">Status page <ChevronRightIcon size={14} /></Link>
                  <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-11 px-5 text-sm"><DiscordIcon size={15} /> Discord</a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ToastProvider>
  )
}
