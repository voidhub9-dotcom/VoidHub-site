'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DiscordIcon, ShieldIcon } from '@/components/Icons'
import AnimatedLogo from '@/components/AnimatedLogo'

const LINES = [
  { ms: 0,    text: 'connection → /api/loader',        cls: 'text-silver-muted' },
  { ms: 350,  text: 'inspecting request fingerprint…',  cls: 'text-silver-muted' },
  { ms: 750,  text: 'browser signature detected',       cls: 'text-danger' },
  { ms: 1100, text: 'serving decoy response',            cls: 'text-danger' },
  { ms: 1500, text: 'real script never left the server', cls: 'text-silver-mid' },
]

export default function UnauthorizedPage() {
  const [shown, setShown] = useState(0)
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const timers = LINES.map((l, i) => setTimeout(() => setShown(i + 1), l.ms + 150))
    const blinkId = setInterval(() => setBlink(b => !b), 530)
    return () => { timers.forEach(clearTimeout); clearInterval(blinkId) }
  }, [])

  const done = shown >= LINES.length

  return (
    <main className="relative min-h-screen bg-black font-display flex items-center justify-center px-4 overflow-hidden mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" />
      <div className="absolute inset-0 mono-dots pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px]">

        {/* Brand mark, matching the admin login card */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <AnimatedLogo src="/logo.png" alt="VoidHub Logo" size={56} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black-surface border border-border-mid flex items-center justify-center">
              <ShieldIcon size={12} className="text-danger" />
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-chrome mb-2">
            Executors only.
          </h1>
          <p className="font-body text-sm text-silver-muted leading-relaxed">
            You reached it from a browser, so you got a decoy instead of the real script.
          </p>
        </div>

        {/* Live log — admin-panel treatment, no fake window chrome */}
        <div className="mono-card overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 h-9 border-b border-border-dim">
            <span className="font-body text-[0.65rem] tracking-widest uppercase text-silver-muted">access_control</span>
            <span className={`flex items-center gap-1.5 font-body text-[0.65rem] tracking-widest uppercase ${done ? 'text-danger' : 'text-silver-muted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-danger' : 'bg-silver-muted animate-pulse'}`} />
              {done ? 'blocked' : 'checking'}
            </span>
          </div>
          <div className="px-5 py-5 min-h-[132px] font-gmono">
            {LINES.slice(0, shown).map((l, i) => (
              <div key={i} className={`text-xs leading-7 tracking-wide ${l.cls}`}>
                <span className="text-silver-faint">{'>'} </span>{l.text}
              </div>
            ))}
            {!done && (
              <span className={`inline-block w-2 h-4 bg-danger transition-opacity ${blink ? 'opacity-100' : 'opacity-0'}`} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="flex-1 btn-outline h-11 text-sm">
            ← Back to VoidHub
          </Link>
          <a href="https://discord.gg/UrTqzfq9DF" target="_blank" rel="noopener noreferrer" className="flex-1 btn-white h-11 text-sm">
            <DiscordIcon size={16} />
            Discord
          </a>
        </div>
      </div>
    </main>
  )
}
