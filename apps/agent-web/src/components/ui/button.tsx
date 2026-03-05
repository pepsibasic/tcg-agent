'use client'

import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-brand-500',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
}

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
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
      )}
      {children}
    </button>
  )
}
