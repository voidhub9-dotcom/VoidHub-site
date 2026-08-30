'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LoadstringBox from '@/components/LoadstringBox'
import AnimatedLogo from '@/components/AnimatedLogo'
import { ToastProvider } from '@/components/Toast'
import {
  DiscordIcon,
  GamesIcon,
  ChevronDownIcon,
  BoltIcon,
  KeyOffIcon,
  UsersIcon,
  RefreshIcon,
  ShieldIcon,
  CodeIcon,
  GlobeIcon,
  ShopIcon,
  CartIcon,
} from '@/components/Icons'
import { getDiscordLink, getTagline, initializeStorage } from '@/lib/storage'

const whyCards = [
  {
    icon: ShieldIcon,
    title: 'Undetected Scripts',
    body: "Every script is regularly tested and updated to stay undetected. We prioritize your account's safety above all.",
  },
  {
    icon: BoltIcon,
    title: 'Zero Key System',
    body: 'No keys, no checkpoints, no waiting. Paste the loadstring and execute — it just works, every time.',
  },
  {
    icon: CodeIcon,
    title: 'Optimized Code',
    body: 'Lightweight, clean Lua scripts that run without lag. No bloat, no unnecessary processes slowing your game.',
  },
  {
    icon: RefreshIcon,
    title: 'Auto-Updating',
    body: 'Scripts update automatically through the loader. You always get the latest version without doing anything.',
  },
  {
    icon: GlobeIcon,
    title: 'Multi-Game Support',
    body: 'Covering the most popular Roblox games with new games being added regularly based on community votes.',
  },
  {
    icon: UsersIcon,
    title: 'Community Driven',
    body: 'Join our Discord to suggest games, report bugs, get help, and connect with thousands of members.',
  },
]

const faqItems = [
  {
    q: 'Is VoidHub really free?',
    a: 'Yes — completely. VoidHub has no key system, no premium tier, and no paywalls of any kind. Every script is free forever. Just paste the loadstring and execute.',
  },
  {
    q: 'Do scripts work on mobile?',
    a: 'Most VoidHub scripts are compatible with popular Android executors. iOS support depends on the executor you use. Check our Discord for executor recommendations.',
  },
  {
    q: 'Will I get banned for using these scripts?',
    a: 'Every script is built with safety in mind and tested regularly to minimize detection. While no script is ever 100% risk-free, we do everything possible to keep things safe.',
  },
  {
    q: 'How do scripts stay updated?',
    a: 'Scripts update automatically through the loader. When you run the loadstring, you always receive the latest version. No manual updates needed.',
  },
  {
    q: 'How do I get help if something breaks?',
    a: 'Join our Discord server and head to the #support channel. Our community and team will get you sorted quickly.',
  },
  {
    q: 'How often are new games added?',
    a: 'New game scripts are added regularly. Join the Discord and vote in #game-suggestions to influence what we build next.',
  },
  {
    q: 'What executor should I use?',
    a: 'We recommend popular executors like Delta, Solara, or Fluxus for free options. Any executor that supports the loadstring function will work.',
  },
]

export default function HomePage() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')
  const [tagline, setTagline] = useState('Free. Keyless. No Limits.')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [titleVisible, setTitleVisible] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const [heroStats, setHeroStats] = useState({ games: 0, executors: 0 })

  useEffect(() => {
    initializeStorage()

    const loadPublicSettings = async () => {
      try {
        const res = await fetch('/api/public/settings')
        const data = await res.json()
        setDiscordLink(data.discord)
        setTagline(data.tagline)
      } catch (e) {
        console.error('Failed to load settings:', e)
        setDiscordLink(getDiscordLink())
        setTagline(getTagline())
      }
    }
    loadPublicSettings()

    Promise.all([
      fetch('/api/public/games').then(r => r.json()).catch(() => []),
      fetch('/api/public/executors').then(r => r.json()).catch(() => []),
    ]).then(([games, executors]) => {
      setHeroStats({
        games: Array.isArray(games) ? games.length : 0,
        executors: Array.isArray(executors) ? executors.filter((e: { status?: string }) => e.status === 'supported').length : 0,
      })
    })

    // Title animation
    setTimeout(() => setTitleVisible(true), 200)

    // Glitch animation
    const glitchTimeout = setTimeout(() => {
      setGlitching(true)
      setTimeout(() => setGlitching(false), 500)
    }, 3000)

    const glitchInterval = setInterval(() => {
      setGlitching(true)
      setTimeout(() => setGlitching(false), 500)
    }, 8000)

    return () => {
      clearTimeout(glitchTimeout)
      clearInterval(glitchInterval)
    }
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />

        {/* Hero Section — product-first: copy + live preview, not a splash screen */}
        <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24 px-4">
          <div className="absolute inset-0 hero-grid opacity-50" />
          <div className="absolute top-10 -left-16 w-72 h-72 bg-[rgba(0,255,204,0.08)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-[rgba(168,85,247,0.08)] rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
            {/* Left — copy */}
            <div
              className={`
                text-center lg:text-left
                transition-all duration-700
                ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
              `}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black-card border border-border-dim rounded-full mb-6">
                <AnimatedLogo
                  src="/logo.png"
                  alt="VoidHub"
                  size={16}
                  playIntro={false}
                />
                <span className="font-body text-xs text-silver-mid tracking-wide">{tagline}</span>
              </div>

              <h1
                className={`
                  font-heading text-white leading-[1.05] tracking-wide text-balance
                  text-[clamp(2.25rem,4.5vw,3.75rem)]
                  ${glitching ? 'animate-glitch' : ''}
                `}
              >
                Free Roblox Scripts.
                <br />
                <span className="text-glow">Zero Keys.</span> Zero Waiting.
              </h1>

              <p className="mt-5 font-body text-silver-mid text-base md:text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed text-pretty">
                One universal loadstring covers every supported game. No key systems, no link
                shorteners, no paywalls — copy it, paste it, execute.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <a
                  href={discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !h-11 !py-0 !rounded-lg"
                >
                  <DiscordIcon size={18} />
                  <span>JOIN DISCORD</span>
                </a>
                <Link
                  href="/games"
                  className="
                    h-11 flex items-center justify-center gap-2 px-6
                    border border-silver-faint text-silver-mid rounded-lg font-body text-sm
                    transition-all duration-200 hover:border-white hover:text-white
                  "
                >
                  <GamesIcon size={18} />
                  <span>VIEW GAMES</span>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="stat-pill">
                  <GamesIcon size={13} />
                  {heroStats.games || '—'} Games
                </span>
                <span className="stat-pill">
                  <BoltIcon size={13} className="text-success" />
                  {heroStats.executors || '—'} Executors
                </span>
                <span className="stat-pill">
                  <KeyOffIcon size={13} className="text-cyber" />
                  100% Free
                </span>
              </div>
            </div>

            {/* Right — live product preview */}
            <div
              className={`
                relative
                transition-all duration-700 delay-200
                ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
              `}
            >
              <div className="relative void-card overflow-hidden max-w-[480px] mx-auto lg:mx-0">
                {/* window title bar */}
                <div className="flex items-center gap-2 px-4 h-10 border-b border-border-dim bg-black-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-code text-[0.7rem] text-silver-muted">
                    loader.lua — connected
                  </span>
                </div>
                <div className="p-5">
                  <LoadstringBox />
                  <div className="mt-4 flex items-center gap-2 font-code text-xs text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span>Ready — executor detected</span>
                  </div>
                </div>
              </div>

              {/* floating chips */}
              <div
                className="hidden md:flex absolute -top-5 -right-4 items-center gap-2 px-3 py-2 bg-black-card border border-border-mid rounded-xl shadow-lg animate-float"
              >
                <ShieldIcon size={14} className="text-success" />
                <span className="font-body text-xs text-silver-light whitespace-nowrap">Undetected</span>
              </div>
              <Link
                href="/shop"
                className="hidden md:flex absolute -bottom-6 -left-6 items-center gap-2 px-3.5 py-2.5 price-card !rounded-xl shadow-lg animate-float"
                style={{ animationDelay: '1.4s' }}
              >
                <CartIcon size={14} className="text-violet shrink-0" />
                <span className="font-body text-xs text-white whitespace-nowrap">Shop keys →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section id="stats-section" className="bg-black-surface border-y border-border-dim py-8">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-silver-faint/20">
              <StatItem icon={BoltIcon} label="100% FREE" sub="No paywalls" />
              <StatItem icon={KeyOffIcon} label="KEYLESS" sub="No key system" />
              <StatItem icon={UsersIcon} label="ACTIVE" sub="COMMUNITY" />
              <StatItem icon={RefreshIcon} label="ALWAYS" sub="UPDATED" />
            </div>
          </div>
        </section>

        {/* Why VoidHub */}
        <section className="py-20 md:py-28 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-[clamp(1.4rem,2.5vw,2rem)] text-white mb-3">
                WHY VOIDHUB?
                <span className="block h-0.5 w-16 bg-white mx-auto mt-3 rounded-full" />
              </h2>
              <p className="font-body text-silver-mid text-sm md:text-base">
                Built for the community, maintained by the community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whyCards.map((card, idx) => {
                const Icon = card.icon
                return (
                  <div
                    key={idx}
                    className="
                      bg-black-card border border-border-dim rounded-lg p-7
                      transition-all duration-300
                      hover:border-silver-faint hover:-translate-y-1 hover:shadow-[0_0_8px_rgba(255,255,255,0.15)]
                    "
                  >
                    <Icon size={28} className="text-silver-base mb-4" />
                    <h3 className="font-heading text-[1rem] text-white mb-2">{card.title}</h3>
                    <p className="font-body text-[0.9rem] text-silver-mid leading-relaxed">{card.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Shop teaser */}
        <section className="py-20 md:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="price-card p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black-surface border border-border-dim rounded-full mb-4">
                  <ShopIcon size={13} className="text-violet" />
                  <span className="font-body text-xs text-silver-mid tracking-wide">New — Premium Shop</span>
                </div>
                <h2 className="font-heading text-[clamp(1.4rem,2.8vw,2.2rem)] text-white mb-3">
                  Want it instantly? Skip the wait.
                </h2>
                <p className="font-body text-silver-mid text-sm md:text-base max-w-md mx-auto md:mx-0">
                  Grab a premium key from the shop and get delivered automatically after checkout — no ads, no checkpoints.
                </p>
              </div>
              <Link href="/shop" className="btn-buy shrink-0 !px-8 !py-4">
                <CartIcon size={18} />
                <span>VISIT SHOP</span>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 md:py-28 px-4 bg-black-surface">
          <div className="max-w-[720px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-[clamp(1.4rem,2.5vw,2rem)] text-white mb-3">
                FAQ
              </h2>
              <p className="font-body text-silver-mid text-sm md:text-base">
                Common questions answered.
              </p>
            </div>

            <div className="flex flex-col">
              {faqItems.map((item, idx) => (
                <div key={idx} className="border-b border-border-dim">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between py-5 px-4 text-left"
                  >
                    <span className="font-body text-silver-bright text-[0.95rem]">{item.q}</span>
                    <ChevronDownIcon
                      size={20}
                      className={`
                        text-silver-mid flex-shrink-0 ml-4
                        transition-transform duration-300
                        ${expandedFaq === idx ? 'rotate-180' : ''}
                      `}
                    />
                  </button>
                  <div
                    className={`
                      overflow-hidden transition-all duration-300
                      ${expandedFaq === idx ? 'max-h-[200px] pb-5' : 'max-h-0'}
                    `}
                  >
                    <p className="px-4 font-body text-silver-mid text-[0.9rem] leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Discord CTA Banner */}
        <section className="bg-black-elevated border-y border-border-mid py-16 md:py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <DiscordIcon size={40} className="mx-auto text-white animate-pulse-glow mb-6" />
            <h2 className="font-heading text-[clamp(1.2rem,3vw,1.6rem)] text-white mb-3 tracking-wide">
              JOIN THE VOIDHUB COMMUNITY
            </h2>
            <p className="font-body text-silver-mid text-sm md:text-base mb-8 max-w-md mx-auto">
              Get updates, suggest games, get help, and connect with thousands of fellow script users.
            </p>
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !px-8"
            >
              <DiscordIcon size={20} />
              <span>JOIN DISCORD</span>
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </ToastProvider>
  )
}

function StatItem({ icon: Icon, label, sub }: { icon: typeof BoltIcon; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center py-2">
      <Icon size={20} className="text-silver-base mb-2" />
      <span className="font-heading text-[0.65rem] text-silver-light tracking-wider">{label}</span>
      <span className="font-body text-[0.65rem] text-silver-muted uppercase">{sub}</span>
    </div>
  )
}
