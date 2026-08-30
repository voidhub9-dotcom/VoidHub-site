'use client'

import { useState, useEffect } from 'react'
import { CopyIcon, CheckIcon } from '@/components/Icons'
import { getLoadstring, incrementCopyCount } from '@/lib/storage'
import { useToast } from '@/components/Toast'

export default function LoadstringBox() {
  const [loadstring, setLoadstring] = useState('')
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    setLoadstring(getLoadstring())
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(loadstring)
      setCopied(true)
      incrementCopyCount()
      showToast('Copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  return (
    <div
      className={`
        relative max-w-[560px] w-full mx-auto
        bg-black-card border border-border-mid rounded-lg
        border-l-[3px] border-l-white
        p-4 md:p-5 transition-all duration-300
        ${copied ? 'border-glow-md' : 'border-glow'}
      `}
    >
      {/* Label */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-heading text-[0.65rem] text-silver-muted tracking-[0.15em] uppercase">
          Loadstring
        </span>
        <button
          onClick={handleCopy}
          className="text-silver-mid hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Copy loadstring"
        >
          {copied ? (
            <CheckIcon size={18} className="text-success" />
          ) : (
            <CopyIcon size={18} />
          )}
        </button>
      </div>

      {/* Code */}
      <code className="font-code text-[0.85rem] text-silver-bright break-all leading-relaxed">
        {loadstring}
      </code>
    </div>
  )
}
