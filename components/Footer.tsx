'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DiscordIcon, YouTubeIcon, TikTokIcon, TelegramIcon } from '@/components/Icons'
import { getDiscordLink } from '@/lib/storage'

interface FooterLinks {
  youtube: string
  tiktok: string
  telegram: string
  siteName: string
  logoUrl: string
}

const DEFAULT_FOOTER_LINKS: FooterLinks = {
  youtube: '',
  tiktok: '',
  telegram: '',
  siteName: 'VoidHub',
  logoUrl: '',
}

export default function Footer() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')
  const [links, setLinks] = useState<FooterLinks>(DEFAULT_FOOTER_LINKS)

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => {
        if (data.discord) setDiscordLink(data.discord)
        if (data.links) setLinks(prev => ({ ...prev, ...data.links }))
      })
      .catch(() => setDiscordLink(getDiscordLink()))
  }, [])

  const columns: { title: string; items: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: 'Site',
      items: [
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/games' },
        { label: 'Status', href: '/status' },
        { label: 'About', href: '/about' },
      ],
    },
    {
      title: 'Get started',
      items: [
        { label: 'Copy the script', href: '/#get' },
        { label: 'Supported games', href: '/games' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Public API', href: '/developers' },
      ],
    },
    {
      title: 'Community',
      items: [
        { label: 'Discord', href: discordLink, external: true },
        { label: 'Request a game', href: discordLink, external: true },
        { label: 'Get support', href: discordLink, external: true },
      ],
    },
  ]

  const socials = [
    { url: links.youtube, label: 'YouTube', Icon: YouTubeIcon },
    { url: links.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { url: links.telegram, label: 'Telegram', Icon: TelegramIcon },
  ].filter(s => s.url.trim())

  return (
    <footer className="relative border-t border-border-dim bg-black-deep">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-10 grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <img src={links.logoUrl.trim() || '/logo.png'} alt="" className="w-9 h-9 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight">
              {links.siteName === 'VoidHub' ? <>Void<span className="text-glow">Hub</span></> : <span className="text-glow">{links.siteName}</span>}
            </span>
          </Link>
          <p className="font-body text-sm text-silver-muted max-w-xs leading-relaxed">
            Free, keyless, always-updated scripts for the Roblox games you actually play.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border-mid text-silver-mid text-xs font-body hover:text-white hover:border-white/40 transition-colors"
            >
              <DiscordIcon size={15} />
              <span>join discord</span>
            </a>
            {socials.map(({ url, label, Icon }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-mid text-silver-mid hover:text-white hover:border-white/40 transition-colors"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {columns.map(col => (
          <div key={col.title}>
            <h4 className="font-code text-[0.68rem] tracking-[0.25em] uppercase text-silver-muted mb-4 w-fit">{col.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {col.items.map(item => (
                <li key={item.label}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-silver-mid hover:text-white transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className="font-body text-sm text-silver-mid hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Extra bottom clearance on mobile so the fixed tab bar never covers it */}
      <div className="border-t border-border-dim">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 md:py-6 flex flex-col md:flex-row justify-between items-center gap-2 text-center">
          <p className="font-body text-xs text-silver-muted">
            &copy; {new Date().getFullYear()} {links.siteName}. Free forever, no keys.
          </p>
          <p className="font-body text-xs text-silver-muted">
            Not affiliated with Roblox Corporation. Use scripts responsibly.
          </p>
        </div>
      </div>
    </footer>
  )
}
