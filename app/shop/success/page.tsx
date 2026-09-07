'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckIcon, CopyIcon, ClockIcon, AlertIcon, MailIcon } from '@/components/Icons'

interface OrderStatus {
  status: 'pending' | 'fulfilled' | 'paid_no_stock' | 'expired' | 'invalid' | 'canceled' | 'refunded'
  isTest: boolean
  paymentProvider: string
  productName: string
  quantity: number
  deliveredKeys: string[] | null
  emailSent: boolean
}

const POLL_INTERVAL_MS = 5000
const MAX_POLLS = 120

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      try {
        const res = await fetch(`/api/shop/order/${sessionId}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (!res.ok) throw new Error('Status lookup failed')
        const data = await res.json()
        if (!cancelled) setOrder(data)
        if (!cancelled && data.status === 'pending' && pollCount < MAX_POLLS) {
          timer = setTimeout(() => setPollCount(c => c + 1), POLL_INTERVAL_MS)
        }
      } catch {
        if (!cancelled) setStatusError(true)
      }
    }

    poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [sessionId, pollCount])

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // ignore
    }
  }

  const handleCopyAll = async () => {
    if (!order?.deliveredKeys) return
    try {
      await navigator.clipboard.writeText(order.deliveredKeys.join('\n'))
      setCopiedKey('__all__')
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <main className="pt-32 pb-20 px-4 min-h-[70vh]">
      <div className="max-w-md mx-auto">
        <div className="void-card p-8 text-center">
          {statusError ? (
            <>
              <AlertIcon size={36} className="text-warning mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">Unable to check payment</h1>
              <p className="font-body text-silver-mid text-sm">Please try again. If you have sent funds, keep this receipt and do not pay again while the status is unknown.</p>
              <code className="block mt-3 font-mono text-xs text-silver-muted break-all">{sessionId}</code>
              <button className="btn-buy mt-4" onClick={() => { setStatusError(false); setPollCount(c => c + 1) }}>Try again</button>
            </>
          ) : !sessionId || notFound ? (
            <>
              <AlertIcon size={36} className="text-danger mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">Order not found</h1>
              <p className="font-body text-silver-mid text-sm mb-6">
                We couldn&apos;t find a matching order. If you were just charged, check your
                email or contact support.
              </p>
            </>
          ) : !order || order.status === 'pending' ? (
            <>
              <div className="spinner-cyan mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">Confirming payment...</h1>
              <p className="font-body text-silver-mid text-sm">
                {sessionId?.startsWith('crypto_')
                  ? 'Blockchain confirmation can take several minutes. Keep this receipt link; do not pay again while confirmation is pending.'
                  : 'This usually takes just a few seconds.'}
                {pollCount >= MAX_POLLS && ' Still waiting. Check your email or contact support with the order reference below.'}
              </p>
              <code className="block mt-3 font-mono text-xs text-silver-muted break-all">{sessionId}</code>
              {pollCount >= MAX_POLLS && <button className="btn-buy mt-4" onClick={() => setPollCount(0)}>Check again</button>}
            </>
          ) : ['expired', 'invalid', 'canceled', 'refunded'].includes(order.status) ? (
            <>
              <AlertIcon size={36} className="text-warning mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">{order.status === 'refunded' ? 'Payment refunded' : 'Payment not completed'}</h1>
              <p className="font-body text-silver-mid text-sm">Invoice status: {order.status}. If you sent funds, contact support with this reference before starting another payment.</p>
              <code className="block mt-3 font-mono text-xs text-silver-muted break-all">{sessionId}</code>
            </>
          ) : order.status === 'fulfilled' && order.deliveredKeys && order.deliveredKeys.length > 0 ? (
            <>
              <CheckIcon size={36} className="text-success mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">{order.isTest ? 'Test payment successful' : 'Payment successful'}</h1>
              <p className="font-body text-silver-mid text-sm mb-6">
                {order.productName}
                {order.deliveredKeys.length > 1 && ` · ${order.deliveredKeys.length} keys`}
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {order.deliveredKeys.map((key, i) => (
                  <div key={i} className="flex items-center gap-2 bg-black-surface border border-border-mid rounded-lg px-4 py-3">
                    <code className="flex-1 text-left font-mono text-sm text-silver-bright break-all">
                      {key}
                    </code>
                    <button
                      onClick={() => handleCopy(key)}
                      className="shrink-0 p-2 text-silver-muted hover:text-white transition-colors"
                      aria-label={`Copy key ${i + 1}`}
                    >
                      {copiedKey === key ? <CheckIcon size={16} className="text-success" /> : <CopyIcon size={16} />}
                    </button>
                  </div>
                ))}
              </div>
              {order.deliveredKeys.length > 1 && (
                <button
                  onClick={handleCopyAll}
                  className="inline-flex items-center gap-1.5 mb-4 font-body text-xs text-silver-mid hover:text-white transition-colors"
                >
                  {copiedKey === '__all__' ? <CheckIcon size={12} className="text-success" /> : <CopyIcon size={12} />}
                  Copy all keys
                </button>
              )}
              {order.quantity > order.deliveredKeys.length && (
                <p className="flex items-center justify-center gap-1.5 font-body text-warning text-xs mb-3">
                  <AlertIcon size={12} /> Only {order.deliveredKeys.length} of {order.quantity} paid for were in
                  stock — contact support with your order reference for the rest.
                </p>
              )}
              <p className="font-body text-silver-faint text-xs mb-2">
                Save {order.deliveredKeys.length > 1 ? 'these keys' : 'this key'} now — keep{' '}
                {order.deliveredKeys.length > 1 ? 'them' : 'it'} somewhere safe.
              </p>
              {order.emailSent && (
                <p className="flex items-center justify-center gap-1.5 font-body text-silver-faint text-xs">
                  <MailIcon size={12} /> A copy was also emailed to you.
                </p>
              )}
            </>
          ) : (
            <>
              <ClockIcon size={36} className="text-warning mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">Payment received</h1>
              <p className="font-body text-silver-mid text-sm mb-6">
                Your key is being prepared and will be delivered shortly. If it doesn&apos;t
                arrive, contact support with this order reference:
              </p>
              <code className="font-mono text-xs text-silver-muted break-all">{sessionId}</code>
            </>
          )}

          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 mt-6 px-5 py-2.5 border border-silver-faint text-silver-mid rounded-lg font-body text-sm transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
          >
            Back to shop
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function ShopSuccessPage() {
  return (
    <div className="min-h-screen bg-black-void">
      <Navbar />
      <Suspense fallback={<div className="pt-32 text-center text-silver-muted font-body">Loading...</div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  )
}
