import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Shop — Premium Keys',
  description:
    'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'Shop — Premium Keys | VoidHub',
    description:
      'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'Shop — Premium Keys | VoidHub',
    description:
      'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
