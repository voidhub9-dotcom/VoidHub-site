'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'
import { DiscordIcon, KeyIcon, CheckIcon } from '@/components/Icons'

interface KeyProvider {
  id: string
  name: string
  url: string
  description: string
  badge: string
  iconUrl: string
  keyDuration: string
  checkpoints: string
  buttonText: string
  enabled: boolean
}

interface KeyPageData {
  enabled: boolean
  title: string
  subtitle: string
  requireDiscord: boolean
  discordGateText: string
  instructions: string
  bannerImageUrl: string
  footerNote: string
  discordUrlOverride: string
  providers: KeyProvider[]
  discord: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

/** Remember that the visitor passed the Discord gate so they skip it next time. */
const GATE_KEY = 'voidhub_key_gate_passed'

function GetKeyContent() {
  const { data, isLoading } = useSWR<KeyPageData>('/api/public/keypage', fetcher)
  const [gatePassed, setGatePassed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && sessionStorage.getItem(GATE_KEY) === 'true') {
      setGatePassed(true)
    }
  }, [])

  const passGate = () => {
    sessionStorage.setItem(GATE_KEY, 'true')
    setGatePassed(true)
  }

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  // Page disabled by admin
  if (!data || !data.enabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="relative overflow-hidden void-card p-8">
          <div
            className="absolute inset-x-0 top-0 h-[2px] opacity-60"
            style={{ background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))' }}
            aria-hidden="true"
          />
          <KeyIcon size={32} className="text-silver-faint mx-auto mb-4" />
          <h1 className="font-heading text-lg text-white tracking-wider text-balance">
            KEY SYSTEM NOT AVAILABLE
          </h1>
          <p className="font-body text-sm text-silver-muted mt-2 text-pretty">
            The key system isn&apos;t active right now. Check back later or join our Discord for updates.
          </p>
          {data?.discord && (
            <a
              href={data.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 mt-6"
            >
              <DiscordIcon size={16} />
              JOIN DISCORD
            </a>
          )}
        </div>
      </div>
    )
  }

  // Discord gate step (like the reference)
  if (data.requireDiscord && !gatePassed) {
    return (
      <div className="max-w-md mx-auto px-4 py-24">
        <div className="relative overflow-hidden void-card p-8 text-center">
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyber))' }}
            aria-hidden="true"
          />
          <div className="relative w-14 h-14 rounded-2xl mx-auto mb-5 p-[1.5px]" style={{ background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyber))' }}>
            <div className="w-full h-full rounded-2xl bg-black-card flex items-center justify-center">
              <DiscordIcon size={26} className="text-white" />
            </div>
          </div>
          <h1 className="font-heading text-xl text-white tracking-wider text-balance">
            JOIN OUR <span className="text-glow">DISCORD</span>
          </h1>
          <p className="font-body text-sm text-silver-muted mt-3 leading-relaxed text-pretty">
            {data.discordGateText}
          </p>
          <a
            href={data.discordUrlOverride || data.discord}
            target="_blank"
            rel="noopener noreferrer"
            onClick={passGate}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            <DiscordIcon size={16} />
            JOIN DISCORD SERVER
          </a>
          <button
            onClick={passGate}
            className="font-body text-xs text-silver-muted hover:text-white transition-colors duration-200 mt-4"
          >
            I&apos;ve already joined — continue
          </button>
        </div>
      </div>
    )
  }

  // Provider options
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
      {data.bannerImageUrl && (
        <div className="rounded-2xl overflow-hidden border border-border-dim mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.bannerImageUrl} alt="" className="w-full max-h-48 object-cover" />
        </div>
      )}
      <div className="text-center mb-10">
        <div className="relative w-14 h-14 rounded-2xl mx-auto mb-5 p-[1.5px]" style={{ background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyber))' }}>
          <div className="w-full h-full rounded-2xl bg-black-card flex items-center justify-center">
            <KeyIcon size={26} className="text-success" />
          </div>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl text-white tracking-wider text-balance">
          {data.title}
        </h1>
        <p className="font-body text-sm text-silver-muted mt-3 max-w-md mx-auto leading-relaxed text-pretty">
          {data.subtitle}
        </p>
        {data.instructions && (
          <div className="mt-5 inline-flex items-start gap-2 rounded-xl border border-border-dim bg-black-card px-4 py-3 text-left max-w-md">
            <CheckIcon size={15} className="text-success shrink-0 mt-0.5" />
            <p className="font-body text-xs text-silver-mid leading-relaxed">{data.instructions}</p>
          </div>
        )}
      </div>

      {data.providers.length === 0 ? (
        <div className="void-card p-10 text-center">
          <p className="font-body text-sm text-silver-muted">
            No key options are available right now. Check back soon.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.providers.map((p, i) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="price-card group relative flex items-center gap-4 p-4 sm:p-5 admin-stagger"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {p.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="relative w-12 h-12 rounded-xl shrink-0 p-[1.5px]" style={{ background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyber))' }}>
                  <div className="w-full h-full rounded-xl bg-black-card text-white font-heading text-lg flex items-center justify-center">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm sm:text-base font-semibold text-white">
                    {p.name}
                  </span>
                  {p.badge && (
                    <span className="px-1.5 py-0.5 rounded border border-success/40 bg-success/10 text-success font-body text-[0.6rem] uppercase tracking-wider">
                      {p.badge}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="font-body text-xs sm:text-sm text-silver-muted mt-0.5 text-pretty">
                    {p.description}
                  </p>
                )}
                {(p.keyDuration || p.checkpoints) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {p.keyDuration && (
                      <span className="px-1.5 py-0.5 rounded bg-black-elevated text-silver-mid font-body text-[0.6rem] uppercase tracking-wider">
                        {p.keyDuration}
                      </span>
                    )}
                    {p.checkpoints && (
                      <span className="px-1.5 py-0.5 rounded bg-black-elevated text-silver-mid font-body text-[0.6rem] uppercase tracking-wider">
                        {p.checkpoints}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-heading text-xs tracking-wider border border-border-mid text-silver-light transition-all duration-200 group-hover:border-transparent group-hover:text-white group-hover:bg-gradient-to-br group-hover:from-[var(--accent-violet)] group-hover:to-[var(--accent-cyber)]"
                aria-hidden="true"
              >
                {(p.buttonText || 'GET KEY').toUpperCase()}
              </span>
            </a>
          ))}
        </div>
      )}

      {data.footerNote && (
        <p className="font-body text-xs text-silver-muted text-center mt-8 text-pretty">
          {data.footerNote}
        </p>
      )}
    </div>
  )
}

export default function GetKeyPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-black-void">
        <Navbar />
        <main className="flex-1">
          <GetKeyContent />
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
