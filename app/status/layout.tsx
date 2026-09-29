import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Script Status',
  description:
    'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'Script Status | VoidHub',
    description: 'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'Script Status | VoidHub',
    description: 'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
