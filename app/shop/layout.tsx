import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop — Premium Keys',
  description:
    'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  openGraph: {
    title: 'Shop — Premium Keys | VoidHub',
    description:
      'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  },
  twitter: {
    title: 'Shop — Premium Keys | VoidHub',
    description:
      'Buy premium VoidHub keys for instant delivery via secure Stripe checkout. Lifetime and time-limited plans available.',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
