'use client'

import { useRef, useState } from 'react'

/**
 * Admin image field that accepts BOTH a pasted URL and a direct upload
 * from the device. Uploading posts to /api/admin/upload and fills the
 * value with the returned same-origin URL.
 */

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

interface ImageUploadInputProps {
  id: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
  /** Extra class for the wrapper */
  className?: string
}

export default function ImageUploadInput({
  id,
  value,
  onChange,
  placeholder = 'https://... or upload',
  className = '',
}: ImageUploadInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-key': getAdminKey() },
        body: form,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
      onChange(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="void-input flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 py-2 rounded-md border border-silver-faint font-body text-xs text-silver-mid transition-all duration-200 hover:border-white hover:text-white disabled:opacity-50 disabled:pointer-events-none"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          aria-label="Upload image from device"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>
      {error && <p className="font-body text-xs text-danger mt-1">{error}</p>}
      {value.trim() && (
        <div className="mt-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value || "/placeholder.svg"}
            alt="Preview"
            className="h-9 w-9 rounded-md object-cover border border-border-dim bg-black-elevated"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="font-body text-xs text-silver-muted hover:text-danger transition-colors duration-200"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
