'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const LINES = [
  { ms: 0,    text: '> Incoming connection to /api/loader',      cls: 'text-[#606060]' },
  { ms: 400,  text: '> Scanning headers...',                      cls: 'text-[#606060]' },
  { ms: 800,  text: '> [BLOCKED] Browser request detected',       cls: 'text-[#ff3333]' },
  { ms: 1200, text: '> [BLOCKED] Fingerprint matched',            cls: 'text-[#ff3333]' },
  { ms: 1600, text: '> Issuing decoy 403 response',               cls: 'text-[#ff3333]' },
  { ms: 2000, text: '> Script protected. Session terminated.',     cls: 'text-[#ff3333]' },
  { ms: 2500, text: '> Executor-only endpoint. No exceptions.',   cls: 'text-[#888888]' },
]

export default function UnauthorizedPage() {
  const [shown, setShown] = useState(0)
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const timers = LINES.map((l, i) => setTimeout(() => setShown(i + 1), l.ms + 100))
    const blinkId = setInterval(() => setBlink(b => !b), 530)
    return () => { timers.forEach(clearTimeout); clearInterval(blinkId) }
  }, [])

  return (
    <main className="min-h-screen bg-[#000] flex items-center justify-center px-4 font-mono select-none">

      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right,#ffffff06 1px,transparent 1px),' +
            'linear-gradient(to bottom,#ffffff06 1px,transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Red ambient glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[400px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse,#ff222210 0%,transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-[560px] space-y-5">

        {/* Terminal card */}
        <div className="rounded-xl overflow-hidden border border-[#1c1c1c]"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px #0f0f0f' }}>

          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 h-10 bg-[#111] border-b border-[#1c1c1c]">
            <span className="w-3 h-3 rounded-full bg-[#ff3b30]" />
            <span className="w-3 h-3 rounded-full bg-[#ffcc00]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[#444] text-xs tracking-wider">access_control.lua — DENIED</span>
          </div>

          {/* Log output */}
          <div className="bg-[#0a0a0a] px-5 py-5 min-h-[200px]">
            {LINES.slice(0, shown).map((l, i) => (
              <div key={i} className={`text-xs leading-7 tracking-wide ${l.cls}`}>{l.text}</div>
            ))}
            {shown < LINES.length && (
              <span className={`inline-block w-2 h-4 bg-[#ff3333] transition-opacity ${blink ? 'opacity-100' : 'opacity-0'}`} />
            )}
            {shown >= LINES.length && (
              <div className="mt-4 pt-4 border-t border-[#1c1c1c]">
                <p className="text-[#ff3333] text-xs tracking-widest uppercase font-semibold">
                  ✗ &nbsp;Access denied — browser session
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] p-6 space-y-4">
          <div>
            <h1 className="text-white font-sans font-bold text-2xl mb-1">Protected Endpoint</h1>
            <p className="text-[#555] text-sm font-sans">
              This URL only responds to Roblox executor requests. All browser traffic receives a decoy 403 response — the real script is never exposed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-[#555]">
            {[
              'Browser fingerprint detection',
              'Decoy response for scanners',
              'Script never stored in static files',
              'Cache-Control: no-store enforced',
              'No source code in responses',
              'Executor-header validation',
            ].map(item => (
              <div key={item} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#ff3333] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#1c1c1c] flex items-center gap-3">
            <Link href="/"
              className="flex-1 h-9 rounded-lg border border-[#222] text-[#666] text-xs font-sans flex items-center justify-center hover:border-[#444] hover:text-[#aaa] transition-all">
              ← Back to VoidHub
            </Link>
            <a href="https://discord.gg/kPPsdZtndn" target="_blank" rel="noopener noreferrer"
              className="flex-1 h-9 rounded-lg bg-[#5865F2] text-white text-xs font-sans font-medium flex items-center justify-center gap-2 hover:bg-[#4752c4] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.116 18.104.133 18.117a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Join Discord
            </a>
          </div>
        </div>

      </div>
    </main>
  )
}
