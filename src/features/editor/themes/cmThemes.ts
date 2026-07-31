import type { Extension } from '@codemirror/state'
import { createTheme } from '@uiw/codemirror-themes'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { nord } from '@uiw/codemirror-theme-nord'
import { monokai } from '@uiw/codemirror-theme-monokai'
import { githubDark } from '@uiw/codemirror-theme-github'
import { tags as t } from '@lezer/highlight'
import type { ThemeName } from '../../../app/types'
import { THEME_TOKENS, type ThemeTokens } from '../../../styles/theme-tokens'

function buildAppTheme(tokens: ThemeTokens, mode: 'light' | 'dark'): Extension {
  return createTheme({
    theme: mode,
    settings: {
      background: tokens.surfaceContainerLow,
      foreground: tokens.onSurface,
      caret: tokens.primary,
      selection: `${tokens.primaryContainer}55`,
      selectionMatch: `${tokens.primaryContainer}33`,
      gutterBackground: tokens.surfaceContainerLow,
      gutterForeground: tokens.outline,
      gutterActiveForeground: tokens.onSurface,
      lineHighlight: `${tokens.surfaceContainerHigh}80`,
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    },
    styles: [
      { tag: t.keyword, color: tokens.secondary },
      { tag: [t.string, t.special(t.string)], color: tokens.tertiary },
      { tag: t.comment, color: tokens.outline, fontStyle: 'italic' },
      { tag: [t.number, t.bool, t.null], color: tokens.tertiary },
      { tag: [t.definition(t.variableName), t.function(t.variableName)], color: tokens.primary },
      { tag: t.propertyName, color: tokens.onSurface },
      { tag: t.typeName, color: tokens.secondary },
      { tag: t.operator, color: tokens.onSurfaceVariant },
      { tag: t.className, color: tokens.secondary },
      { tag: t.invalid, color: tokens.error },
    ],
  })
}

/**
 * Bespoke "cyberterm" syntax theme, replicating a reference CYPH·IDE
 * cyberpunk mockup's exact per-token-type color assignments (neon green
 * keywords, cyan definitions, gold strings, purple numbers, pink
 * atoms/literals) rather than routing through this app's generic
 * primary/secondary/tertiary role mapping used by the other themes.
 */
function buildCyberpunkTheme(): Extension {
  const tokens = THEME_TOKENS.cyberpunk
  return createTheme({
    theme: 'dark',
    settings: {
      background: tokens.surfaceContainerLow,
      foreground: tokens.onSurface,
      caret: tokens.primary,
      selection: 'rgba(0, 212, 255, 0.15)',
      selectionMatch: 'rgba(0, 255, 65, 0.15)',
      gutterBackground: tokens.background,
      gutterForeground: '#3a5a3a',
      gutterActiveForeground: tokens.onSurface,
      lineHighlight: 'rgba(0, 255, 65, 0.035)',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    },
    styles: [
      { tag: t.keyword, color: tokens.primary, fontWeight: '600' },
      { tag: [t.definition(t.variableName), t.function(t.variableName)], color: tokens.secondary },
      { tag: t.variableName, color: tokens.onSurface },
      { tag: t.propertyName, color: '#56d4dd' },
      { tag: [t.operator, t.punctuation, t.bracket], color: '#7ee787' },
      { tag: t.number, color: '#c792ea' },
      { tag: [t.bool, t.null, t.atom], color: '#ff79c6' },
      { tag: [t.string, t.special(t.string)], color: tokens.tertiary },
      { tag: t.comment, color: '#3a5a3a', fontStyle: 'italic' },
      { tag: [t.typeName, t.className], color: tokens.secondary },
      { tag: t.tagName, color: tokens.error },
      { tag: t.attributeName, color: tokens.tertiary },
      { tag: t.invalid, color: tokens.error },
    ],
  })
}

/**
 * Maps an app theme to a CodeMirror 6 theme extension. Dracula/Nord/Monokai/
 * GitHub-Dark use their canonical ready-made `@uiw` themes; Light/Dark/
 * Cyberpunk are hand-rolled against this app's own semantic tokens so the
 * editor matches the bespoke chrome palette rather than a generic default.
 */
export function cmThemeForApp(theme: ThemeName): Extension {
  switch (theme) {
    case 'dracula':
      return dracula
    case 'nord':
      return nord
    case 'monokai':
      return monokai
    case 'github-dark':
      return githubDark
    case 'light':
      return buildAppTheme(THEME_TOKENS.light, 'light')
    case 'cyberpunk':
      return buildCyberpunkTheme()
    case 'dark':
    default:
      return buildAppTheme(THEME_TOKENS.dark, 'dark')
  }
}
