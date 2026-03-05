import type { Metadata } from 'next'
import Link from 'next/link'
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
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-gray-900">
              Gacha Agent
            </Link>
            <div className="flex gap-6 text-sm font-medium">
              <Link href="/portfolio" className="text-gray-600 hover:text-gray-900">
                Portfolio
              </Link>
              <Link href="/market" className="text-gray-600 hover:text-gray-900">
                Market
              </Link>
              <Link href="/watchlist" className="text-gray-600 hover:text-gray-900">
                Watchlist
              </Link>
              <Link href="/upload" className="text-gray-600 hover:text-gray-900">
                Upload
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
