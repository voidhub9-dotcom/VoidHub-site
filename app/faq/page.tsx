'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import {
  ChevronDownIcon,
  DiscordIcon,
  SearchIcon,
  BoltIcon,
  ShieldIcon,
  TerminalIcon,
  HelpIcon,
  CloseIcon,
} from '@/components/Icons'

type Category = 'all' | 'getting-started' | 'scripts' | 'executors' | 'safety'

interface Faq {
  q: string
  a: string
  category: Exclude<Category, 'all'>
}

const faqs: Faq[] = [
  {
    q: 'How do I use the script?',
    a: 'Copy the universal loadstring from any game card on the Games page, paste it into your executor while in a supported Roblox game, and execute it. The loader automatically detects which game you are in and loads the right script.',
    category: 'getting-started',
  },
  {
    q: 'Do I need a key to use VoidHub?',
    a: 'No. VoidHub is completely keyless. There are no key systems, link shorteners, checkpoints, or ads. Copy the loadstring, execute it, and you are in.',
    category: 'getting-started',
  },
  {
    q: 'Is VoidHub free?',
    a: 'Yes, 100% free — forever. There are no premium tiers, subscriptions, or paid features. Everything on the site is available to everyone.',
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
    a: 'VoidHub works with Potassium, Seliware, Madium, Cosmic, Macsploit, Volt, Delta, Codex, Wave, and Real. Xeno, Solara, Velocity, Ronix, and Arceus X are NOT supported. Check the Status page for the live compatibility list.',
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

const categories: { id: Category; label: string; icon: typeof BoltIcon }[] = [
  { id: 'all', label: 'All', icon: HelpIcon },
  { id: 'getting-started', label: 'Getting Started', icon: BoltIcon },
  { id: 'scripts', label: 'Scripts', icon: TerminalIcon },
  { id: 'executors', label: 'Executors', icon: TerminalIcon },
  { id: 'safety', label: 'Safety', icon: ShieldIcon },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`bg-black-card border rounded-xl transition-all duration-200 ${
        open ? 'border-silver-faint shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-border-dim hover:border-silver-faint'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
            open ? 'border-success/40 bg-success/10 text-success' : 'border-border-mid text-silver-muted'
          }`}
        >
          <span className="font-heading text-[0.65rem]">{String(index + 1).padStart(2, '0')}</span>
        </span>
        <span className={`flex-1 font-body text-sm transition-colors duration-200 ${open ? 'text-white' : 'text-silver-light'}`}>
          {q}
        </span>
        <ChevronDownIcon
          size={18}
          className={`text-silver-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pl-16 font-body text-sm text-silver-mid leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqPage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => { if (data?.discord) setDiscordLink(data.discord) })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    let list = faqs
    if (category !== 'all') list = list.filter(f => f.category === category)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    }
    return list
  }, [query, category])

  const countFor = (id: Category) =>
    id === 'all' ? faqs.length : faqs.filter(f => f.category === id).length

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />
        <main className="pt-24 pb-20 px-4">
          <div className="max-w-3xl mx-auto">

            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-mid bg-black-card px-4 py-1.5 mb-5">
                <HelpIcon size={13} className="text-silver-muted" />
                <span className="font-body text-xs text-silver-muted tracking-wider">HELP CENTER</span>
              </div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-white mb-3 text-balance">
                FREQUENTLY ASKED QUESTIONS
              </h1>
              <p className="font-body text-silver-mid text-sm md:text-base text-pretty">
                Everything you need to know about using VoidHub. Search or browse by topic.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-5">
              <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-muted pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search questions… e.g. key, executor, banned"
                aria-label="Search FAQ"
                className="w-full bg-black-card border border-border-dim rounded-xl pl-11 pr-10 py-3.5 font-body text-sm text-white placeholder:text-silver-faint focus:outline-none focus:border-silver-faint focus:shadow-[0_0_15px_rgba(255,255,255,0.06)] transition-all duration-200"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-silver-muted hover:text-white transition-colors"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 font-body text-xs transition-all duration-200 ${
                    category === cat.id
                      ? 'border-white bg-white text-black'
                      : 'border-border-dim text-silver-muted hover:border-silver-faint hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[0.65rem] ${category === cat.id ? 'text-black/60' : 'text-silver-faint'}`}>
                    {countFor(cat.id)}
                  </span>
                </button>
              ))}
            </div>

            {/* FAQ list */}
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-3 mb-16">
                {filtered.map((item, idx) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} index={idx} />
                ))}
              </div>
            ) : (
              <div className="bg-black-card border border-border-dim rounded-xl p-10 text-center mb-16">
                <SearchIcon size={28} className="mx-auto text-silver-faint mb-3" />
                <p className="font-body text-sm text-silver-mid mb-1">
                  No results for <span className="text-white">&quot;{query}&quot;</span>
                </p>
                <p className="font-body text-xs text-silver-muted">
                  Try different keywords, or ask directly in the Discord below.
                </p>
              </div>
            )}

            {/* Still need help */}
            <div className="relative overflow-hidden bg-black-card border border-border-mid rounded-xl p-8 md:p-10 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.04),transparent_70%)]" aria-hidden="true" />
              <div className="relative">
                <h2 className="font-heading text-lg text-white mb-2">STILL HAVE A QUESTION?</h2>
                <p className="font-body text-silver-mid text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Our community and staff are active every day. Ask anything in the Discord and get a fast answer.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={discordLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <DiscordIcon size={18} />
                    <span>ASK IN DISCORD</span>
                  </a>
                  <Link
                    href="/status"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-silver-faint text-silver-mid rounded-lg font-body text-sm transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
                  >
                    <BoltIcon size={16} />
                    <span>CHECK SCRIPT STATUS</span>
                  </Link>
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
