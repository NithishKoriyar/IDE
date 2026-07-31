import { SqlDataTable } from './SqlDataTable'
import type { SqlLastResult } from '../../../app/types'

interface SqlResultsPanelProps {
  result: SqlLastResult | null
  isRunning: boolean
}

export function SqlResultsPanel({ result, isRunning }: SqlResultsPanelProps) {
  if (isRunning) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-lowest text-xs text-on-surface-variant">
        Running…
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-lowest text-xs text-on-surface-variant">
        Run a query to see results here.
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="h-full overflow-auto bg-surface-container-lowest p-3 font-mono text-xs">
        <div className="wrap-break-word rounded border border-error-container/40 bg-error-container/10 p-2 whitespace-pre-wrap text-error">
          {result.error}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-container-lowest">
      <div className="flex items-center gap-3 border-b border-outline-variant px-3 py-1.5 text-xs text-on-surface-variant">
        <span>
          {result.rowCount} row{result.rowCount === 1 ? '' : 's'}
        </span>
        <span>{result.execMs.toFixed(1)}ms</span>
        {result.columns.length === 0 && <span>Query executed -- no rows returned</span>}
      </div>
      {result.columns.length > 0 && (
        <div className="flex-1 overflow-auto">
          <SqlDataTable columns={result.columns} rows={result.rows} />
        </div>
      )}
    </div>
  )
}
