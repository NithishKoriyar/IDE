import { useEffect, useRef } from 'react'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers as lineNumbersExt,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  placeholder as placeholderExtension,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language'
import { search, searchKeymap, selectNextOccurrence } from '@codemirror/search'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { useSettingsStore } from '../../app/store/settingsStore'
import { cmThemeForApp } from './themes/cmThemes'

interface CodeMirrorEditorProps {
  /** Identity key -- changing this recreates the EditorView (e.g. switching pages), resetting undo history/cursor. */
  docId: string
  value: string
  onChange: (value: string) => void
  languageExtension: Extension
  onRun?: () => void
  className?: string
  /** Ghost text shown only while the document is empty -- never inserted into the value. */
  placeholder?: string
}

/** Always-on editor behavior that isn't user-configurable (kept simple and
 * fixed rather than exposed as settings): active-line highlight, bracket
 * matching, auto-close brackets/quotes, auto-indent, and a themed cursor. */
const staticEditorBehavior: Extension = [
  highlightActiveLine(),
  bracketMatching(),
  closeBrackets(),
  keymap.of(closeBracketsKeymap),
  indentOnInput(),
  drawSelection({ cursorBlinkRate: 1200 }),
  EditorView.theme({ '.cm-cursor': { borderLeftColor: 'var(--color-primary)' } }),
]

export function CodeMirrorEditor({
  docId,
  value,
  onChange,
  languageExtension,
  onRun,
  className,
  placeholder,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun

  const compartments = useRef({
    theme: new Compartment(),
    language: new Compartment(),
    tabSize: new Compartment(),
    lineWrap: new Compartment(),
    lineNumbers: new Compartment(),
    autocomplete: new Compartment(),
    fontAppearance: new Compartment(),
    placeholder: new Compartment(),
  }).current

  const settings = useSettingsStore((s) => s.editor)
  const suggestions = useSettingsStore((s) => s.suggestions)
  const theme = useSettingsStore((s) => s.theme)

  /** Raw (unwrapped) extension content for each toggleable axis -- fed into
   * `.of()` on initial creation and `.reconfigure()` on updates. These must
   * stay as plain Extensions; wrapping them in `.of()` before handing them to
   * `.reconfigure()` nests a compartment inside itself ("Duplicate use of
   * compartment in extensions"). */
  function buildRawExtensions() {
    return {
      theme: cmThemeForApp(theme),
      language: languageExtension,
      tabSize: [
        indentUnit.of(' '.repeat(settings.tabSize)),
        EditorState.tabSize.of(settings.tabSize),
      ] as Extension,
      lineWrap: (settings.wordWrap ? EditorView.lineWrapping : []) as Extension,
      lineNumbers: (settings.lineNumbers
        ? [lineNumbersExt(), highlightActiveLineGutter()]
        : []) as Extension,
      autocomplete: (suggestions.autocomplete
        ? autocompletion({ activateOnTyping: true })
        : []) as Extension,
      fontAppearance: buildFontAppearance(settings.fontFamily, settings.fontSize),
      placeholder: (placeholder ? placeholderExtension(placeholder) : []) as Extension,
    }
  }

  // (Re)create the view when the document identity changes (page switch).
  useEffect(() => {
    if (!containerRef.current) return

    const raw = buildRawExtensions()
    const state = EditorState.create({
      doc: value,
      extensions: [
        compartments.theme.of(raw.theme),
        compartments.language.of(raw.language),
        compartments.tabSize.of(raw.tabSize),
        compartments.lineWrap.of(raw.lineWrap),
        compartments.lineNumbers.of(raw.lineNumbers),
        compartments.autocomplete.of(raw.autocomplete),
        compartments.fontAppearance.of(raw.fontAppearance),
        compartments.placeholder.of(raw.placeholder),
        staticEditorBehavior,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        indentationMarkers(),
        history(),
        search({ top: true }),
        foldGutter(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        keymap.of([
          { key: 'Mod-d', run: selectNextOccurrence },
          {
            key: 'Mod-Enter',
            run: () => {
              onRunRef.current?.()
              return true
            },
          },
          {
            key: 'Mod-s',
            run: () => {
              onRunRef.current?.()
              return true
            },
          },
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on docId: this recreates the whole editor state
  }, [docId])

  // Reconfigure compartments in place when settings/theme/language change (no doc reset).
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const raw = buildRawExtensions()
    view.dispatch({
      effects: [
        compartments.theme.reconfigure(raw.theme),
        compartments.language.reconfigure(raw.language),
        compartments.tabSize.reconfigure(raw.tabSize),
        compartments.lineWrap.reconfigure(raw.lineWrap),
        compartments.lineNumbers.reconfigure(raw.lineNumbers),
        compartments.autocomplete.reconfigure(raw.autocomplete),
        compartments.fontAppearance.reconfigure(raw.fontAppearance),
        compartments.placeholder.reconfigure(raw.placeholder),
      ],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, settings, suggestions, languageExtension, placeholder])

  // Sync external value changes (e.g. Format Code) that didn't originate from this view's own typing.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reacting to external value changes, not our own emissions
  }, [value])

  return <div ref={containerRef} className={className} />
}

function buildFontAppearance(fontFamily: 'mono' | 'sans', fontSize: number): Extension {
  const family =
    fontFamily === 'sans'
      ? "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
      : "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace"
  return EditorView.theme({
    '&': { fontSize: `${fontSize}px` },
    '.cm-content, .cm-gutters': { fontFamily: family },
  })
}
