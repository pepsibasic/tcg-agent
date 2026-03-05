import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from '../sparkline'

describe('Sparkline', () => {
  it('renders SVG with valid points', () => {
    const { container } = render(<Sparkline points={[10, 20, 15, 25]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    const polyline = svg?.querySelector('polyline')
    expect(polyline).toBeTruthy()
    expect(polyline?.getAttribute('points')).toBeTruthy()
  })

  it('renders dash when fewer than 2 valid points', () => {
    const { container } = render(<Sparkline points={[null, null, 5]} />)
    expect(container.textContent).toBe('—')
  })

  it('skips null values in coordinates', () => {
    const { container } = render(<Sparkline points={[10, null, 20, 30]} />)
    const polyline = container.querySelector('polyline')
    const pts = polyline?.getAttribute('points') || ''
    // Should have 3 coordinate pairs (skipping the null)
    expect(pts.split(' ').length).toBe(3)
  })

  it('uses green stroke for uptrend', () => {
    const { container } = render(<Sparkline points={[10, 20, 30]} />)
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('stroke')).toBe('#22c55e')
  })

  it('uses red stroke for downtrend', () => {
    const { container } = render(<Sparkline points={[30, 20, 10]} />)
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('stroke')).toBe('#ef4444')
  })
})
