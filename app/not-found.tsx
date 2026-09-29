import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-black font-display flex items-center justify-center px-4 overflow-hidden mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" />
      <div className="absolute inset-0 mono-dots pointer-events-none" />
      <div className="relative flex flex-col items-center text-center">
        <img src="/logo.png" alt="VoidHub" className="w-14 h-14 object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]" />
        <p className="mt-8 font-semibold tracking-[-0.06em] leading-none text-[clamp(6rem,22vw,11rem)] text-chrome">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Lost in the void.</h1>
        <p className="mt-2 text-sm text-[#8a8a8a] max-w-xs">This page doesn&apos;t exist, or it got pulled in and never came back.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/" className="btn-white h-11 px-6 text-sm">Take me home</Link>
          <Link href="/games" className="btn-outline h-11 px-6 text-sm">Browse games</Link>
        </div>
      </div>
    </main>
  )
}
