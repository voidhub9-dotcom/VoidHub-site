'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ExternalIcon,
  LogoutIcon,
  MenuIcon,
  XIcon,
  BarChartIcon,
  GamesIcon,
  TerminalIcon,
  ActivityIcon,
  SettingsIcon,
  ShopIcon,
} from '@/components/Icons'
import AnimatedLogo from '@/components/AnimatedLogo'
import { logout } from '@/lib/storage'

const mobileLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChartIcon },
  { href: '/admin/games', label: 'Games', icon: GamesIcon },
  { href: '/admin/shop', label: 'Shop', icon: ShopIcon },
  { href: '/admin/loader', label: 'Loader', icon: TerminalIcon },
  { href: '/admin/activity', label: 'Activity', icon: ActivityIcon },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

export default function AdminTopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-black-surface border-b border-border-dim">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left - Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <AnimatedLogo
              src="https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png"
              alt="VoidHub Logo"
              size={32}
              playIntro={false}
            />
            <span className="font-heading text-[0.9rem] text-white">VoidHub Admin</span>
          </Link>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="
                hidden sm:flex items-center gap-2 px-3 py-1.5
                border border-silver-faint text-silver-mid rounded-md
                text-xs font-body transition-all duration-200
                hover:border-white hover:text-white
              "
            >
              <ExternalIcon size={14} />
              <span>Visit Site</span>
            </a>
            <button
              onClick={handleLogout}
              className="
                hidden sm:flex items-center gap-2 px-3 py-1.5
                border border-danger/50 text-danger rounded-md
                text-xs font-body transition-all duration-200
                hover:bg-danger/10 hover:border-danger
              "
            >
              <LogoutIcon size={14} />
              <span>Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-silver-mid hover:text-white transition-colors"
            >
              <MenuIcon size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-black-surface border-l border-border-dim">
            <div className="flex justify-end p-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-silver-mid hover:text-white transition-colors"
              >
                <XIcon size={24} />
              </button>
            </div>
            <nav className="flex flex-col px-4 gap-1">
              {mobileLinks.map(link => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-md
                      transition-all duration-200 text-sm font-body
                      ${isActive
                        ? 'bg-black-card text-white border-l-2 border-white'
                        : 'text-silver-muted hover:text-silver-light hover:bg-black-elevated'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
              <div className="h-px bg-border-dim my-4" />
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  flex items-center gap-3 px-4 py-3 rounded-md
                  transition-all duration-200 text-sm font-body
                  text-silver-muted hover:text-silver-light hover:bg-black-elevated
                "
              >
                <ExternalIcon size={18} />
                <span>Visit Site</span>
              </a>
              <button
                onClick={handleLogout}
                className="
                  flex items-center gap-3 px-4 py-3 rounded-md
                  transition-all duration-200 text-sm font-body
                  text-danger hover:bg-danger/10
                "
              >
                <LogoutIcon size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
