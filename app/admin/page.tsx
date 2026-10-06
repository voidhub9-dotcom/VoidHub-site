'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockIcon, EyeIcon, EyeOffIcon } from '@/components/Icons'
import { login, isAuthenticated, STORAGE_KEYS } from '@/lib/storage'

function FingerprintIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17a13.5 13.5 0 0 0 6.42 4.62" />
      <path d="M2 12a10 10 0 0 0 10 10" />
      <path d="M12 2a10 10 0 0 1 9.17 5.97" />
      <path d="M12 6a6 6 0 0 0-6 6c0 1.63-.08 4.23-.2 5.5" />
      <path d="M16.62 11.02c.3 1.4.3 3.52 0 4.95" />
      <path d="M20.57 13.48c.01 1.23-.22 2.44-.3 3.01" />
    </svg>
  )
}

async function passkeyAuth(): Promise<'ok' | 'none' | 'error'> {
  try {
    const rpId = window.location.hostname
    const optsRes = await fetch(`/api/admin/passkey/options?mode=authenticate`)
    if (!optsRes.ok) return 'none'
    const opts = await optsRes.json()
    if (!opts.allowCredentials?.length) return 'none'

    const credential = await navigator.credentials.get({
      publicKey: {
        ...opts,
        challenge: Uint8Array.from(atob(opts.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        allowCredentials: opts.allowCredentials.map((c: any) => ({
          ...c,
          id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0)),
        })),
        rpId,
      },
    }) as PublicKeyCredential | null

    if (!credential) return 'error'
    const resp = credential.response as AuthenticatorAssertionResponse
    const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

    const verRes = await fetch('/api/admin/passkey/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: credential.id,
        rawId: b64url(credential.rawId),
        response: {
          authenticatorData: b64url(resp.authenticatorData),
          clientDataJSON: b64url(resp.clientDataJSON),
          signature: b64url(resp.signature),
          userHandle: resp.userHandle ? b64url(resp.userHandle) : null,
        },
        type: credential.type,
      }),
    })
    const result = await verRes.json()
    return result.ok ? 'ok' : 'error'
  } catch (e: any) {
    if (e?.name === 'NotAllowedError') return 'error'
    return 'error'
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)

  useEffect(() => {
    // Check if passkeys are supported and a credential is registered
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      fetch('/api/admin/passkey/options?mode=authenticate')
        .then(r => r.json())
        .then(d => { if (d.allowCredentials?.length) setHasPasskey(true) })
        .catch(() => {})
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(password, remember)

    if (success) {
      router.push('/admin/dashboard')
    } else {
      setError('Access denied. Wrong password.')
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 400)
    }

    setLoading(false)
  }

  const handlePasskey = async () => {
    setError('')
    setPasskeyLoading(true)
    const result = await passkeyAuth()
    if (result === 'ok') {
      // Mark session as authenticated
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEYS.AUTH, 'true')
      storage.setItem(STORAGE_KEYS.USER, 'admin')
      if (remember) localStorage.setItem(STORAGE_KEYS.REMEMBER, 'true')
      router.push('/admin/dashboard')
    } else if (result === 'none') {
      setError('No passkey registered. Log in with your password first.')
    } else {
      setError('Passkey sign-in failed. Try again or use your password.')
    }
    setPasskeyLoading(false)
  }

  return (
    <div className="relative min-h-screen bg-black font-display flex items-center justify-center p-4 overflow-hidden mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" />
      <div className="absolute inset-0 mono-dots pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="VoidHub" className="w-16 h-16 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.35)]" />
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-chrome">Welcome back.</h1>
          <p className="mt-2 text-sm text-[#8a8a8a]">Sign in to open the panel.</p>
        </div>

        {hasPasskey && (
          <button
            onClick={handlePasskey}
            disabled={passkeyLoading}
            className="w-full h-12 mb-4 rounded-xl border border-[#262626] bg-[#0a0a0a] hover:border-[#444] hover:bg-[#111] text-white text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
          >
            {passkeyLoading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <><FingerprintIcon size={18} /> Sign in with passkey</>}
          </button>
        )}

        {hasPasskey && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1c1c1c]" />
            <span className="text-xs text-[#555]">or password</span>
            <div className="flex-1 h-px bg-[#1c1c1c]" />
          </div>
        )}

        <form onSubmit={handleSubmit} className={`mono-card p-6 space-y-4 ${shake ? 'animate-shake' : ''}`}>
          <div>
            <label htmlFor="admin-password" className="block font-gmono text-[0.62rem] uppercase tracking-[0.2em] text-[#6b6b6b] mb-2">
              Password
            </label>
            <div className="relative">
              <LockIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus={!hasPasskey}
                autoComplete="current-password"
                placeholder="••••••••••"
                className={`w-full h-12 pl-11 pr-12 rounded-xl bg-black border text-white text-sm placeholder:text-[#444] focus:outline-none transition-all duration-200 ${
                  error ? 'border-danger/60' : 'border-[#262626] focus:border-[#6b6b6b] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
            <span className="text-sm text-[#8a8a8a]">Keep me logged in</span>
          </label>

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <button type="submit" disabled={loading || !password} className="btn-white w-full h-12 text-sm disabled:opacity-50 disabled:pointer-events-none">
            {loading
              ? <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              : <>Unlock panel</>}
          </button>
        </form>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[#6b6b6b] hover:text-white transition-colors">← Back to site</Link>
        </p>
      </div>
    </div>
  )
}
