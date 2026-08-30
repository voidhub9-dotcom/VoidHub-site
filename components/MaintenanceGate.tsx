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
    <main className="fixed inset-0 z-[200] bg-black-void flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Subtle grid backdrop */}
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-6 max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-black-card border border-border-mid shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <svg className="w-10 h-10 text-warning animate-breathe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
          </svg>
        </div>

        <h1 className="font-heading text-white text-3xl sm:text-4xl tracking-widest">
          UNDER MAINTENANCE
        </h1>
        <p className="font-body text-silver-mid text-sm leading-relaxed text-pretty">
          VoidHub is temporarily down while we make things better. We&apos;ll be back shortly — scripts, loader, and everything else will be right where you left them.
        </p>

        <div className="flex items-center gap-2 text-silver-muted text-xs font-body tracking-[0.3em] uppercase">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" aria-hidden="true" />
          Working on it
        </div>
      </div>
    </main>
  )
}
