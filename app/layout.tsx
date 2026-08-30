import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Orbitron, Syne, JetBrains_Mono } from 'next/font/google'
import AntiDebug from '@/components/AntiDebug'
import MaintenanceGate from '@/components/MaintenanceGate'
import './globals.css'

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'VoidHub | Free Keyless Roblox Scripts',
    template: '%s | VoidHub',
  },
  description:
    'Free. Keyless. No Limits. VoidHub provides 100% free and keyless Roblox scripts for the most popular games. No paywalls, no key systems.',
  keywords: [
    'Roblox scripts', 'free Roblox scripts', 'keyless Roblox', 'VoidHub',
    'Roblox executor', 'Roblox exploits', 'Blox Fruits script', 'free script hub',
    'no key script', 'Roblox hack free',
  ],
  authors: [{ name: 'VoidHub' }],
  creator: 'VoidHub',
  publisher: 'VoidHub',
  robots: { index: true, follow: true },
  icons: {
    icon: 'https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png',
    apple: 'https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    title: 'VoidHub | Free Keyless Roblox Scripts',
    description:
      'Free. Keyless. No Limits. 100% free Roblox scripts for the most popular games — no key system, no paywalls.',
    images: [
      {
        url: 'https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png',
        width: 512,
        height: 512,
        alt: 'VoidHub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'VoidHub | Free Keyless Roblox Scripts',
    description:
      'Free. Keyless. No Limits. 100% free Roblox scripts — no key system, no paywalls.',
    images: ['https://i.gyazo.com/6563500fdd13be5167583dafb30df1d9.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${syne.variable} ${jetbrainsMono.variable} bg-black-void`}
    >
      <body className="font-body antialiased bg-black-void text-white min-h-screen select-none">
        <AntiDebug />
        <MaintenanceGate>{children}</MaintenanceGate>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
