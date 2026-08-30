'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LoadstringBox from '@/components/LoadstringBox'
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
  const heroRef = useRef<HTMLDivElement>(null)

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

  const scrollToContent = () => {
    const nextSection = document.getElementById('stats-section')
    nextSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black-void">
        <Navbar />

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Static grid background — no animation (heavy blur + infinite
              animation was crashing low-end devices) */}
          <div className="absolute inset-0 hero-grid" />

          {/* Static ambient glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(0,255,204,0.05)] rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[rgba(255,255,255,0.06)] rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-4 py-20 pt-24">
            {/* Logo */}
            <img
              src="https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png"
              alt="VoidHub Logo"
              className="w-20 h-20 mb-6 animate-breathe drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            />

            {/* Title */}
            <h1
              className={`
                font-heading text-white text-center
                text-[clamp(3rem,8vw,7rem)] leading-none tracking-widest
                transition-all duration-500
                ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
                ${glitching ? 'animate-glitch' : ''}
              `}
            >
              VOIDHUB
            </h1>

            {/* Tagline */}
            <p
              className={`
                mt-4 font-body text-silver-mid text-[1.2rem] tracking-wider text-center
                transition-all duration-500 delay-200
                ${titleVisible ? 'opacity-100' : 'opacity-0'}
              `}
            >
              {tagline}
            </p>

            {/* Loadstring Box */}
            <div
              className={`
                mt-8 w-full max-w-[560px]
                transition-all duration-500 delay-300
                ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
              `}
            >
              <LoadstringBox />
            </div>

            {/* CTA Buttons */}
            <div
              className={`
                mt-8 flex flex-col sm:flex-row gap-4 w-full max-w-[400px]
                transition-all duration-500 delay-500
                ${titleVisible ? 'opacity-100' : 'opacity-0'}
              `}
            >
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex-1 h-11 flex items-center justify-center gap-2
                  bg-white text-black rounded-lg font-body text-sm
                  transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02]
                "
              >
                <DiscordIcon size={18} />
                <span>JOIN DISCORD</span>
              </a>
              <Link
                href="/games"
                className="
                  flex-1 h-11 flex items-center justify-center gap-2
                  border border-silver-faint text-silver-mid rounded-lg font-body text-sm
                  transition-all duration-200 hover:border-white hover:text-white
                "
              >
                <GamesIcon size={18} />
                <span>VIEW GAMES</span>
              </Link>
            </div>

            {/* Scroll Indicator */}
            <button
              onClick={scrollToContent}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 text-silver-faint animate-bounce"
            >
              <ChevronDownIcon size={28} />
            </button>
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
              className="
                inline-flex items-center gap-2 px-8 py-3
                bg-white text-black rounded-lg font-body
                transition-all duration-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-[1.02]
              "
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
