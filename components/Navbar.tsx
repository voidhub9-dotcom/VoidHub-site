'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, GamesIcon, AboutIcon, DiscordIcon, MenuIcon, XIcon, ActivityIcon, HelpIcon, KeyIcon, ShopIcon } from '@/components/Icons'
import AnimatedLogo from '@/components/AnimatedLogo'
import { getDiscordLink } from '@/lib/storage'

const navLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/games', label: 'Games', icon: GamesIcon },
  { href: '/shop', label: 'Shop', icon: ShopIcon },
  { href: '/status', label: 'Status', icon: ActivityIcon },
  { href: '/faq', label: 'FAQ', icon: HelpIcon },
  { href: '/about', label: 'About', icon: AboutIcon },
]

// Primary tabs live in the mobile bottom bar — the "More" sheet only needs
// what's left over, so it doesn't just duplicate the tab bar.
const tabBarLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/games', label: 'Games', icon: GamesIcon },
  { href: '/shop', label: 'Shop', icon: ShopIcon },
  { href: '/status', label: 'Status', icon: ActivityIcon },
]
const moreSheetLinks = [
  { href: '/faq', label: 'FAQ', icon: HelpIcon },
  { href: '/about', label: 'About', icon: AboutIcon },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [discordLink, setDiscordLink] = useState('https://discord.gg/kPPsdZtndn')
  const [keyPageEnabled, setKeyPageEnabled] = useState(false)
  const [siteName, setSiteName] = useState('VoidHub')
  const [logoUrl, setLogoUrl] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const res = await fetch('/api/public/settings')
        const data = await res.json()
        setDiscordLink(data.discord)
        if (data.links?.siteName) setSiteName(data.links.siteName)
        if (data.links?.logoUrl) setLogoUrl(data.links.logoUrl)
      } catch (e) {
        console.error('Navbar: Failed to load settings:', e)
        setDiscordLink(getDiscordLink())
      }
    }
    const loadKeyPage = async () => {
      try {
        const res = await fetch('/api/public/keypage')
        const data = await res.json()
        setKeyPageEnabled(!!data.enabled)
      } catch {
        setKeyPageEnabled(false)
      }
    }
    loadPublicSettings()
    loadKeyPage()
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 h-16 md:h-[64px]
          bg-black-deep/85 backdrop-blur-xl
          border-b transition-all duration-300
          ${isScrolled ? 'border-silver-faint/30 shadow-lg' : 'border-border-dim'}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <AnimatedLogo
              src={logoUrl.trim() || '/logo.png'}
              alt={`${siteName} Logo`}
              size={36}
            />
            <span className="font-heading text-xl tracking-wider">
              {siteName === 'VoidHub' ? (
                <>Void<span className="text-glow">Hub</span></>
              ) : (
                <span className="text-glow">{siteName}</span>
              )}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 text-sm font-body
                    transition-all duration-200 relative py-1
                    ${isActive ? 'text-white' : 'text-silver-mid hover:text-white'}
                  `}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {keyPageEnabled && (
              <Link
                href="/getkey"
                className={`
                  flex items-center gap-2 px-4 py-2
                  border rounded-md text-sm font-body
                  transition-all duration-200
                  ${pathname === '/getkey'
                    ? 'border-success/60 text-success bg-success/10'
                    : 'border-success/40 text-success hover:bg-success/10'
                  }
                `}
              >
                <KeyIcon size={18} />
                <span>Get Key</span>
              </Link>
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
      </nav>

      {/* Mobile Bottom Tab Bar — primary nav, always in thumb reach */}
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
                <Icon size={20} className={isActive ? 'text-glow' : ''} />
                <span className="font-body text-[0.65rem]">{link.label}</span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-white rounded-full" />
                )}
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

      {/* Mobile Menu Overlay ("More" sheet) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-black-surface border-l border-border-dim animate-slideUp">
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-silver-mid hover:text-white transition-colors"
              >
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
                    className={`
                      flex items-center gap-4 px-4 py-4 rounded-lg
                      text-lg font-body transition-all duration-200
                      ${isActive
                        ? 'bg-black-card text-white border-l-2 border-white'
                        : 'text-silver-mid hover:bg-black-hover hover:text-white'
                      }
                    `}
                  >
                    <Icon size={22} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
              <div className="h-px bg-border-dim my-4" />
              {keyPageEnabled && (
                <Link
                  href="/getkey"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="
                    flex items-center gap-4 px-4 py-4 rounded-lg
                    text-lg font-body text-success
                    transition-all duration-200
                    hover:bg-success/10
                  "
                >
                  <KeyIcon size={22} />
                  <span>Get Key</span>
                </Link>
              )}
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="
                  flex items-center gap-4 px-4 py-4 rounded-lg
                  text-lg font-body text-silver-mid
                  transition-all duration-200
                  hover:bg-black-hover hover:text-white
                "
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
