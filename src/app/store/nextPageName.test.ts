import { describe, expect, it } from 'vitest'
import { getNextPageName } from './nextPageName'

describe('getNextPageName', () => {
  it('picks the next number after a contiguous run of pages', () => {
    expect(getNextPageName([{ name: 'Page 1' }])).toBe('Page 2')
    expect(getNextPageName([{ name: 'Page 1' }, { name: 'Page 2' }])).toBe('Page 3')
  })

  it('reuses a number freed by closing a tab instead of growing past it', () => {
    // Pages went up to 16, then 15 and 16 were both closed, leaving only Page 1.
    expect(getNextPageName([{ name: 'Page 1' }])).toBe('Page 2')
  })

  it('fills the smallest gap rather than always appending at the end', () => {
    expect(getNextPageName([{ name: 'Page 1' }, { name: 'Page 3' }])).toBe('Page 2')
  })

  it('ignores renamed/non-matching page names when picking a number', () => {
    expect(getNextPageName([{ name: 'My Scratchpad' }, { name: 'Page 1' }])).toBe('Page 2')
  })

  it('starts at 1 when there are no numbered pages at all', () => {
    expect(getNextPageName([])).toBe('Page 1')
    expect(getNextPageName([{ name: 'Notes' }])).toBe('Page 1')
  })
})
