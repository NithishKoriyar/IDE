import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

/**
 * Lightweight syntax-only linter (no real static analysis / ESLint-in-browser
 * -- out of scope for this app's size). Test-parses the buffer via the
 * Function constructor (never invoked) and surfaces a SyntaxError as a
 * whole-document diagnostic; precise error positions aren't reliably
 * available across engines, so this reports the error message without
 * pinpointing a column.
 */
export function jsLinter(): Extension {
  return [
    linter((view) => {
      const code = view.state.doc.toString()
      const diagnostics: Diagnostic[] = []
      try {
        // eslint-disable-next-line no-new-func -- syntax-check only, never invoked
        new Function(code)
      } catch (err) {
        diagnostics.push({
          from: 0,
          to: view.state.doc.length,
          severity: 'error',
          source: 'syntax',
          message: err instanceof Error ? err.message : String(err),
        })
      }
      return diagnostics
    }),
    lintGutter(),
  ]
}
