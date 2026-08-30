'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckIcon, CopyIcon, ClockIcon, AlertIcon, MailIcon } from '@/components/Icons'

interface OrderStatus {
  status: 'pending' | 'fulfilled' | 'paid_no_stock'
  productName: string
  deliveredKey: string | null
  emailSent: boolean
}

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 15

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/shop/order/${sessionId}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data = await res.json()
        if (!cancelled) setOrder(data)
        if (!cancelled && data.status === 'pending' && pollCount < MAX_POLLS) {
          setTimeout(() => setPollCount(c => c + 1), POLL_INTERVAL_MS)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [sessionId, pollCount])

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <main className="pt-32 pb-20 px-4 min-h-[70vh]">
      <div className="max-w-md mx-auto">
        <div className="void-card p-8 text-center">
          {!sessionId || notFound ? (
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
                This usually takes just a few seconds.
              </p>
            </>
          ) : order.status === 'fulfilled' && order.deliveredKey ? (
            <>
              <CheckIcon size={36} className="text-success mx-auto mb-4" />
              <h1 className="font-heading text-xl text-white mb-2">Payment successful</h1>
              <p className="font-body text-silver-mid text-sm mb-6">{order.productName}</p>
              <div className="flex items-center gap-2 bg-black-surface border border-border-mid rounded-lg px-4 py-3 mb-4">
                <code className="flex-1 text-left font-mono text-sm text-silver-bright break-all">
                  {order.deliveredKey}
                </code>
                <button
                  onClick={() => handleCopy(order.deliveredKey!)}
                  className="shrink-0 p-2 text-silver-muted hover:text-white transition-colors"
                  aria-label="Copy key"
                >
                  {copied ? <CheckIcon size={16} className="text-success" /> : <CopyIcon size={16} />}
                </button>
              </div>
              <p className="font-body text-silver-faint text-xs mb-2">
                Save this key now — keep it somewhere safe.
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
