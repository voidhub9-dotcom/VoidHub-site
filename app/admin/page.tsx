'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockIcon, EyeIcon, EyeOffIcon } from '@/components/Icons'
import { login } from '@/lib/storage'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

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

  return (
    <div className="relative min-h-screen bg-black font-display flex items-center justify-center p-4 overflow-hidden mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" />
      <div className="absolute inset-0 mono-dots pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="VoidHub" className="w-16 h-16 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.35)]" />
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-chrome">Welcome back.</h1>
          <p className="mt-2 text-sm text-[#8a8a8a]">Enter the admin password to open the panel.</p>
        </div>

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
                autoFocus
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
