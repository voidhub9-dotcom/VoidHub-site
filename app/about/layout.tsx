import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description:
    'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  openGraph: {
    title: 'About | VoidHub',
    description: 'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  },
  twitter: {
    title: 'About | VoidHub',
    description: 'What VoidHub is, how the universal loader works, and why the core scripts are free.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
