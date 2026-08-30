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
  metadataBase: new URL('https://www.voidon.top'),
  title: {
    default: 'VoidHub | Free Roblox Scripts & Premium Keys',
    template: '%s | VoidHub',
  },
  description:
    'VoidHub provides free Roblox scripts for the most popular games, plus premium keys in the Shop for instant delivery. No paywall on the free tier.',
  keywords: [
    'Roblox scripts', 'free Roblox scripts', 'VoidHub', 'Roblox key shop',
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
    title: 'VoidHub | Free Roblox Scripts & Premium Keys',
    description:
      'Free Roblox scripts for the most popular games, plus premium keys in the Shop for instant delivery.',
    images: [
      {
        url: '/logo.png',
        width: 256,
        height: 256,
        alt: 'VoidHub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'VoidHub | Free Roblox Scripts & Premium Keys',
    description:
      'Free Roblox scripts for the most popular games, plus premium keys in the Shop.',
    images: ['/logo.png'],
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
