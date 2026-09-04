import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Supported Games — Free Scripts',
  description:
    'Browse every game VoidHub supports. One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  openGraph: {
    title: 'Supported Games — Free Scripts | VoidHub',
    description:
      'One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  },
  twitter: {
    title: 'Supported Games — Free Scripts | VoidHub',
    description:
      'One universal loadstring covers the whole catalog — auto farm, ESP and more, updated daily. Free, no key required.',
  },
}

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children
}
