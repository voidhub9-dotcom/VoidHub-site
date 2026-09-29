import type { ReactNode } from 'react'

/**
 * Shared header for the public pages: spotlight + dot grid, a mono eyebrow,
 * a chrome title and an optional subtitle. `children` renders under it
 * (search bars, buttons, stats).
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  children,
}: {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'left'
  children?: ReactNode
}) {
  const centered = align === 'center'
  return (
    <section className="relative px-4 pt-32 md:pt-40 pb-12 md:pb-16 mono-grain">
      <div className="absolute inset-0 mono-spot pointer-events-none" />
      <div className="absolute inset-0 mono-dots pointer-events-none" />
      <div className={`relative max-w-6xl mx-auto flex flex-col ${centered ? 'items-center text-center' : 'items-start text-left'}`}>
        <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-[#262626] bg-white/[0.03] font-gmono text-[0.68rem] text-[#a3a3a3]">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          {eyebrow}
        </span>
        <h1 className="mt-6 font-display font-semibold tracking-[-0.04em] leading-[1] text-[clamp(2.4rem,6vw,4.4rem)] text-chrome">
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-5 font-display text-[#8a8a8a] text-base md:text-lg leading-relaxed max-w-xl ${centered ? 'mx-auto' : ''}`}>
            {subtitle}
          </p>
        )}
        {children && <div className={`mt-8 w-full ${centered ? 'flex justify-center' : ''}`}>{children}</div>}
      </div>
    </section>
  )
}
