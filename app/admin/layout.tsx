'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AdminTopBar from '@/components/AdminTopBar'
import AdminSidebar from '@/components/AdminSidebar'
import { ToastProvider } from '@/components/Toast'
import { isAuthenticated } from '@/lib/storage'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/admin') {
      setLoading(false)
      return
    }

    const checkAuth = () => {
      const authenticated = isAuthenticated()
      if (!authenticated) {
        router.push('/admin')
      } else {
        setAuthed(true)
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [pathname, router])

  // Login page
  if (pathname === '/admin') {
    return <>{children}</>
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!authed) {
    return null
  }

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-black-void overflow-hidden">
        {/* Ambient grid + gradient glow, fixed behind everything */}
        <div className="fixed inset-0 hero-grid opacity-[0.12] pointer-events-none" aria-hidden="true" />
        <div
          className="fixed -top-32 -left-32 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,255,204,0.05), transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="fixed bottom-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06), transparent 70%)' }}
          aria-hidden="true"
        />

        <AdminTopBar />
        <AdminSidebar />
        <main className="relative pt-[60px] lg:pl-[220px]">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
