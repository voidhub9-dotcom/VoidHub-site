'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Site-wide maintenance mode gate.
 * Reads the admin-controlled maintenance flag from /api/public/settings.
 * When enabled, replaces every public page with a maintenance screen.
 * Admin routes (/admin/*) and the unauthorized page stay accessible so
 * the maintenance mode can always be turned back off.
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [maintenance, setMaintenance] = useState<boolean | null>(null)

  const isExempt = pathname?.startsWith('/admin') || pathname === '/unauthorized'

  useEffect(() => {
    if (isExempt) return
    let cancelled = false
    fetch('/api/public/settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (!cancelled) setMaintenance(Boolean(data.maintenance)) })
      .catch(() => { if (!cancelled) setMaintenance(false) })
    return () => { cancelled = true }
  }, [isExempt, pathname])

  // Admin pages are never blocked
  if (isExempt) return <>{children}</>

  // Still checking — render the page normally to avoid a flash/delay,
  // the gate swaps in only when we know maintenance is on.
  if (maintenance !== true) return <>{children}</>

  return (
    <main className="fixed inset-0 z-[200] bg-black font-display flex flex-col items-center justify-center px-6 text-center overflow-hidden mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 mono-dots pointer-events-none" aria-hidden="true" />

      <div className="relative flex flex-col items-center max-w-md">
        <img src="/logo.png" alt="VoidHub" className="w-16 h-16 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.35)]" />

        <span className="mt-7 inline-flex items-center gap-2 h-7 px-3 rounded-full border border-[#262626] bg-white/[0.03] font-gmono text-[0.68rem] text-[#a3a3a3]">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-60" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
          </span>
          maintenance in progress
        </span>

        <h1 className="mt-6 font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.4rem,9vw,3.6rem)] text-chrome">
          Back in a moment.
        </h1>
        <p className="mt-4 text-[#8a8a8a] text-sm md:text-base leading-relaxed text-pretty">
          VoidHub is down while we make things better. Your scripts and the loader will be right where you left them.
        </p>
      </div>
    </main>
  )
}
