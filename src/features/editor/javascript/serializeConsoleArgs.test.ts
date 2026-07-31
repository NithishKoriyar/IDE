import { describe, expect, it } from 'vitest'
import { formatConsoleArgs } from './serializeConsoleArgs'

describe('formatConsoleArgs', () => {
  it('prints top-level strings without quotes, joined by spaces', () => {
    expect(formatConsoleArgs(['Sorted:', 'done'])).toBe('Sorted: done')
  })

  it('formats arrays and nested strings with quotes', () => {
    expect(formatConsoleArgs([[1, 2, 'a']])).toBe('[ 1, 2, "a" ]')
  })

  it('formats plain objects as key: value pairs', () => {
    expect(formatConsoleArgs([{ a: 1, b: 'x' }])).toBe('{ a: 1, b: "x" }')
  })

  it('handles null and undefined', () => {
    expect(formatConsoleArgs([null, undefined])).toBe('null undefined')
  })

  it('formats Error objects as "Name: message"', () => {
    expect(formatConsoleArgs([new TypeError('bad')])).toBe('TypeError: bad')
  })

  it('detects circular references instead of recursing forever', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(formatConsoleArgs([obj])).toBe('{ a: 1, self: [Circular] }')
  })

  it('caps recursion depth for deeply nested structures', () => {
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } }
    expect(formatConsoleArgs([deep])).toContain('[Object]')
  })

  it('formats Map and Set with their size', () => {
    expect(formatConsoleArgs([new Map([['x', 1]])])).toBe('Map(1) {"x" => 1}')
    expect(formatConsoleArgs([new Set([1, 2])])).toBe('Set(2) {1, 2}')
  })

  it('labels functions by name (or "anonymous")', () => {
    function namedFn() {}
    expect(formatConsoleArgs([namedFn])).toBe('[Function: namedFn]')
    expect(formatConsoleArgs([() => {}])).toBe('[Function: anonymous]')
  })
})
