function safeSerializeValue(value: unknown, depth: number, seen: WeakSet<object>): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const t = typeof value
  if (t === 'string') return depth === 0 ? (value as string) : JSON.stringify(value)
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value)
  if (t === 'function') return `[Function: ${(value as { name?: string }).name || 'anonymous'}]`
  if (t === 'symbol') return (value as symbol).toString()
  if (value instanceof Error) return `${value.name}: ${value.message}`

  if (t === 'object') {
    const obj = value as object
    if (seen.has(obj)) return '[Circular]'
    if (depth > 4) return Array.isArray(value) ? '[Array]' : '[Object]'
    seen.add(obj)

    if (Array.isArray(value)) {
      return `[ ${value.map((v) => safeSerializeValue(v, depth + 1, seen)).join(', ')} ]`
    }
    if (value instanceof Map) {
      const entries = [...value.entries()]
        .map(([k, v]) => `${safeSerializeValue(k, depth + 1, seen)} => ${safeSerializeValue(v, depth + 1, seen)}`)
        .join(', ')
      return `Map(${value.size}) {${entries}}`
    }
    if (value instanceof Set) {
      const entries = [...value.values()].map((v) => safeSerializeValue(v, depth + 1, seen)).join(', ')
      return `Set(${value.size}) {${entries}}`
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${safeSerializeValue(v, depth + 1, seen)}`)
      .join(', ')
    return `{ ${entries} }`
  }

  return String(value)
}

/** Structured-clone-safe, depth-limited, circular-ref-safe stringification for console output. */
export function formatConsoleArgs(args: unknown[]): string {
  return args.map((a) => safeSerializeValue(a, 0, new WeakSet())).join(' ')
}
