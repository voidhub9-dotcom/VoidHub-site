'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { ExternalIcon, LogoutIcon, MenuIcon, XIcon } from '@/components/Icons'
import { ADMIN_NAV, AdminNavLink } from '@/components/AdminSidebar'
import { logout } from '@/lib/storage'

function currentLabel(pathname: string) {
  for (const { group, links } of ADMIN_NAV) {
    const hit = links.find(l => l.href === pathname)
    if (hit) return { group, label: hit.label }
  }
  return { group: 'Admin', label: pathname.split('/').filter(Boolean).pop() ?? 'Admin' }
}

export default function AdminTopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { group, label } = currentLabel(pathname)

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-[240px] z-30 h-[60px] bg-black/80 backdrop-blur-xl border-b border-[#171717] font-display">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/dashboard" className="lg:hidden shrink-0">
              <img src="/logo.png" alt="VoidHub" className="w-7 h-7 object-contain" />
            </Link>
            <span className="hidden sm:inline font-gmono text-[0.7rem] text-[#525252]">{group}</span>
            <span className="hidden sm:inline text-[#333]">/</span>
            <span className="text-sm text-white capitalize truncate">{label}</span>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex btn-outline h-8 px-3.5 text-xs">
              <ExternalIcon size={13} /><span>Visit site</span>
            </a>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#a3a3a3] hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden font-display">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#050505] border-l border-[#171717] flex flex-col">
            <div className="flex items-center justify-between h-[60px] px-4 border-b border-[#171717]">
              <span className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
                <span className="font-semibold tracking-tight text-white">VoidHub</span>
              </span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#a3a3a3] hover:text-white" aria-label="Close menu">
                <XIcon size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-6">
              {ADMIN_NAV.map(({ group: g, links }) => (
                <div key={g}>
                  <p className="px-3 mb-2 font-gmono text-[0.6rem] uppercase tracking-[0.2em] text-[#525252]">{g}</p>
                  <div className="flex flex-col gap-0.5">
                    {links.map(link => (
                      <AdminNavLink key={link.href} {...link} isActive={pathname === link.href} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-[#171717] flex flex-col gap-1">
              <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 h-10 px-3 rounded-lg text-sm text-[#8a8a8a] hover:text-white hover:bg-white/[0.05]">
                <ExternalIcon size={16} /><span>Visit site</span>
              </a>
              <button onClick={handleLogout} className="flex items-center gap-3 h-10 px-3 rounded-lg text-sm text-[#8a8a8a] hover:text-white hover:bg-white/[0.05]">
                <LogoutIcon size={16} /><span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
