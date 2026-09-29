import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  openGraph: {
    type: 'website',
    siteName: 'VoidHub',
    images: [OG_IMAGE],
    title: 'FAQ | VoidHub',
    description: 'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
    title: 'FAQ | VoidHub',
    description: 'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
