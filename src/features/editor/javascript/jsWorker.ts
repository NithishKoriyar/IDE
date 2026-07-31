/// <reference lib="webworker" />
import { formatConsoleArgs } from './serializeConsoleArgs'
import type { ConsoleEntry, ConsoleLevel } from '../../../app/types'

type RunMessage = { type: 'run'; code: string }
export type WorkerOutMessage =
  | { type: 'console'; entry: ConsoleEntry }
  | { type: 'done'; hasError: boolean }

const ctx = self as unknown as DedicatedWorkerGlobalScope

let entryCounter = 0
function nextId(): string {
  entryCounter += 1
  return `entry-${entryCounter}`
}

function post(entry: ConsoleEntry): void {
  ctx.postMessage({ type: 'console', entry } satisfies WorkerOutMessage)
}

function makeLogger(level: ConsoleLevel) {
  return (...args: unknown[]) => {
    post({ id: nextId(), kind: 'text', level, text: formatConsoleArgs(args) })
  }
}

function consoleTable(data: unknown): void {
  if (!data || typeof data !== 'object') {
    post({ id: nextId(), kind: 'text', level: 'log', text: formatConsoleArgs([data]) })
    return
  }

  const entries: Array<readonly [string, unknown]> = Array.isArray(data)
    ? data.map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>)

  const columnSet = new Set<string>()
  let hasPlainValue = false
  for (const [, rowValue] of entries) {
    if (rowValue && typeof rowValue === 'object' && !Array.isArray(rowValue)) {
      Object.keys(rowValue as object).forEach((k) => columnSet.add(k))
    } else {
      hasPlainValue = true
    }
  }

  const columns = ['(index)', ...columnSet, ...(hasPlainValue ? ['Values'] : [])]
  const rows: Array<Record<string, string>> = entries.map(([index, rowValue]) => {
    const row: Record<string, string> = { '(index)': index }
    if (rowValue && typeof rowValue === 'object' && !Array.isArray(rowValue)) {
      for (const col of columnSet) {
        row[col] = col in (rowValue as object) ? formatConsoleArgs([(rowValue as Record<string, unknown>)[col]]) : ''
      }
    } else {
      row.Values = formatConsoleArgs([rowValue])
    }
    return row
  })

  post({ id: nextId(), kind: 'table', columns, rows })
}

const sandboxConsole = {
  log: makeLogger('log'),
  info: makeLogger('info'),
  warn: makeLogger('warn'),
  error: makeLogger('error'),
  table: consoleTable,
  clear: () => post({ id: nextId(), kind: 'clear' }),
}

;(ctx as unknown as { console: typeof sandboxConsole }).console = sandboxConsole

ctx.addEventListener('error', (event: ErrorEvent) => {
  post({ id: nextId(), kind: 'text', level: 'error', text: event.message })
})

ctx.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  post({
    id: nextId(),
    kind: 'text',
    level: 'error',
    text: `Uncaught (in promise) ${formatConsoleArgs([event.reason])}`,
  })
})

ctx.onmessage = async (event: MessageEvent<RunMessage>) => {
  if (event.data.type !== 'run') return

  let hasError = false
  try {
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
    const run = new AsyncFunction(event.data.code)
    await run()
  } catch (err) {
    hasError = true
    const message = err instanceof Error ? `${err.name}: ${err.message}` : formatConsoleArgs([err])
    post({ id: nextId(), kind: 'text', level: 'error', text: message })
  }
  ctx.postMessage({ type: 'done', hasError } satisfies WorkerOutMessage)
}
