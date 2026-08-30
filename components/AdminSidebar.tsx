'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  BarChartIcon,
  GamesIcon,
  TerminalIcon,
  ActivityIcon,
  SettingsIcon,
  LogoutIcon,
  BoltIcon,
  KeyIcon,
} from '@/components/Icons'
import { logout, getUsername } from '@/lib/storage'

const mainLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChartIcon },
  { href: '/admin/games', label: 'Games', icon: GamesIcon },
  { href: '/admin/executors', label: 'Executors', icon: BoltIcon },
  { href: '/admin/loader', label: 'Loader', icon: TerminalIcon },
  { href: '/admin/keys', label: 'Keys', icon: KeyIcon },
  { href: '/admin/activity', label: 'Activity', icon: ActivityIcon },
]

const manageLinks = [
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState('')

  useEffect(() => {
    setUsername(getUsername() || 'voidhub')
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  return (
    <aside className="fixed left-0 top-[60px] bottom-0 w-[220px] bg-black-surface border-r border-border-dim overflow-y-auto hidden lg:block">
      <div className="flex flex-col h-full py-4">
        <div className="px-4 mb-4">
          <span className="font-heading text-[0.6rem] text-silver-muted tracking-widest uppercase">
            Main
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {mainLinks.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-md
                  transition-all duration-200 text-sm font-body
                  ${isActive
                    ? 'bg-black-card text-white border-l-2 border-white'
                    : 'text-silver-muted hover:text-silver-light hover:bg-black-elevated'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-silver-muted'} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 mt-6 mb-4">
          <span className="font-heading text-[0.6rem] text-silver-muted tracking-widest uppercase">
            Manage
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {manageLinks.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-md
                  transition-all duration-200 text-sm font-body
                  ${isActive
                    ? 'bg-black-card text-white border-l-2 border-white'
                    : 'text-silver-muted hover:text-silver-light hover:bg-black-elevated'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-silver-muted'} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 mt-6 mb-4">
          <span className="font-heading text-[0.6rem] text-silver-muted tracking-widest uppercase">
            Account
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          <button
            onClick={handleLogout}
            className="
              flex items-center gap-3 px-4 py-2.5 rounded-md
              transition-all duration-200 text-sm font-body
              text-silver-muted hover:text-danger hover:bg-danger/10
            "
          >
            <LogoutIcon size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="mt-auto px-4 py-4 border-t border-border-dim">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black-card border border-silver-faint flex items-center justify-center">
              <span className="font-heading text-[0.7rem] text-silver-mid">VH</span>
            </div>
            <div>
              <p className="font-body text-[0.8rem] text-silver-mid">{username}</p>
              <p className="font-body text-[0.7rem] text-silver-faint">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
