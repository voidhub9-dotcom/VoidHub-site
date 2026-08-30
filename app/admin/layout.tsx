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
      <div className="min-h-screen bg-black-void">
        <AdminTopBar />
        <AdminSidebar />
        <main className="pt-[60px] lg:pl-[220px]">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
