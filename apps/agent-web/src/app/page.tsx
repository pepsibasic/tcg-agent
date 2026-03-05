import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        See what your card collection is worth.
      </h1>
      <p className="mb-8 max-w-md text-lg text-gray-600">
        Get AI-powered portfolio analysis, discover your collector archetype,
        and find your next move.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/upload?tab=vault"
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Import from Gacha Vault
        </Link>
        <Link
          href="/upload?tab=manual"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Add cards
        </Link>
      </div>
      <Link
        href="/portfolio"
        className="mt-6 text-sm text-gray-500 underline hover:text-gray-700"
      >
        View my portfolio
      </Link>
    </div>
  )
}
