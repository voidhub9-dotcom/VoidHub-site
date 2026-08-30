'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import {
  ShieldIcon,
  BoltIcon,
  UsersIcon,
  RefreshIcon,
  DiscordIcon,
  CopyIcon,
  TerminalIcon,
  SparkleIcon,
  KeyOffIcon,
  GlobeIcon,
  CheckIcon,
} from '@/components/Icons'

interface Stats {
  games: number
  workingGames: number
  executors: number
}

const values = [
  {
    icon: ShieldIcon,
    title: 'Safety First',
    body: "Every script is tested extensively before release, and the loader is served through a protected endpoint. Your account's safety is our top priority.",
    accent: 'success' as const,
  },
  {
    icon: KeyOffIcon,
    title: 'Keyless Forever',
    body: 'No key systems, no link shorteners, no checkpoints, no ads. Copy the loadstring, execute, done. That will never change.',
    accent: 'info' as const,
  },
  {
    icon: UsersIcon,
    title: 'Community Driven',
    body: 'Every game we add is voted on by the community. You request it, we build it. The most wanted games always get prioritized.',
    accent: 'warning' as const,
  },
  {
    icon: RefreshIcon,
    title: 'Always Up To Date',
    body: 'Scripts auto-update through the universal loader. You never change your loadstring — the latest version loads every single time.',
    accent: 'success' as const,
  },
]

const steps = [
  {
    icon: CopyIcon,
    step: '01',
    title: 'Copy the loadstring',
    body: 'Grab the universal loadstring from any game card. One loadstring covers the entire catalog.',
  },
  {
    icon: TerminalIcon,
    step: '02',
    title: 'Paste into your executor',
    body: 'Join a supported Roblox game, open your executor, and paste the loadstring.',
  },
  {
    icon: SparkleIcon,
    step: '03',
    title: 'Execute and play',
    body: 'The loader detects your game by Place ID and serves the matching script automatically.',
  },
]

export default function AboutPage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')
  const [stats, setStats] = useState<Stats>({ games: 0, workingGames: 0, executors: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)

    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => { if (data?.discord) setDiscordLink(data.discord) })
      .catch(() => {})

    Promise.all([
      fetch('/api/public/games').then(r => r.json()).catch(() => []),
      fetch('/api/public/executors').then(r => r.json()).catch(() => []),
    ]).then(([games, executors]) => {
      const gameList = Array.isArray(games) ? games : []
      const execList = Array.isArray(executors) ? executors : []
      setStats({
        games: gameList.length,
        workingGames: gameList.filter((g: { status?: string }) => g.status === 'active').length,
        executors: execList.filter((e: { status?: string }) => e.status === 'supported').length,
      })
    })
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />

        <main className="pt-24 pb-20 px-4">
          <div className="max-w-5xl mx-auto">

            {/* ── Hero ─────────────────────────────────────────────── */}
            <div
              className={`text-center mb-12 transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="font-body text-xs text-success tracking-wider">FREE. KEYLESS. NO LIMITS.</span>
              </div>
              <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] text-white mb-4 text-balance">
                BUILT FOR THE COMMUNITY
              </h1>
              <p className="font-body text-silver-mid text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-pretty">
                VoidHub exists for one reason — every Roblox player deserves powerful,
                free, keyless scripts without paywalls, key systems, or sketchy websites.
              </p>
            </div>

            {/* ── Live stats strip ─────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-20">
              <StatTile value={stats.games > 0 ? String(stats.games) : '—'} label="Games Supported" />
              <StatTile value={stats.workingGames > 0 ? String(stats.workingGames) : '—'} label="Scripts Working" accent />
              <StatTile value={stats.executors > 0 ? String(stats.executors) : '—'} label="Executors Supported" />
              <StatTile value="100%" label="Free Forever" accent />
            </div>

            {/* ── How it works ─────────────────────────────────────── */}
            <div className="mb-20">
              <div className="text-center mb-10">
                <h2 className="font-heading text-2xl text-white mb-2">HOW IT WORKS</h2>
                <p className="font-body text-sm text-silver-muted">Three steps. Under a minute. No keys.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((s, idx) => {
                  const Icon = s.icon
                  return (
                    <div
                      key={s.step}
                      className="relative bg-black-card border border-border-dim rounded-xl p-6 transition-all duration-300 hover:border-silver-faint hover:-translate-y-1"
                      style={{ transitionDelay: `${idx * 60}ms` }}
                    >
                      <span className="absolute top-5 right-6 font-heading text-3xl text-border-mid select-none">
                        {s.step}
                      </span>
                      <div className="w-11 h-11 rounded-lg border border-border-mid bg-black-surface flex items-center justify-center mb-4">
                        <Icon size={20} className="text-silver-base" />
                      </div>
                      <h3 className="font-heading text-sm text-white mb-2">{s.title}</h3>
                      <p className="font-body text-sm text-silver-mid leading-relaxed">{s.body}</p>
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-8">
                <Link
                  href="/games"
                  className="btn-primary"
                >
                  <GlobeIcon size={16} />
                  <span>BROWSE THE GAMES</span>
                </Link>
              </div>
            </div>

            {/* ── What we stand for ────────────────────────────────── */}
            <div className="mb-20">
              <div className="text-center mb-10">
                <h2 className="font-heading text-2xl text-white mb-2">WHAT WE STAND FOR</h2>
                <p className="font-body text-sm text-silver-muted">The rules we never break.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {values.map(value => {
                  const Icon = value.icon
                  const accentClasses = {
                    success: 'group-hover:border-success/40 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.08)]',
                    info: 'group-hover:border-info/40 group-hover:shadow-[0_0_20px_rgba(51,153,255,0.08)]',
                    warning: 'group-hover:border-warning/40 group-hover:shadow-[0_0_20px_rgba(255,204,0,0.08)]',
                  }[value.accent]
                  const iconAccent = {
                    success: 'text-success border-success/30 bg-success/5',
                    info: 'text-info border-info/30 bg-info/5',
                    warning: 'text-warning border-warning/30 bg-warning/5',
                  }[value.accent]
                  return (
                    <div
                      key={value.title}
                      className={`group bg-black-card border border-border-dim rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 ${accentClasses}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${iconAccent}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-heading text-sm text-white mb-2">{value.title}</h3>
                          <p className="font-body text-sm text-silver-mid leading-relaxed">{value.body}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── The promise ──────────────────────────────────────── */}
            <div className="bg-black-card border border-border-mid rounded-xl p-8 md:p-10 mb-20">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <h2 className="font-heading text-xl text-white mb-4">THE VOIDHUB PROMISE</h2>
                  <p className="font-body text-silver-light text-[0.95rem] leading-relaxed mb-4">
                    We believe great tools should be accessible to everyone — not just those
                    willing to pay or click through five link shorteners. That belief is the
                    foundation of everything we build.
                  </p>
                  <p className="font-body text-silver-light text-[0.95rem] leading-relaxed">
                    Scripts are regularly updated, tested for safety, and optimized for
                    performance. When a game update breaks something, the Status page tells you
                    instantly, and a fix ships as fast as humanly possible.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                  {['No key systems, ever', 'No paywalls or premium tiers', 'No link shorteners or ads', 'No data collection'].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full border border-success/40 bg-success/10 flex items-center justify-center shrink-0">
                        <CheckIcon size={11} className="text-success" />
                      </span>
                      <span className="font-body text-sm text-silver-light">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Discord CTA ──────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-black-card border border-border-mid rounded-xl p-8 md:p-12 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.04),transparent_70%)]" aria-hidden="true" />
              <div className="relative">
                <DiscordIcon size={40} className="mx-auto text-white mb-5" />
                <h2 className="font-heading text-xl text-white mb-3">JOIN THE COMMUNITY</h2>
                <p className="font-body text-silver-mid text-sm mb-7 max-w-md mx-auto leading-relaxed">
                  Get support, vote on the next game, report issues, and be the first to hear
                  about updates. The community is active every single day.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={discordLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary !px-8"
                  >
                    <DiscordIcon size={18} />
                    <span>JOIN THE DISCORD</span>
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

function StatTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-5 text-center transition-all duration-300 hover:-translate-y-0.5 ${
        accent ? 'border-success/25 bg-success/5' : 'border-border-dim bg-black-card'
      }`}
    >
      <p className={`font-heading text-3xl mb-1 ${accent ? 'text-success' : 'text-white'}`}>{value}</p>
      <p className="font-body text-xs text-silver-muted tracking-wider uppercase">{label}</p>
    </div>
  )
}
