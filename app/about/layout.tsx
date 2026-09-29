import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About',
  description:
    'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'About | VoidHub',
    description: 'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'About | VoidHub',
    description: 'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
