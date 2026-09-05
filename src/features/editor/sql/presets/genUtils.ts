/** Small deterministic helpers shared by preset seed generators -- no randomness, so the
 * generated data (and its row counts / FK ids) is stable across runs and machines. */

export function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addHours(iso: string, hours: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCHours(d.getUTCHours() + hours)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
