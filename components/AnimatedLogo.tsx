'use client'

import { useState, useEffect } from 'react'

interface AnimatedLogoProps {
  src: string
  alt: string
  size?: number
  className?: string
  /** Play the one-time reveal animation on mount. Default true. */
  playIntro?: boolean
}

/**
 * Logo with three animation states:
 *  - idle: a continuous slow glow pulse while just sitting there
 *  - intro: a one-time reveal that plays once on mount, then settles
 *  - interactive: a quick spin + glow burst on hover/click
 */
export default function AnimatedLogo({
  src,
  alt,
  size = 36,
  className = '',
  playIntro = true,
}: AnimatedLogoProps) {
  const [introPlaying, setIntroPlaying] = useState(playIntro)
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    if (!playIntro) return
    const t = setTimeout(() => setIntroPlaying(false), 900)
    return () => clearTimeout(t)
  }, [playIntro])

  const triggerBurst = () => {
    setBurst(true)
    setTimeout(() => setBurst(false), 700)
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 logo-idle ${introPlaying ? 'logo-intro' : ''} ${burst ? 'logo-burst' : ''} ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={triggerBurst}
      onClick={triggerBurst}
    >
      <span className="logo-ring" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="relative z-10 w-full h-full object-contain"
      />
    </span>
  )
}
