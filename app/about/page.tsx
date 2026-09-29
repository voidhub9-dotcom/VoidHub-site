'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import { DiscordIcon, ChevronRightIcon, TerminalIcon, GlobeIcon, CodeIcon } from '@/components/Icons'

const zeros = [
  { n: '0', label: 'keys to grind' },
  { n: '0', label: 'ads or shorteners' },
  { n: '0', label: 'accounts needed' },
  { n: '1', label: 'loadstring for everything' },
]

const principles = [
  { title: 'Free means free.', body: 'No key system, no checkpoints, no premium tier hiding the good stuff. If it is on VoidHub, you can run it.' },
  { title: 'It should just work.', body: 'Scripts are re-tested after game updates. When something breaks, the Status page says so before you have to ask.' },
  { title: 'You pick what we build.', body: 'New games come from Discord requests. The most wanted ones go to the front of the line.' },
  { title: 'Nothing to update.', body: 'The loader always serves the newest build. The line you copied today still works next month.' },
]

const flow = [
  { icon: TerminalIcon, title: 'Your executor', body: 'runs the one-line loadstring' },
  { icon: GlobeIcon, title: 'VoidHub loader', body: 'reads which game you are in' },
  { icon: CodeIcon, title: 'The right script', body: 'loads, always the latest build' },
]

export default function AboutPage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')
  const [stats, setStats] = useState<{ games: number; executors: number } | null>(null)

  useEffect(() => {
    fetch('/api/public/settings').then(r => r.json()).then(d => d?.discord && setDiscordLink(d.discord)).catch(() => {})
    Promise.all([
      fetch('/api/public/games').then(r => r.json()).catch(() => []),
      fetch('/api/public/executors').then(r => r.json()).catch(() => []),
    ]).then(([g, e]) => setStats({
      games: Array.isArray(g) ? g.length : 0,
      executors: Array.isArray(e) ? e.filter((x: { status?: string }) => x.status === 'supported').length : 0,
    }))
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black font-display">
        <Navbar />

        {/* Statement */}
        <section className="relative px-4 pt-28 md:pt-40 pb-16 md:pb-24 mono-grain overflow-hidden">
          <div className="absolute inset-0 mono-spot pointer-events-none" />
          <div className="absolute inset-0 mono-dots pointer-events-none" />
          <img src="/logo.png" alt="" aria-hidden="true" className="hidden md:block absolute right-[-60px] top-24 w-[420px] h-[420px] object-contain opacity-[0.07] pointer-events-none" />
          <div className="relative max-w-6xl mx-auto">
            <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">About VoidHub</p>
            <h1 className="mt-5 max-w-4xl font-semibold tracking-[-0.05em] leading-[0.95] text-[clamp(2.6rem,7.5vw,5.8rem)]">
              <span className="text-chrome">We built the script hub</span>{' '}
              <span className="text-fade">we wanted to use.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base md:text-lg text-[#8a8a8a] leading-relaxed">
              Every other hub made you click through ten ads for a key that expired tomorrow. So we made one that doesn&apos;t.
              One line, every game, free. That&apos;s the whole idea.
            </p>
          </div>
        </section>

        {/* The zeros */}
        <section className="px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 border-y border-[#1a1a1a]">
            {zeros.map((z, i) => (
              <div key={z.label} className={`py-8 md:py-10 px-2 md:px-6 ${i % 2 ? 'border-l border-[#1a1a1a]' : ''} ${i > 1 ? 'border-t md:border-t-0 border-[#1a1a1a]' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
                <p className="text-6xl md:text-7xl font-semibold tracking-tighter text-chrome leading-none">{z.n}</p>
                <p className="mt-3 text-sm text-[#8a8a8a]">{z.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="px-4 py-20 md:py-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
            <div>
              <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">What we stand for</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-fade">Four rules we don&apos;t break.</h2>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
              {principles.map((p, i) => (
                <li key={p.title}>
                  <span className="font-gmono text-sm text-[#555]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{p.title}</h3>
                  <p className="mt-2 text-sm text-[#8a8a8a] leading-relaxed">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How the loader works */}
        <section className="px-4 pb-20 md:pb-28">
          <div className="max-w-6xl mx-auto mono-card overflow-hidden p-6 md:p-12">
            <div className="absolute inset-0 mono-dots opacity-40 pointer-events-none" />
            <div className="relative">
              <p className="font-gmono text-[0.7rem] uppercase tracking-[0.2em] text-[#6b6b6b]">Under the hood</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white">How one line runs every game</h2>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 items-stretch">
                {flow.map((f, i) => (
                  <div key={f.title} className="relative flex md:flex-col items-center md:items-start gap-4 md:gap-0">
                    <div className="relative z-10 w-14 h-14 rounded-2xl bg-black border border-[#2a2a2a] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.06)]">
                      <f.icon size={20} className="text-white" />
                    </div>
                    {i < flow.length - 1 && (
                      <>
                        <span className="hidden md:block absolute top-7 left-14 right-0 h-px bg-gradient-to-r from-[#444] to-[#1a1a1a]" />
                        <span className="md:hidden absolute left-7 top-14 h-4 w-px bg-[#333]" />
                      </>
                    )}
                    <div className="md:mt-5 md:pr-8">
                      <p className="text-base font-medium text-white">{f.title}</p>
                      <p className="text-sm text-[#8a8a8a]">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-[#1a1a1a] flex flex-wrap gap-x-10 gap-y-3 font-gmono text-sm">
                <span className="text-[#6b6b6b]">games <span className="text-white">{stats ? stats.games : '–'}</span></span>
                <span className="text-[#6b6b6b]">executors tested <span className="text-white">{stats ? stats.executors : '–'}</span></span>
                <span className="text-[#6b6b6b]">data collected <span className="text-white">none</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="px-4 pb-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={discordLink} target="_blank" rel="noopener noreferrer" className="group mono-card p-8 md:p-10 flex flex-col justify-between min-h-[220px] hover:!border-[#333]">
              <DiscordIcon size={28} className="text-white" />
              <div>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight text-white">Join the community</h3>
                <p className="mt-1 text-sm text-[#8a8a8a]">Request games, report bugs, get help. Someone&apos;s always around.</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-white">Open Discord <ChevronRightIcon size={14} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </a>
            <Link href="/games" className="group mono-card p-8 md:p-10 flex flex-col justify-between min-h-[220px] hover:!border-[#333]">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <div>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight text-white">See what&apos;s supported</h3>
                <p className="mt-1 text-sm text-[#8a8a8a]">Every game, live player counts, one script.</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-white">Browse games <ChevronRightIcon size={14} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </ToastProvider>
  )
}
