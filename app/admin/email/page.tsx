'use client'

import { useState } from 'react'
import { MailIcon, ShieldIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AdminEmailPage() {
  const { showToast } = useToast()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'text' | 'html'>('text')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const trimmedTo = to.trim()
    if (!trimmedTo || !EMAIL_REGEX.test(trimmedTo)) {
      showToast('Enter a valid recipient email address', 'error')
      return
    }
    if (!subject.trim()) {
      showToast('Subject is required', 'error')
      return
    }
    if (!body.trim()) {
      showToast('Email body is required', 'error')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({
          to: trimmedTo,
          subject: subject.trim(),
          [mode]: body,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      showToast(`Email sent to ${trimmedTo}`, 'success')
      setTo('')
      setSubject('')
      setBody('')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 admin-stagger">
        <p className="font-body text-xs text-silver-muted tracking-[0.3em] uppercase mb-1">Manage</p>
        <h1 className="font-heading text-2xl text-white tracking-wide">SEND EMAIL</h1>
        <p className="font-body text-sm text-silver-muted mt-1">
          Send a one-off email to any address through Resend — for support replies or manual notices
          outside the automated shop delivery flow.
        </p>
      </div>

      <div className="admin-panel p-5 space-y-4">
        <div>
          <label className="block font-body text-xs text-silver-muted mb-1.5">Recipient</label>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="someone@example.com"
            className="void-input"
          />
        </div>

        <div>
          <label className="block font-body text-xs text-silver-muted mb-1.5">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject line"
            className="void-input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-body text-xs text-silver-muted">Body</label>
            <div className="flex items-center gap-1 rounded-md border border-border-mid p-0.5">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-2.5 py-1 rounded font-body text-[0.7rem] transition-all ${
                  mode === 'text' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'
                }`}
              >
                Plain text
              </button>
              <button
                type="button"
                onClick={() => setMode('html')}
                className={`px-2.5 py-1 rounded font-body text-[0.7rem] transition-all ${
                  mode === 'html' ? 'bg-white text-black' : 'text-silver-muted hover:text-white'
                }`}
              >
                Raw HTML
              </button>
            </div>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={mode === 'html' ? '<p>Your message...</p>' : 'Your message...'}
            rows={10}
            className="void-input font-mono text-xs resize-y"
          />
          {mode === 'text' && (
            <p className="font-body text-[0.7rem] text-silver-faint mt-1.5">
              Sent as plain text with line breaks preserved — no formatting needed.
            </p>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-buy w-full"
        >
          <MailIcon size={16} />
          <span>{sending ? 'SENDING...' : 'SEND EMAIL'}</span>
        </button>

        <div className="flex items-start gap-2 pt-2 border-t border-border-dim">
          <ShieldIcon size={13} className="text-silver-faint shrink-0 mt-0.5" />
          <p className="font-body text-[0.7rem] text-silver-faint">
            Sent from the same verified sender as shop delivery emails. This does not go through
            the key-delivery template — it's a raw one-off email to whatever address you enter.
          </p>
        </div>
      </div>
    </div>
  )
}
