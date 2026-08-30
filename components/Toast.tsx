'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckIcon, AlertIcon, AboutIcon, XIcon } from '@/components/Icons'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const borderColor = {
    success: 'border-success',
    error: 'border-danger',
    info: 'border-silver-faint',
  }[toast.type]

  const Icon = {
    success: CheckIcon,
    error: AlertIcon,
    info: AboutIcon,
  }[toast.type]

  const iconColor = {
    success: 'text-success',
    error: 'text-danger',
    info: 'text-silver-mid',
  }[toast.type]

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 
        bg-black-card border ${borderColor} rounded-lg
        shadow-lg animate-slideUp
        min-w-[280px] max-w-[400px]
      `}
    >
      <Icon size={18} className={iconColor} />
      <span className="flex-1 text-sm text-silver-bright font-body">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-silver-muted hover:text-white transition-colors"
      >
        <XIcon size={16} />
      </button>
    </div>
  )
}
