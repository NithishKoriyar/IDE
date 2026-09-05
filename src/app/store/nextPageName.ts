const PAGE_NAME_PATTERN = /^Page (\d+)$/

/**
 * Smallest unused "Page N" name given the currently open pages. Computed
 * fresh from `pages` every time (rather than a persisted ever-incrementing
 * counter) so numbers freed by closing a tab get reused instead of the
 * next tab jumping past every tab ever created in this session.
 */
export function getNextPageName(pages: ReadonlyArray<{ name: string }>): string {
  const used = new Set(
    pages
      .map((p) => PAGE_NAME_PATTERN.exec(p.name)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number),
  )
  let n = 1
  while (used.has(n)) n++
  return `Page ${n}`
}
