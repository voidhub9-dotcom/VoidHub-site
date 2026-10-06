'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function VerifyContent() {
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const username = params.get('username') || ''
  const error = params.get('error')

  return (
    <div className="min-h-screen bg-black font-display">
      <Navbar />

      <section className="relative px-4 pt-28 md:pt-40 pb-20 mono-grain flex flex-col items-center justify-center">
        <div className="absolute inset-0 mono-spot pointer-events-none opacity-60" />
        <div className="absolute inset-0 mono-dots pointer-events-none" />

        <div className="relative z-10 w-full max-w-[440px] text-center">

          {success ? (
            <>
              <span className="inline-flex w-16 h-16 rounded-2xl bg-success/10 border border-success/25 items-center justify-center text-success mb-6">
                <CheckIcon size={28} />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-chrome mb-3">You&apos;re verified!</h1>
              <p className="text-[#8a8a8a] text-sm mb-2">
                {username ? (
                  <>Linked as <span className="text-white font-medium">{username}</span>.</>
                ) : 'Your Discord account has been linked.'}
              </p>
              <p className="text-[#555] text-xs mb-8">Your data has been saved. You now have access to member-only features.</p>
              <Link href="/" className="btn-outline h-11 px-6 text-sm">← Back to site</Link>
            </>
          ) : error ? (
            <>
              <span className="inline-flex w-16 h-16 rounded-2xl bg-danger/10 border border-danger/25 items-center justify-center text-danger mb-6">
                <span className="text-2xl">✕</span>
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-chrome mb-3">Verification failed</h1>
              <p className="text-[#8a8a8a] text-sm mb-2">
                {error === 'access_denied' ? 'You cancelled the Discord login.'
                  : error === 'invalid_state' ? 'The session expired. Please try again.'
                  : error === 'token_exchange_failed' ? 'Could not connect to Discord. Please try again.'
                  : `Something went wrong (${error}).`}
              </p>
              <a href="/api/discord/login" className="btn-white h-11 px-6 text-sm mt-6 inline-flex items-center gap-2">
                <DiscordIcon size={16} /> Try again
              </a>
            </>
          ) : (
            <>
              <span className="inline-flex w-16 h-16 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 items-center justify-center text-[#5865F2] mb-6">
                <DiscordIcon size={28} />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-chrome mb-3">Verify your account</h1>
              <p className="text-[#8a8a8a] text-sm mb-2">
                Connect your Discord to get the <span className="text-white">Verified</span> role and access member features.
              </p>
              <p className="text-[#555] text-xs mb-8">We only read your username, avatar, and server membership. We never post anything on your behalf.</p>

              <a
                href="/api/discord/login"
                className="inline-flex items-center justify-center gap-2.5 w-full h-13 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium text-sm transition-colors"
              >
                <DiscordIcon size={18} />
                Continue with Discord
              </a>

              <div className="mt-6 p-4 rounded-xl border border-[#1c1c1c] bg-[#070707] text-left space-y-2.5">
                {[
                  ['Username & avatar', 'We display your name in the member list'],
                  ['Server membership', 'To confirm you\'re in the VoidHub Discord'],
                  ['No posting access', 'We cannot post, DM or interact as you'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="w-4 h-4 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon size={10} />
                    </span>
                    <div>
                      <p className="text-xs text-white">{title}</p>
                      <p className="text-xs text-[#555]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
