export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 animate-spin text-brand-600 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      aria-hidden
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
