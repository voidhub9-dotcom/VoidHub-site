import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Public API',
  description:
    'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'Public API | VoidHub',
    description: 'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'Public API | VoidHub',
    description: 'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  },
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
