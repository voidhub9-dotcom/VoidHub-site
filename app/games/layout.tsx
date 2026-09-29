import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Supported Games — Free Scripts',
  description:
    'Browse every game VoidHub supports. One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'Supported Games — Free Scripts | VoidHub',
    description:
      'One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'Supported Games — Free Scripts | VoidHub',
    description:
      'One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  },
}

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children
}
