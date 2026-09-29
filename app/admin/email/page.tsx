'use client'

import { useState } from 'react'
import { MailIcon, ShieldIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { PageHead, Section, Field, Segmented, inputCls, textareaCls } from '@/components/AdminUI'

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

  const plainPreview = body.trim() ? body : 'Your message will show up here as you type.'

  return (
    <div className="max-w-6xl mx-auto">
      <PageHead
        eyebrow="Manage"
        title="Send email"
        subtitle="A one-off email to any address through Resend, for support replies or notices."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Section title="Compose">
          <div className="flex flex-col gap-5">
            <Field label="To" htmlFor="em-to">
              <input id="em-to" type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="someone@example.com" className={inputCls} />
            </Field>
            <Field label="Subject" htmlFor="em-subject">
              <input id="em-subject" type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" className={inputCls} />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b]">Message</span>
                <Segmented value={mode} onChange={setMode} options={[{ value: 'text', label: 'Text' }, { value: 'html', label: 'HTML' }]} />
              </div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={mode === 'html' ? '<p>Your message…</p>' : 'Your message…'}
                rows={12}
                className={`${textareaCls} ${mode === 'html' ? 'font-gmono text-[0.8rem]' : ''}`}
              />
              <p className="mt-1.5 text-[0.72rem] text-[#6b6b6b]">
                {mode === 'text' ? 'Line breaks are kept. No formatting needed.' : 'Sent exactly as written. Check the preview.'}
              </p>
            </div>
            <button onClick={handleSend} disabled={sending} className="btn-white h-12 text-sm w-full disabled:opacity-50">
              {sending ? <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <MailIcon size={16} />}
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </Section>

        {/* Preview */}
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 font-gmono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6b6b]">Preview</p>
          <div className="rounded-2xl border border-[#1c1c1c] bg-[#070707] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
                  <img src="/logo.png" alt="" className="w-5 h-5 object-contain invert" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white">VoidHub</p>
                  <p className="text-xs text-[#6b6b6b] truncate">to {to.trim() || 'someone@example.com'}</p>
                </div>
              </div>
              <p className="mt-4 text-lg font-semibold tracking-tight text-white break-words">{subject.trim() || 'Subject line'}</p>
            </div>
            {mode === 'html' && body.trim() ? (
              <iframe title="Email preview" sandbox="" srcDoc={body} className="w-full h-[420px] bg-white" />
            ) : (
              <p className={`px-5 py-5 text-sm leading-relaxed whitespace-pre-wrap break-words ${body.trim() ? 'text-[#d4d4d4]' : 'text-[#555]'}`}>{plainPreview}</p>
            )}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[0.72rem] text-[#555]">
            <ShieldIcon size={12} className="mt-0.5 shrink-0" /> Sent from your verified Resend sender address.
          </p>
        </div>
      </div>
    </div>
  )
}
