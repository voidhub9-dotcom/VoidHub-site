'use client'

import { useState } from 'react'

/**
 * Executor icon: renders a custom image when an icon URL is set,
 * otherwise a deterministic monogram badge (same executor always
 * gets the same color). Falls back to the monogram if the image
 * fails to load, so a bad URL never shows a broken image.
 */

const PALETTE = [
  { bg: 'rgba(125, 255, 224, 0.12)', fg: '#7dffe0', ring: 'rgba(125, 255, 224, 0.35)' },
  { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa', ring: 'rgba(96, 165, 250, 0.35)' },
  { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fbbf24', ring: 'rgba(251, 191, 36, 0.35)' },
  { bg: 'rgba(248, 113, 113, 0.12)', fg: '#f87171', ring: 'rgba(248, 113, 113, 0.35)' },
  { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34d399', ring: 'rgba(52, 211, 153, 0.35)' },
  { bg: 'rgba(244, 114, 182, 0.12)', fg: '#f472b6', ring: 'rgba(244, 114, 182, 0.35)' },
  { bg: 'rgba(148, 163, 184, 0.12)', fg: '#cbd5e1', ring: 'rgba(148, 163, 184, 0.35)' },
]

/**
 * Real brand colors for well-known executors so their badges match the
 * actual product instead of a random hash color. Unknown executors still
 * fall back to the deterministic hashed palette below.
 */
const BRAND_COLORS: Record<string, { fg: string }> = {
  delta: { fg: '#ff7a00' }, // Delta orange
  codex: { fg: '#3b82f6' }, // Codex blue
  wave: { fg: '#38bdf8' }, // Wave sky blue
  xeno: { fg: '#22c55e' }, // Xeno green
  solara: { fg: '#f59e0b' }, // Solara amber/sun
  potassium: { fg: '#a78bfa' }, // Potassium purple
  seliware: { fg: '#e11d48' }, // Seliware red
  macsploit: { fg: '#ef4444' }, // MacSploit red
  arceus: { fg: '#f43f5e' }, // Arceus X rose
  'arceus x': { fg: '#f43f5e' },
  velocity: { fg: '#06b6d4' }, // Velocity cyan
  ronix: { fg: '#8b5cf6' }, // Ronix violet
  cosmic: { fg: '#6366f1' }, // Cosmic indigo
  volt: { fg: '#eab308' }, // Volt yellow
  madium: { fg: '#10b981' }, // Madium emerald
  real: { fg: '#f97316' }, // Real orange
  bunni: { fg: '#f472b6' }, // Bunni pink
  'bunni.lol': { fg: '#f472b6' },
  swift: { fg: '#0ea5e9' }, // Swift blue
  krnl: { fg: '#dc2626' }, // Krnl red
  fluxus: { fg: '#7c3aed' }, // Fluxus purple
  hydrogen: { fg: '#2dd4bf' }, // Hydrogen teal
  evon: { fg: '#4ade80' }, // Evon green
  zenith: { fg: '#c084fc' }, // Zenith light purple
  matcha: { fg: '#84cc16' }, // Matcha green
  photon: { fg: '#fbbf24' }, // Photon light
}

function brandFor(name: string) {
  const key = name.trim().toLowerCase()
  const hit = BRAND_COLORS[key] || BRAND_COLORS[key.split(/\s+/)[0]]
  if (!hit) return null
  const { fg } = hit
  // Derive matching translucent bg/ring from the brand color
  const rgb = [1, 3, 5].map(i => parseInt(fg.slice(i, i + 2), 16)).join(', ')
  return { fg, bg: `rgba(${rgb}, 0.12)`, ring: `rgba(${rgb}, 0.4)` }
}

function hashName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface ExecutorIconProps {
  name: string
  icon?: string
  size?: number
  className?: string
}

export default function ExecutorIcon({ name, icon, size = 36, className = '' }: ExecutorIconProps) {
  const [broken, setBroken] = useState(false)
  const color = brandFor(name || '') ?? PALETTE[hashName(name || '?') % PALETTE.length]
  const initials = (name || '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (icon && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon || "/placeholder.svg"}
        alt={`${name} icon`}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={`shrink-0 rounded-lg object-cover border border-border-dim bg-black-elevated ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`shrink-0 flex items-center justify-center rounded-lg font-heading select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: color.bg,
        color: color.fg,
        border: `1px solid ${color.ring}`,
        fontSize: Math.max(10, Math.round(size * 0.34)),
        letterSpacing: '0.05em',
      }}
    >
      {initials}
    </span>
  )
}
