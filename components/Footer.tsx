'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HomeIcon, GamesIcon, AboutIcon, DiscordIcon, ActivityIcon, HelpIcon, YouTubeIcon, TikTokIcon, TelegramIcon, ShopIcon } from '@/components/Icons'
import AnimatedLogo from '@/components/AnimatedLogo'
import { getDiscordLink, getTagline } from '@/lib/storage'

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

const footerLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/games', label: 'Games', icon: GamesIcon },
  { href: '/shop', label: 'Shop', icon: ShopIcon },
  { href: '/status', label: 'Status', icon: ActivityIcon },
  { href: '/faq', label: 'FAQ', icon: HelpIcon },
  { href: '/about', label: 'About', icon: AboutIcon },
]

export default function Footer() {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')
  const [tagline, setTagline] = useState('Free. Powerful. No Limits.')
  const [links, setLinks] = useState<FooterLinks>(DEFAULT_FOOTER_LINKS)

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const res = await fetch('/api/public/settings')
        const data = await res.json()
        setDiscordLink(data.discord)
        setTagline(data.tagline)
        if (data.links) setLinks(prev => ({ ...prev, ...data.links }))
      } catch (e) {
        console.error('Footer: Failed to load settings:', e)
        setDiscordLink(getDiscordLink())
        setTagline(getTagline())
      }
    }
    loadPublicSettings()
  }, [])

  return (
    <footer className="border-t border-border-dim bg-black-surface">
      {/* Upper Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-3">
              <AnimatedLogo
                src={links.logoUrl.trim() || '/logo.png'}
                alt={`${links.siteName} Logo`}
                size={40}
                playIntro={false}
              />
              <span className="font-heading text-xl tracking-wider">
                {links.siteName === 'VoidHub' ? (
                  <>Void<span className="text-glow">Hub</span></>
                ) : (
                  <span className="text-glow">{links.siteName}</span>
                )}
              </span>
            </Link>
            <p className="text-silver-mid text-sm font-body">{tagline}</p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 sm:gap-x-6 md:gap-x-8">
            {footerLinks.map(link => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="
                    flex items-center gap-2 text-sm font-body
                    text-silver-mid hover:text-white transition-colors
                  "
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Socials */}
          <div className="flex justify-center md:justify-end items-center gap-2 flex-wrap">
            {links.youtube.trim() && (
              <a
                href={links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="p-2.5 border border-silver-faint text-silver-mid rounded-md transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
              >
                <YouTubeIcon size={18} />
              </a>
            )}
            {links.tiktok.trim() && (
              <a
                href={links.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="p-2.5 border border-silver-faint text-silver-mid rounded-md transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
              >
                <TikTokIcon size={18} />
              </a>
            )}
            {links.telegram.trim() && (
              <a
                href={links.telegram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="p-2.5 border border-silver-faint text-silver-mid rounded-md transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
              >
                <TelegramIcon size={18} />
              </a>
            )}
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-2 px-4 py-2
                border border-silver-faint text-silver-mid
                rounded-md text-sm font-body
                transition-all duration-200
                hover:bg-white hover:text-black hover:border-white
              "
            >
              <DiscordIcon size={18} />
              <span>Discord</span>
            </a>
          </div>
        </div>
      </div>

      {/* Lower Footer — extra bottom clearance on mobile so the fixed tab bar never covers it */}
      <div className="border-t border-border-dim">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 md:py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-silver-muted text-xs font-body">
            &copy; {new Date().getFullYear()} {links.siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/developers" className="text-silver-muted text-xs font-body hover:text-white transition-colors">
              Public API
            </Link>
            <p className="text-silver-muted text-xs font-body">
              Free scripts. Premium keys. No BS.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
