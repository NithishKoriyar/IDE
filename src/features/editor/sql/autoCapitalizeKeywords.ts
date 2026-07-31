import { EditorState, type Extension, type TransactionSpec } from '@codemirror/state'

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete',
  'create', 'table', 'drop', 'alter', 'add', 'column', 'primary', 'key', 'foreign',
  'references', 'not', 'null', 'default', 'unique', 'check', 'and', 'or', 'order', 'by',
  'group', 'having', 'limit', 'offset', 'join', 'inner', 'left', 'right', 'outer', 'on',
  'as', 'distinct', 'count', 'avg', 'sum', 'min', 'max', 'asc', 'desc', 'union', 'all',
  'exists', 'in', 'between', 'like', 'is', 'case', 'when', 'then', 'else', 'end',
  'begin', 'commit', 'rollback', 'transaction', 'index', 'view', 'trigger', 'if',
  'autoincrement', 'integer', 'text', 'real', 'blob', 'numeric', 'with', 'recursive',
])

const BOUNDARY_CHARS = new Set([' ', '\n', '\t', '(', ')', ',', ';'])
const TRAILING_WORD = /[A-Za-z_]+$/

/**
 * Independent of the autocomplete popup (CM6's `upperCaseKeywords` config
 * only affects text inserted by *accepting* a completion) -- uppercases a
 * keyword the instant it's fully typed and followed by a word boundary, e.g.
 * "select " -> "SELECT ". Gated by its own settings toggle.
 */
export function autoCapitalizeKeywords(): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr

    let inserted = ''
    let boundaryFrom = -1
    tr.changes.iterChanges((_fromA, _toA, fromB, toB, insertedText) => {
      boundaryFrom = fromB
      inserted = insertedText.toString()
      void toB
    })

    if (inserted.length !== 1 || !BOUNDARY_CHARS.has(inserted)) return tr

    const line = tr.state.doc.lineAt(boundaryFrom)
    const textBefore = tr.state.doc.sliceString(line.from, boundaryFrom)
    const match = TRAILING_WORD.exec(textBefore)
    if (!match) return tr

    const word = match[0]
    const upper = word.toUpperCase()
    if (word === upper || !SQL_KEYWORDS.has(word.toLowerCase())) return tr

    const wordFrom = boundaryFrom - word.length
    const specs: TransactionSpec[] = [tr, { changes: { from: wordFrom, to: boundaryFrom, insert: upper } }]
    return specs
  })
}
