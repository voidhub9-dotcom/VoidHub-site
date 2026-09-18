import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Script Status',
  description:
    'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  openGraph: {
    title: 'Script Status | VoidHub',
    description: 'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  },
  twitter: {
    title: 'Script Status | VoidHub',
    description: 'Live status for every VoidHub script — see what’s working and what’s being updated, in real time.',
  },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
