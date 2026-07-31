import { snippetCompletion } from '@codemirror/autocomplete'
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'

/**
 * Curated static completion source instead of a real in-browser TypeScript
 * language service (way oversized for a no-imports single-file playground).
 * Covers the spec's own example: typing "ma" should suggest map(), Math,
 * max(), match(). DOM members are included for learning-reference value even
 * though calling them throws inside the worker sandbox (no document/window
 * there) -- a deliberate, documented trade-off.
 */
const arrayMethods = [
  'at', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find',
  'findIndex', 'findLast', 'findLastIndex', 'flat', 'flatMap', 'forEach', 'from',
  'includes', 'indexOf', 'isArray', 'join', 'keys', 'lastIndexOf', 'map', 'of',
  'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some',
  'sort', 'splice', 'toReversed', 'toSorted', 'toSpliced', 'unshift', 'values', 'with',
]

const objectMethods = [
  'assign', 'create', 'defineProperty', 'entries', 'freeze', 'fromEntries',
  'getOwnPropertyNames', 'getPrototypeOf', 'is', 'isFrozen', 'keys', 'values',
  'hasOwnProperty',
]

const mathMembers = [
  'abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt', 'random',
  'trunc', 'sign', 'log', 'log2', 'log10', 'exp', 'PI', 'E', 'hypot', 'cbrt',
]

const stringMethods = [
  'charAt', 'charCodeAt', 'concat', 'endsWith', 'includes', 'indexOf',
  'lastIndexOf', 'match', 'matchAll', 'padEnd', 'padStart', 'repeat', 'replace',
  'replaceAll', 'slice', 'split', 'startsWith', 'substring', 'toLowerCase',
  'toUpperCase', 'trim', 'trimEnd', 'trimStart',
]

const dateMembers = [
  'now', 'getDate', 'getDay', 'getFullYear', 'getHours', 'getMinutes',
  'getMonth', 'getSeconds', 'getTime', 'toISOString', 'toLocaleDateString',
  'toLocaleString', 'toLocaleTimeString',
]

const promiseMembers = ['all', 'allSettled', 'any', 'race', 'resolve', 'reject', 'then', 'catch', 'finally']

const consoleMembers = ['log', 'error', 'warn', 'info', 'table', 'clear', 'group', 'groupEnd', 'assert', 'count', 'time', 'timeEnd']

const domMembers = ['querySelector', 'querySelectorAll', 'getElementById', 'createElement', 'addEventListener', 'removeEventListener']

const globalNames = [
  'Array', 'Object', 'Math', 'String', 'Date', 'Promise', 'console', 'JSON',
  'Number', 'Boolean', 'Map', 'Set', 'Symbol', 'RegExp', 'Error',
]

const receiverMembers: Record<string, string[]> = {
  Array: arrayMethods,
  Object: objectMethods,
  Math: mathMembers,
  String: stringMethods,
  Date: dateMembers,
  Promise: promiseMembers,
  console: consoleMembers,
  document: domMembers,
  window: domMembers,
}

const flattenedMethodPool = Array.from(
  new Set([...arrayMethods, ...stringMethods, ...mathMembers, ...objectMethods, ...dateMembers]),
)

/** Approximates VS Code's "parameter hints" without a real signature-help
 * subsystem (CM6 doesn't have one) -- shown as the completion's `detail`. */
const PARAM_HINTS: Record<string, string> = {
  map: '(callback, thisArg?)', filter: '(callback, thisArg?)', forEach: '(callback, thisArg?)',
  reduce: '(callback, initialValue?)', reduceRight: '(callback, initialValue?)',
  find: '(callback)', findIndex: '(callback)', some: '(callback)', every: '(callback)',
  sort: '(compareFn?)', slice: '(start?, end?)', splice: '(start, deleteCount?, ...items)',
  push: '(...items)', concat: '(...items)', join: '(separator?)',
  includes: '(searchElement)', indexOf: '(searchElement)',
  charAt: '(index)', substring: '(start, end?)', replace: '(pattern, replacement)',
  replaceAll: '(pattern, replacement)', padStart: '(targetLength, padString?)', padEnd: '(targetLength, padString?)',
  repeat: '(count)', split: '(separator?)',
  log: '(...args)', table: '(data)', warn: '(...args)', error: '(...args)',
}

const jsSnippets: Completion[] = [
  snippetCompletion('for (let ${index} = 0; ${index} < ${array}.length; ${index}++) {\n\t${}\n}', {
    label: 'for', type: 'keyword', detail: 'for loop',
  }),
  snippetCompletion('if (${condition}) {\n\t${}\n}', { label: 'if', type: 'keyword', detail: 'if statement' }),
  snippetCompletion('function ${name}(${params}) {\n\t${}\n}', {
    label: 'function', type: 'keyword', detail: 'function declaration',
  }),
  snippetCompletion('console.log(${})', { label: 'console.log', type: 'function', detail: 'log to console' }),
]

function toCompletions(words: string[], type: string, withParamHints: boolean): Completion[] {
  return words.map((label) => ({
    label,
    type,
    ...(withParamHints && PARAM_HINTS[label] ? { detail: PARAM_HINTS[label] } : {}),
  }))
}

const DOT_ACCESS = /([A-Za-z_$][\w$]*)\.(\w*)$/
const WORD_END = /\w*$/

interface JsCompletionOptions {
  snippets: boolean
  parameterHints: boolean
}

/** Builds the JS completion source; `snippets`/`parameterHints` are independent Settings toggles. */
export function buildJsCompletionSource(options: JsCompletionOptions) {
  const globalCompletions: Completion[] = [
    ...toCompletions(globalNames, 'class', options.parameterHints),
    ...toCompletions(flattenedMethodPool, 'function', options.parameterHints),
    ...(options.snippets ? jsSnippets : []),
  ]

  return function jsCompletionSource(context: CompletionContext): CompletionResult | null {
    const dotMatch = context.matchBefore(DOT_ACCESS)
    if (dotMatch) {
      const parsed = DOT_ACCESS.exec(dotMatch.text)
      const receiver = parsed?.[1]
      const members = receiver ? receiverMembers[receiver] : undefined
      if (members) {
        const trailingWordLength = WORD_END.exec(dotMatch.text)?.[0].length ?? 0
        return {
          from: dotMatch.to - trailingWordLength,
          options: toCompletions(members, 'method', options.parameterHints),
          validFor: /^\w*$/,
        }
      }
    }

    const word = context.matchBefore(/[A-Za-z_$][\w$]*/)
    if (!word || (word.from === word.to && !context.explicit)) return null

    return {
      from: word.from,
      options: globalCompletions,
      validFor: /^[A-Za-z_$][\w$]*$/,
    }
  }
}
