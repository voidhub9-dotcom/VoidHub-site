import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Public API',
  description:
    'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  openGraph: {
    title: 'Public API | VoidHub',
    description: 'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  },
  twitter: {
    title: 'Public API | VoidHub',
    description: 'Free, no-auth REST API for the VoidHub games catalog — CORS enabled, rate limited, fully documented.',
  },
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
