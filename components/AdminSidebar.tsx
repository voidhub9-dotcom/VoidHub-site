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
  MailIcon,
  ExternalIcon,
  DiscordIcon,
} from '@/components/Icons'
import { logout, getUsername } from '@/lib/storage'

export const ADMIN_NAV: { group: string; links: { href: string; label: string; icon: typeof BarChartIcon }[] }[] = [
  {
    group: 'Overview',
    links: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: BarChartIcon },
      { href: '/admin/activity', label: 'Activity', icon: ActivityIcon },
    ],
  },
  {
    group: 'Content',
    links: [
      { href: '/admin/games', label: 'Games', icon: GamesIcon },
      { href: '/admin/executors', label: 'Executors', icon: BoltIcon },
      { href: '/admin/loader', label: 'Loader', icon: TerminalIcon },
    ],
  },
  {
    group: 'Manage',
    links: [
      { href: '/admin/discord', label: 'Discord Members', icon: DiscordIcon },
      { href: '/admin/email', label: 'Send Email', icon: MailIcon },
      { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
]

export function AdminNavLink({ href, label, icon: Icon, isActive, onClick }: {
  href: string; label: string; icon: typeof BarChartIcon; isActive: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 h-9 px-3 rounded-lg text-[0.85rem] transition-colors duration-150
        ${isActive ? 'bg-white text-black font-medium' : 'text-[#8a8a8a] hover:text-white hover:bg-white/[0.05]'}
      `}
    >
      <Icon size={16} className={isActive ? 'text-black' : ''} />
      <span>{label}</span>
    </Link>
  )
}

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
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-[240px] bg-[#050505] border-r border-[#171717] overflow-y-auto hidden lg:flex flex-col font-display">
      <Link href="/admin/dashboard" className="flex items-center gap-2.5 h-[60px] px-5 border-b border-[#171717] shrink-0">
        <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
        <span className="font-semibold tracking-tight text-white">VoidHub</span>
        <span className="ml-auto px-1.5 py-0.5 rounded border border-[#262626] font-gmono text-[0.6rem] text-[#8a8a8a]">admin</span>
      </Link>

      <nav className="flex-1 px-3 py-5 flex flex-col gap-6">
        {ADMIN_NAV.map(({ group, links }) => (
          <div key={group}>
            <p className="px-3 mb-2 font-gmono text-[0.6rem] uppercase tracking-[0.2em] text-[#525252]">{group}</p>
            <div className="flex flex-col gap-0.5">
              {links.map(link => <AdminNavLink key={link.href} {...link} isActive={pathname === link.href} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[#171717] shrink-0">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 h-9 px-3 rounded-lg text-[0.85rem] text-[#8a8a8a] hover:text-white hover:bg-white/[0.05] transition-colors">
          <ExternalIcon size={16} /><span>Visit site</span>
        </a>
        <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]">
          <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs font-semibold uppercase shrink-0">
            {(username || 'v').slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] text-white truncate">{username}</p>
            <p className="text-[0.68rem] text-[#6b6b6b]">Administrator</p>
          </div>
          <button onClick={handleLogout} aria-label="Log out" title="Log out" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b6b6b] hover:text-white hover:bg-white/[0.06] transition-colors">
            <LogoutIcon size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
