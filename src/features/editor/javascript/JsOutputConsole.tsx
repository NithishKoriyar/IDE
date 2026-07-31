import clsx from 'clsx'
import type { ConsoleLevel, DisplayEntry } from '../../../app/types'

const LEVEL_CLASSES: Record<ConsoleLevel, string> = {
  log: 'text-on-surface',
  info: 'text-secondary',
  warn: 'text-tertiary',
  error: 'text-error',
}

interface JsOutputConsoleProps {
  entries: DisplayEntry[]
  isRunning: boolean
}

export function JsOutputConsole({ entries, isRunning }: JsOutputConsoleProps) {
  const hasError = entries.some((e) => e.kind === 'text' && e.level === 'error')

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-container-lowest font-mono text-xs">
      <div className="flex-1 space-y-1.5 overflow-auto p-3">
        {entries.length === 0 && !isRunning && (
          <p className="text-on-surface-variant">Run to see output here.</p>
        )}
        {entries.map((entry) =>
          entry.kind === 'text' ? (
            <div
              key={entry.id}
              className={clsx('whitespace-pre-wrap wrap-break-word', LEVEL_CLASSES[entry.level])}
            >
              {entry.text}
            </div>
          ) : (
            <div key={entry.id} className="overflow-x-auto rounded border border-outline-variant">
              <table className="w-full border-collapse text-left">
                <thead className="bg-surface-container-high text-on-surface-variant">
                  <tr>
                    {entry.columns.map((col) => (
                      <th
                        key={col}
                        className="border-r border-outline-variant px-2 py-1 font-medium last:border-r-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-on-surface">
                  {entry.rows.map((row, i) => (
                    // eslint-disable-next-line react/no-array-index-key -- rows are a static snapshot, never reordered
                    <tr key={i}>
                      {entry.columns.map((col) => (
                        <td key={col} className="border-r border-outline-variant px-2 py-1 last:border-r-0">
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        )}
        {isRunning && <div className="animate-pulse text-on-surface-variant">Running…</div>}
      </div>
      {!isRunning && entries.length > 0 && (
        <div
          className={clsx(
            'flex items-center gap-2 border-t px-3 py-2 text-xs',
            hasError
              ? 'border-error-container/40 bg-error-container/10 text-error'
              : 'border-secondary-container/40 bg-secondary-container/10 text-secondary',
          )}
        >
          {hasError ? 'Execution finished with errors' : 'Execution finished successfully'}
        </div>
      )}
    </div>
  )
}
