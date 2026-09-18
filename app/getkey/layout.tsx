import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Your Free Key',
  description:
    'Get a free VoidHub key in seconds — complete one quick step, no payment required.',
  openGraph: {
    title: 'Get Your Free Key | VoidHub',
    description: 'Get a free VoidHub key in seconds — complete one quick step, no payment required.',
  },
  twitter: {
    title: 'Get Your Free Key | VoidHub',
    description: 'Get a free VoidHub key in seconds — complete one quick step, no payment required.',
  },
}

export default function GetKeyLayout({ children }: { children: React.ReactNode }) {
  return children
}
