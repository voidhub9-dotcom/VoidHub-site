'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockIcon, EyeIcon, EyeOffIcon, ShieldIcon } from '@/components/Icons'
import AnimatedLogo from '@/components/AnimatedLogo'
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
    <div className="min-h-screen bg-black-void flex items-center justify-center p-4">
      {/* Background Grid */}
      <div className="fixed inset-0 hero-grid animate-gridDrift opacity-30" />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Login Card */}
        <div
          className={`
            admin-panel
            shadow-[0_0_60px_rgba(255,255,255,0.04)]
            p-8
            ${shake ? 'animate-shake' : ''}
          `}
        >
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <AnimatedLogo src="/logo.png" alt="VoidHub Logo" size={64} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black-surface border border-border-mid flex items-center justify-center">
                <ShieldIcon size={12} className="text-silver-mid" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="font-heading text-[1.3rem] text-white mb-1 tracking-wider">ADMIN ACCESS</h1>
            <p className="font-body text-silver-muted text-[0.8rem]">
              Enter your password to open the control panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="block font-heading text-[0.65rem] text-silver-muted tracking-widest uppercase mb-2"
              >
                Password
              </label>
              <div className="relative">
                <LockIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-muted" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className={`
                    w-full h-12 pl-11 pr-12
                    bg-black-surface border rounded-lg
                    text-silver-bright font-body text-sm
                    placeholder:text-silver-faint
                    focus:outline-none transition-all duration-200
                    ${error ? 'border-danger' : 'border-silver-faint focus:border-white focus:shadow-[0_0_8px_rgba(255,255,255,0.15)]'}
                  `}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-silver-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-silver-faint bg-black-surface accent-white"
              />
              <label htmlFor="remember" className="font-body text-silver-muted text-sm cursor-pointer">
                Keep me logged in
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <p className="font-body text-danger text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full !h-12 !py-0 font-heading text-[0.85rem] tracking-wider"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LockIcon size={16} />
                  <span>UNLOCK PANEL</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p className="text-center mt-5">
          <Link
            href="/"
            className="font-body text-silver-muted text-sm hover:text-white transition-colors"
          >
            {'← Back to site'}
          </Link>
        </p>
      </div>
    </div>
  )
}
