'use client'

import { ReactNode, useEffect } from 'react'
import { XIcon } from '@/components/Icons'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

// Older call sites pass SHOUTY titles; show them in sentence case.
const tidy = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t)

/** Bottom sheet on phones, centred dialog from md up. */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-[700px]' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-start justify-center md:p-6 md:pt-16 overflow-y-auto font-display">
      <div className="sheet-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`sheet-panel relative z-10 w-full ${maxWidth} max-h-[94vh] md:max-h-none overflow-y-auto md:overflow-visible
          bg-[#080808] border border-[#222] rounded-t-[28px] md:rounded-[24px] md:mb-16
          shadow-[0_-20px_80px_-30px_rgba(255,255,255,0.18)]`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 md:px-6 h-16 border-b border-[#181818] bg-[#080808]/95 backdrop-blur rounded-t-[28px] md:rounded-t-[24px]">
          <h2 className="text-lg font-semibold tracking-tight text-white">{tidy(title)}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center rounded-full text-[#8a8a8a] hover:text-white hover:bg-white/[0.06] transition-colors">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-5 md:p-6" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>
  )
}
