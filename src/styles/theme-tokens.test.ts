import { describe, expect, it } from 'vitest'
import { THEME_TOKENS } from './theme-tokens'
import { THEME_NAMES } from '../app/types'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

describe('THEME_TOKENS', () => {
  it('defines every app theme', () => {
    expect(Object.keys(THEME_TOKENS).sort()).toEqual([...THEME_NAMES].sort())
  })

  for (const theme of THEME_NAMES) {
    it(`"${theme}" has a valid 6-digit hex value for every token`, () => {
      const tokens = THEME_TOKENS[theme]
      for (const [key, value] of Object.entries(tokens)) {
        expect(value, `${theme}.${key}`).toMatch(HEX_COLOR)
      }
    })
  }
})
