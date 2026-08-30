'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDownIcon, CopyIcon, CheckIcon, AlertIcon, ExternalIcon, LockIcon, MailIcon,
} from '@/components/Icons'
import { useToast } from '@/components/Toast'

function getAdminKey() {
  if (typeof window === 'undefined') return 'voidhub123'
  return localStorage.getItem('voidhub_password') || 'voidhub123'
}

interface StripeStatus {
  configured: boolean
  webhookConfigured: boolean
  emailConfigured: boolean
  ok: boolean
  testMode: boolean | null
  message: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      showToast(`Copied ${label}`, 'success')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast('Could not copy — select and copy manually', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2 bg-black-surface border border-border-mid rounded-lg px-3 py-2 mt-2">
      <code className="flex-1 font-mono text-xs text-silver-bright break-all">{value}</code>
      <button
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="shrink-0 p-1.5 rounded-md text-silver-muted hover:text-white hover:bg-black-elevated transition-colors"
      >
        {copied ? <CheckIcon size={13} className="text-success" /> : <CopyIcon size={13} />}
      </button>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-black-elevated border border-border-mid flex items-center justify-center font-heading text-[0.65rem] text-silver-light">
        {n}
      </span>
      <div className="flex-1 pb-5 border-l border-border-dim ml-3 pl-6 -mt-1 last:border-transparent last:pb-0">
        <p className="font-body text-sm text-white mb-1">{title}</p>
        <div className="font-body text-xs text-silver-mid leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export default function StripeSetupGuide() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://yourdomain.com/api/shop/webhook')
  const [openedOnce, setOpenedOnce] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/shop/webhook`)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stripe-status', { headers: { 'x-admin-key': getAdminKey() } })
      const data = await res.json()
      setStatus(data)
      // Auto-expand the guide until Stripe is fully wired up, then default to collapsed.
      if (!openedOnce) {
        setOpen(!(data.configured && data.ok && data.webhookConfigured))
        setOpenedOnce(true)
      }
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const fullyReady = status?.configured && status.ok && status.webhookConfigured

  return (
    <div className="admin-panel mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${
            loading ? 'bg-black-elevated border-border-mid text-silver-muted'
              : fullyReady ? 'bg-success/10 border-success/30 text-success'
              : 'bg-warning/10 border-warning/30 text-warning'
          }`}>
            <LockIcon size={16} />
          </span>
          <div className="min-w-0">
            <p className="font-body text-sm text-white">Stripe Setup Guide</p>
            <p className="font-body text-xs text-silver-muted truncate">
              {loading
                ? 'Checking connection...'
                : status?.configured
                  ? status.ok
                    ? `${status.testMode ? 'Test mode' : 'Live mode'}${status.webhookConfigured ? ' · webhook connected' : ' · webhook secret missing'}`
                    : 'Secret key set but Stripe rejected it'
                  : 'Not connected yet — payments are disabled'}
            </p>
          </div>
        </div>
        <ChevronDownIcon size={18} className={`shrink-0 text-silver-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="px-5 pb-6 pt-1 border-t border-border-dim">
            {!loading && status && !status.ok && status.configured && (
              <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 mb-5 mt-4">
                <AlertIcon size={14} className="text-danger shrink-0 mt-0.5" />
                <p className="font-body text-xs text-danger">{status.message}</p>
              </div>
            )}

            <div className="mt-5">
              <Step n={1} title="Create a Stripe account">
                Sign up at{' '}
                <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-info hover:underline inline-flex items-center gap-1">
                  stripe.com <ExternalIcon size={10} />
                </a>{' '}
                if you don&apos;t have one yet. Free to create — Stripe only takes a cut per transaction.
              </Step>

              <Step n={2} title="Add your secret key">
                In the Stripe Dashboard, go to{' '}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-info hover:underline inline-flex items-center gap-1">
                  Developers → API keys <ExternalIcon size={10} />
                </a>{' '}
                and copy your <strong className="text-silver-light">Secret key</strong>. In Vercel, go to your
                project → Settings → Environment Variables and add it as:
                <CopyField label="STRIPE_SECRET_KEY" value="STRIPE_SECRET_KEY" />
              </Step>

              <Step n={3} title="Create the webhook endpoint">
                Still in Stripe, go to{' '}
                <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-info hover:underline inline-flex items-center gap-1">
                  Developers → Webhooks <ExternalIcon size={10} />
                </a>{' '}
                → Add endpoint. Paste this as the endpoint URL:
                <CopyField label="webhook URL" value={webhookUrl} />
                Then select the <strong className="text-silver-light">checkout.session.completed</strong> event
                (that&apos;s the only one this site listens for).
              </Step>

              <Step n={4} title="Add the webhook signing secret">
                After creating the endpoint, Stripe shows a{' '}
                <strong className="text-silver-light">Signing secret</strong> (starts with{' '}
                <code className="text-silver-mid">whsec_</code>). Add it in Vercel as:
                <CopyField label="STRIPE_WEBHOOK_SECRET" value="STRIPE_WEBHOOK_SECRET" />
                This is what proves a payment notification actually came from Stripe — without it, keys never
                get delivered after checkout.
              </Step>

              <Step n={5} title="Redeploy">
                New environment variables only apply after a fresh deploy — trigger one from Vercel (or push
                any commit) once both values are saved.
              </Step>

              <Step n={6} title="Enable Adaptive Pricing (optional)">
                In Stripe →{' '}
                <a href="https://dashboard.stripe.com/settings/adaptive-pricing" target="_blank" rel="noopener noreferrer" className="text-info hover:underline inline-flex items-center gap-1">
                  Settings → Adaptive Pricing <ExternalIcon size={10} />
                </a>{' '}
                → turn it on. Stripe then auto-converts your prices to each buyer&apos;s local currency at
                checkout — no code changes needed here.
              </Step>

              <Step n={7} title="Email delivery backup (optional)">
                <span className={`inline-flex items-center gap-1 mb-1 ${status?.emailConfigured ? 'text-success' : 'text-silver-faint'}`}>
                  <MailIcon size={11} />{status?.emailConfigured ? 'Configured' : 'Not configured'}
                </span>
                <br />
                Add a free API key from{' '}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-info hover:underline inline-flex items-center gap-1">
                  resend.com <ExternalIcon size={10} />
                </a>{' '}
                as <code className="text-silver-mid">RESEND_API_KEY</code> to also email the key to buyers as a
                backup to the on-page reveal.
              </Step>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
