import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Orbitron, Syne, JetBrains_Mono, Geist, Geist_Mono } from 'next/font/google'
import AntiDebug from '@/components/AntiDebug'
import MaintenanceGate from '@/components/MaintenanceGate'
import './globals.css'
import { OG_IMAGE } from '@/lib/seo'

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

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.voidon.top'),
  title: {
    default: 'VoidHub | Free Keyless Roblox Scripts',
    template: '%s | VoidHub',
  },
  description:
    'VoidHub is a free, keyless Roblox script hub. One loadstring, every supported game, no keys, no checkpoints, no ads.',
  keywords: [
    'Roblox scripts', 'free Roblox scripts', 'VoidHub', 'keyless Roblox scripts',
    'Roblox executor', 'Roblox exploits', 'Blox Fruits script', 'free script hub',
    'premium Roblox scripts', 'Roblox hack free',
  ],
  authors: [{ name: 'VoidHub' }],
  creator: 'VoidHub',
  publisher: 'VoidHub',
  robots: { index: true, follow: true },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    title: 'VoidHub | Free Keyless Roblox Scripts',
    description:
      'Free, keyless Roblox scripts. One loadstring, every supported game.',
    url: '/',
    locale: 'en_US',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoidHub | Free Keyless Roblox Scripts',
    description:
      'Free, keyless Roblox scripts. One loadstring, every supported game.',
    images: [OG_IMAGE],
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
      className={`${orbitron.variable} ${syne.variable} ${jetbrainsMono.variable} ${geist.variable} ${geistMono.variable} bg-black-void`}
    >
      <body className="font-body antialiased bg-black-void text-white min-h-screen select-none">
        <AntiDebug />
        <MaintenanceGate>{children}</MaintenanceGate>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
