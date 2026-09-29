'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LoadstringBox from '@/components/LoadstringBox'
import ScriptPreview from '@/components/ScriptPreview'
import GamesMarquee, { type MarqueeGame } from '@/components/GamesMarquee'
import { ToastProvider } from '@/components/Toast'
import {
  DiscordIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshIcon,
  KeyOffIcon,
  TerminalIcon,
  GlobeIcon,
  CopyIcon,
  BoltIcon,
} from '@/components/Icons'
import { initializeStorage } from '@/lib/storage'

const steps = [
  { n: '01', title: 'Copy', body: 'Hit copy on the loadstring. That one line covers every supported game.' },
  { n: '02', title: 'Paste', body: 'Open your executor on PC or mobile and paste it into the editor.' },
  { n: '03', title: 'Execute', body: 'Join the game and run it. VoidHub detects the game and loads the right script.' },
]

const faqItems = [
  { q: 'Is VoidHub really free?', a: 'Yes. No paywall, no premium tier, no ads. Everything on the site is free.' },
  { q: 'Do I need a key?', a: 'No. VoidHub is fully keyless. The loadstring works the moment you run it.' },
  { q: 'Does it work on mobile?', a: 'Yes, on any mobile executor that supports loadstring and HttpGet. The Status page lists the executors we have tested.' },
  { q: 'Will I get banned?', a: 'Scripts are tested after every game update, but no script is ever 100% risk-free. Use an alt if you want zero risk.' },
  { q: 'How do updates work?', a: 'The loader always pulls the newest build. You never need to grab a new script after an update.' },
  { q: 'Can I request a game?', a: 'Yes. Post it in the Discord suggestions channel. The most requested games get built first.' },
]

export default function HomePage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')
  const [games, setGames] = useState<MarqueeGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [executors, setExecutors] = useState<number | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    initializeStorage()
    const t = setTimeout(() => setVisible(true), 60)

    fetch('/api/public/settings')
      .then(r => r.json())
      .then(d => d.discord && setDiscordLink(d.discord))
      .catch(() => {})

    fetch('/api/public/games')
      .then(r => r.json())
      .then(d => setGames(Array.isArray(d) ? d : []))
      .catch(() => setGames([]))
      .finally(() => setGamesLoading(false))

    fetch('/api/public/executors')
      .then(r => r.json())
      .then(d => setExecutors(Array.isArray(d) ? d.filter((e: { status?: string }) => e.status === 'supported').length : 0))
      .catch(() => setExecutors(0))

    return () => clearTimeout(t)
  }, [])

  const reveal = (delay = 0) => ({
    className: `transition-all duration-1000 ease-out ${visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-[2px]'}`,
    style: { transitionDelay: `${delay}ms` },
  })

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black overflow-x-hidden font-display">
        <Navbar />

        {/* Hero */}
        <section id="get" className="relative pt-32 md:pt-40 px-4 scroll-mt-24 mono-grain">
          <div className="absolute inset-0 mono-spot pointer-events-none" />
          <div className="absolute inset-0 mono-dots pointer-events-none" />

          <div className="relative max-w-3xl mx-auto flex flex-col items-center text-center">
            <div {...reveal(0)}>
              <img src="/logo.png" alt="VoidHub" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.35)]" />
            </div>

            <div {...reveal(80)}>
              <span className="mt-7 inline-flex items-center gap-2 h-7 px-3 rounded-full border border-[#262626] bg-white/[0.03] font-gmono text-[0.68rem] text-[#a3a3a3]">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-60" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                keyless · free · auto-updating
              </span>
            </div>

            <h1 {...reveal(160)}>
              <span className="block mt-6 font-semibold tracking-[-0.045em] leading-[0.95] text-[clamp(2.9rem,8vw,5.6rem)]">
                <span className="text-chrome">Scripts that</span>
                <br />
                <span className="text-fade">just work.</span>
              </span>
            </h1>

            <p {...reveal(240)}>
              <span className="block mt-6 text-[#8a8a8a] text-base md:text-lg max-w-md mx-auto leading-relaxed">
                One loadstring for every game VoidHub supports. No keys, no checkpoints, no ads.
              </span>
            </p>

            <div {...reveal(320)}>
              <div className="mt-9 w-[min(36rem,calc(100vw-2rem))]">
                <LoadstringBox />
              </div>
            </div>

            <div {...reveal(400)}>
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/games" className="btn-white h-11 px-6 text-sm w-full sm:w-auto">
                  Browse games <ChevronRightIcon size={15} />
                </Link>
                <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-11 px-6 text-sm w-full sm:w-auto">
                  <DiscordIcon size={16} /> Join the Discord
                </a>
              </div>
            </div>
          </div>

          <div {...reveal(520)}>
            <div className="relative max-w-5xl mx-auto mt-16 md:mt-20">
              <ScriptPreview />
            </div>
          </div>
        </section>

        <GamesMarquee games={games} loading={gamesLoading} discordLink={discordLink} />

        {/* Bento */}
        <section className="px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b] mb-2">Why VoidHub</p>
            <h2 className="font-semibold tracking-tight text-3xl md:text-4xl text-fade mb-8 max-w-lg">
              Built to stay out of your way.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* No keys, the big one */}
              <div className="mono-card md:col-span-4 p-7 md:p-8 overflow-hidden">
                <KeyOffIcon size={22} className="text-white" />
                <h3 className="mt-4 text-xl font-medium text-white">No keys. Ever.</h3>
                <p className="mt-1.5 text-sm text-[#8a8a8a] max-w-sm">Other hubs make you grind link shorteners for a key that expires tomorrow. We don&apos;t.</p>
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 font-gmono text-[0.72rem]">
                  <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
                    <p className="text-[#707070] mb-3">other hubs</p>
                    {['open key link', 'checkpoint 1 of 3', 'disable adblock', 'copy key · expires 24h'].map(x => (
                      <p key={x} className="py-1 text-[#707070] line-through decoration-[#707070]">{x}</p>
                    ))}
                  </div>
                  <div className="rounded-xl border border-[#333] bg-[#0f0f0f] p-4">
                    <p className="text-[#8a8a8a] mb-3">voidhub</p>
                    <p className="py-1 text-white">copy loadstring</p>
                    <p className="py-1 text-white">execute</p>
                    <p className="py-1 text-[#8a8a8a]">done<span className="caret">▍</span></p>
                  </div>
                </div>
              </div>

              <div className="mono-card md:col-span-2 p-7 flex flex-col">
                <TerminalIcon size={22} className="text-white" />
                <div className="mt-auto pt-10">
                  <div className="text-6xl font-semibold tracking-tighter text-chrome">{executors ?? '–'}</div>
                  <h3 className="mt-2 text-base font-medium text-white">Executors tested</h3>
                  <p className="mt-1 text-sm text-[#8a8a8a]">PC and mobile. Live list on the <Link href="/status" className="text-white underline underline-offset-4 decoration-[#444] hover:decoration-white">status page</Link>.</p>
                </div>
              </div>

              <div className="mono-card md:col-span-2 p-7">
                <RefreshIcon size={22} className="text-white" />
                <h3 className="mt-4 text-base font-medium text-white">Updates itself</h3>
                <p className="mt-1.5 text-sm text-[#8a8a8a]">The loader always pulls the newest build. Game updated? Just run it again.</p>
              </div>

              <div className="mono-card md:col-span-2 p-7">
                <GlobeIcon size={22} className="text-white" />
                <h3 className="mt-4 text-base font-medium text-white">One line, every game</h3>
                <p className="mt-1.5 text-sm text-[#8a8a8a]">VoidHub detects the game you&apos;re in and loads the right script for it.</p>
              </div>

              <div className="mono-card md:col-span-2 p-7">
                <BoltIcon size={22} className="text-white" />
                <h3 className="mt-4 text-base font-medium text-white">Lightweight</h3>
                <p className="mt-1.5 text-sm text-[#8a8a8a]">Clean Lua, no bloat. Your game runs as smooth with it as without it.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="px-4 pb-24">
          <div className="max-w-6xl mx-auto border-t border-[#1a1a1a] pt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
              {steps.map((s, i) => (
                <div key={s.n} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="font-gmono text-sm text-white">{s.n}</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-[#333] to-transparent" />
                    {i === 0 && <CopyIcon size={15} className="text-[#6b6b6b]" />}
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-[#8a8a8a] leading-relaxed max-w-xs">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
            <div>
              <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b] mb-2">FAQ</p>
              <h2 className="font-semibold tracking-tight text-3xl md:text-4xl text-fade">Questions, answered.</h2>
              <p className="mt-3 text-sm text-[#8a8a8a] max-w-xs">Anything else, ask in the Discord. Someone&apos;s always around.</p>
            </div>
            <div className="border-t border-[#1a1a1a]">
              {faqItems.map((item, idx) => {
                const open = expandedFaq === idx
                return (
                  <div key={item.q} className="border-b border-[#1a1a1a]">
                    <button
                      onClick={() => setExpandedFaq(open ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                      aria-expanded={open}
                    >
                      <span className={`text-[0.98rem] transition-colors ${open ? 'text-white' : 'text-[#bdbdbd] group-hover:text-white'}`}>{item.q}</span>
                      <ChevronDownIcon size={18} className={`shrink-0 text-[#6b6b6b] transition-transform duration-300 ${open ? 'rotate-180 text-white' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <p className="pb-5 pr-8 text-sm text-[#8a8a8a] leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="relative px-4 pt-24 pb-28 overflow-hidden border-t border-[#141414] mono-grain">
          <div className="absolute inset-0 mono-spot pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center">
            <img src="/logo.png" alt="" className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.35)]" />
            <h2 className="mt-8 font-semibold tracking-[-0.04em] leading-[1] text-[clamp(2.2rem,5.5vw,3.8rem)] text-chrome">
              Enter the void.
            </h2>
            <p className="mt-4 text-[#8a8a8a] max-w-sm">Copy, paste, execute. That&apos;s the whole setup.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/#get" className="btn-white h-11 px-6 text-sm">Get the script <ChevronRightIcon size={15} /></Link>
              <a href={discordLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-11 px-6 text-sm">
                <DiscordIcon size={16} /> Discord
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </ToastProvider>
  )
}
