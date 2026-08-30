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

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-[700px]' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        className={`
          relative z-10 w-full ${maxWidth}
          bg-black-card border border-border-mid rounded-xl
          shadow-[0_0_60px_rgba(255,255,255,0.05)]
          animate-slideUp mb-16
        `}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dim">
          <h2 className="font-heading text-[1.1rem] text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-silver-muted hover:text-white transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
