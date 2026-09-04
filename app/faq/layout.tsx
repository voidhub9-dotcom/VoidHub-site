import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  openGraph: {
    title: 'FAQ | VoidHub',
    description: 'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  },
  twitter: {
    title: 'FAQ | VoidHub',
    description: 'Answers to common questions about VoidHub scripts, keys, executors and account safety.',
  },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
