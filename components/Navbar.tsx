'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, GamesIcon, AboutIcon, DiscordIcon, MenuIcon, XIcon, ActivityIcon, HelpIcon, ChevronRightIcon } from '@/components/Icons'
import { getDiscordLink } from '@/lib/storage'

const navLinks = [
  { href: '/', label: 'home' },
  { href: '/games', label: 'games' },
  { href: '/status', label: 'status' },
  { href: '/faq', label: 'faq' },
  { href: '/about', label: 'about' },
]

// Primary tabs live in the mobile bottom bar; the "More" sheet holds the rest.
const tabBarLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/games', label: 'Games', icon: GamesIcon },
  { href: '/status', label: 'Status', icon: ActivityIcon },
  { href: '/faq', label: 'FAQ', icon: HelpIcon },
]
const moreSheetLinks = [
  { href: '/about', label: 'About', icon: AboutIcon },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [discordLink, setDiscordLink] = useState('https://discord.gg/UrTqzfq9DF')
  const [siteName, setSiteName] = useState('VoidHub')
  const [logoUrl, setLogoUrl] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => {
        if (data.discord) setDiscordLink(data.discord)
        if (data.links?.siteName) setSiteName(data.links.siteName)
        if (data.links?.logoUrl) setLogoUrl(data.links.logoUrl)
      })
      .catch(() => setDiscordLink(getDiscordLink()))
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-3 md:px-4 pt-3">
        <div
          className={`
            max-w-5xl mx-auto h-14 md:h-[58px] pl-4 pr-2 md:pl-5 md:pr-2.5
            flex items-center justify-between
            rounded-full border backdrop-blur-xl transition-all duration-300
            ${isScrolled
              ? 'bg-black-deep/85 border-border-mid shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)]'
              : 'bg-black-deep/50 border-border-dim'}
          `}
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logoUrl.trim() || '/logo.png'} alt="" className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]" />
            <span className="font-display font-semibold text-[1.05rem] tracking-tight">
              {siteName === 'VoidHub' ? <>Void<span className="text-glow">Hub</span></> : <span className="text-glow">{siteName}</span>}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 text-sm font-body lowercase transition-colors duration-200
                    ${isActive ? 'text-white' : 'text-silver-mid hover:text-white'}
                  `}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-[3px] w-6 h-[2px] rounded-full bg-white" />
                  )}
                </Link>
              )
            })}
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-body lowercase text-silver-mid hover:text-white transition-colors"
            >
              discord
            </a>
          </div>

          <Link href="/#get" className="btn-white h-9 md:h-10 px-4 md:px-5 text-sm lowercase">
            <span>get script</span>
            <ChevronRightIcon size={15} />
          </Link>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black-deep/95 backdrop-blur-xl border-t border-border-dim"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16">
          {tabBarLinks.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-silver-muted active:text-silver-light'
                }`}
              >
                <Icon size={20} />
                <span className="font-body text-[0.65rem]">{link.label}</span>
                {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-white" />}
              </Link>
            )
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
              isMobileMenuOpen || moreSheetLinks.some(l => l.href === pathname)
                ? 'text-white' : 'text-silver-muted active:text-silver-light'
            }`}
          >
            <MenuIcon size={20} />
            <span className="font-body text-[0.65rem]">More</span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-black-surface border-l border-border-dim animate-slideUp">
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-silver-mid hover:text-white transition-colors" aria-label="Close menu">
                <XIcon size={24} />
              </button>
            </div>
            <div className="flex flex-col px-6 py-4 gap-2">
              {moreSheetLinks.map(link => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-body transition-all duration-200 ${
                      isActive ? 'bg-black-card text-white' : 'text-silver-mid hover:bg-black-hover hover:text-white'
                    }`}
                  >
                    <Icon size={22} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
              <div className="h-px bg-border-dim my-4" />
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-body text-silver-mid transition-all duration-200 hover:bg-black-hover hover:text-white"
              >
                <DiscordIcon size={22} />
                <span>Join Discord</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
