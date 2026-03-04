export function sanitizeInput(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

export function wrapUserInput(type: string, value: string): string {
  const escaped = sanitizeInput(value)
  return `<user_input type="${type}">${escaped}</user_input>`
}
