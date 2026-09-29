'use client'

import { useState, useEffect } from 'react'
import { CopyIcon, CheckIcon } from '@/components/Icons'
import { getLoadstring, incrementCopyCount } from '@/lib/storage'
import { useToast } from '@/components/Toast'

/** Lua-ish highlight in greys: keywords bright, the URL string dimmer. */
function Highlighted({ code }: { code: string }) {
  const parts = code.split(/("[^"]*")/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('"') ? (
          <span key={i} className="text-[#8f8f8f]">{part}</span>
        ) : (
          <span key={i}>
            {part.split(/(loadstring|game)/g).map((w, j) =>
              w === 'loadstring' || w === 'game'
                ? <span key={j} className="text-white">{w}</span>
                : <span key={j} className="text-[#bdbdbd]">{w}</span>,
            )}
          </span>
        ),
      )}
    </>
  )
}

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
    } catch {
      const el = document.createElement('textarea')
      el.value = loadstring
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    incrementCopyCount()
    showToast('Script copied. Paste it into your executor.', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mono-card w-full !rounded-2xl overflow-hidden text-left">
      <div className="flex items-center justify-between h-9 px-4 border-b border-[#1c1c1c]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2e2e2e]" />
          <span className="w-2 h-2 rounded-full bg-[#2e2e2e]" />
          <span className="w-2 h-2 rounded-full bg-[#2e2e2e]" />
        </span>
        <span className="font-gmono text-[0.65rem] text-[#6b6b6b]">loader.lua</span>
      </div>
      <div className="flex items-center gap-3 pl-4 pr-2.5 py-2.5">
        <code className="min-w-0 flex-1 font-gmono text-[0.74rem] md:text-[0.8rem] break-all leading-relaxed select-text">
          <Highlighted code={loadstring} /><span className="caret text-white">▍</span>
        </code>
        <button
          onClick={handleCopy}
          className={`shrink-0 h-9 px-4 text-[0.8rem] ${copied ? 'btn-outline' : 'btn-white'}`}
          aria-label="Copy loadstring"
        >
          {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  )
}
