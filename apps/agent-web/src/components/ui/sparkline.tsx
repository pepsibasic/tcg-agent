interface SparklineProps {
  points: (number | null)[]
  width?: number
  height?: number
  className?: string
}

export function Sparkline({ points, width = 80, height = 24, className = '' }: SparklineProps) {
  const valid = points.filter((p): p is number => p != null)
  if (valid.length < 2) return <span className="text-xs text-gray-400">—</span>

  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1

  const coords: string[] = []
  let idx = 0
  for (const p of points) {
    if (p != null) {
      const x = (idx / (points.length - 1)) * width
      const y = height - ((p - min) / range) * (height - 2) - 1
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    idx++
  }

  const trending = valid[valid.length - 1] >= valid[0]
  const color = trending ? '#22c55e' : '#ef4444'

  return (
    <svg width={width} height={height} className={className} aria-label="Price sparkline">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
