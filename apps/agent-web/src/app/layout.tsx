import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gacha Portfolio Agent',
  description: 'See what your card collection is worth.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
