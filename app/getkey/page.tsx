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
        <div className="void-card p-8">
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
              className="void-btn-primary inline-flex items-center gap-2 mt-6"
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
        <div className="void-card p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-black-elevated flex items-center justify-center mx-auto mb-5">
            <DiscordIcon size={28} className="text-silver-mid" />
          </div>
          <h1 className="font-heading text-xl text-white tracking-wider text-balance">
            JOIN OUR <span className="text-success">DISCORD</span>
          </h1>
          <p className="font-body text-sm text-silver-muted mt-3 leading-relaxed text-pretty">
            {data.discordGateText}
          </p>
          <a
            href={data.discordUrlOverride || data.discord}
            target="_blank"
            rel="noopener noreferrer"
            onClick={passGate}
            className="void-btn-primary w-full mt-6 flex items-center justify-center gap-2"
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
        <div className="rounded-xl overflow-hidden border border-border-dim mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.bannerImageUrl} alt="" className="w-full max-h-48 object-cover" />
        </div>
      )}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-xl bg-black-elevated flex items-center justify-center mx-auto mb-5">
          <KeyIcon size={28} className="text-success" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl text-white tracking-wider text-balance">
          {data.title}
        </h1>
        <p className="font-body text-sm text-silver-muted mt-3 max-w-md mx-auto leading-relaxed text-pretty">
          {data.subtitle}
        </p>
        {data.instructions && (
          <div className="mt-5 inline-flex items-start gap-2 rounded-md border border-border-dim bg-black-card px-4 py-3 text-left max-w-md">
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
              className="void-card p-4 sm:p-5 flex items-center gap-4 group hover:border-success/40 transition-all duration-200"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {p.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.iconUrl} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-md bg-black-elevated text-white font-heading text-lg flex items-center justify-center shrink-0">
                  {p.name.charAt(0).toUpperCase()}
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
                className="font-heading text-xs text-silver-muted group-hover:text-success tracking-wider transition-colors duration-200 shrink-0"
                aria-hidden="true"
              >
                {(p.buttonText || 'GET KEY').toUpperCase()} →
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
