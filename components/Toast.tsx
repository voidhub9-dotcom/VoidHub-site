'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckIcon, AlertIcon, XIcon } from '@/components/Icons'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Errors stay a bit longer so they can actually be read.
const DURATION: Record<ToastType, number> = { success: 2600, info: 3200, error: 4500 }
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${counter.current++}`
    const duration = DURATION[type]
    setToasts(prev => [...prev.filter(t => t.message !== message), { id, message, type, duration }].slice(-MAX_VISIBLE))
    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Bottom centre; on phones it sits above the tab bar */}
      <div
        className="fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none bottom-24 md:bottom-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="status"
        aria-live="polite"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const badge = {
    success: 'bg-white text-black',
    error: 'bg-danger/15 text-danger border border-danger/40',
    info: 'bg-white/10 text-white border border-white/20',
  }[toast.type]
  const bar = { success: 'bg-white', error: 'bg-danger', info: 'bg-[#8a8a8a]' }[toast.type]

  return (
    <div
      className="toast-in pointer-events-auto relative overflow-hidden flex items-center gap-3 pl-3 pr-2 py-2.5 w-full max-w-[420px] rounded-2xl border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-xl shadow-[0_18px_50px_-10px_rgba(0,0,0,0.9)]"
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${badge}`}>
        {toast.type === 'error' ? <AlertIcon size={14} /> : toast.type === 'success' ? <CheckIcon size={14} /> : <span className="text-xs font-semibold">i</span>}
      </span>
      <span className="flex-1 min-w-0 text-sm text-white leading-snug break-words">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <XIcon size={13} />
      </button>
      <span className={`toast-bar absolute left-0 bottom-0 h-[2px] ${bar}`} style={{ animationDuration: `${toast.duration}ms` }} />
    </div>
  )
}
