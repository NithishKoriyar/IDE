import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { RefreshCw, RotateCcw, X } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog } from '../../layout/ConfirmDialog'
import { SqlDataTable } from './SqlDataTable'
import type { TableInfo } from './sqliteEngine'
import type { SqlLastResult } from '../../../app/types'

interface DatabaseExplorerProps {
  tables: TableInfo[]
  selectedTable: string | null
  tableData: SqlLastResult | null
  isLoadingTableData: boolean
  onSelectTable: (name: string) => void
  onDeleteTable: (name: string) => void
  onRefresh: () => void | Promise<void>
  onResetDatabase: () => void
}

const MIN_REFRESH_SPIN_MS = 400

export function DatabaseExplorer({
  tables,
  selectedTable,
  tableData,
  isLoadingTableData,
  onSelectTable,
  onDeleteTable,
  onRefresh,
  onResetDatabase,
}: DatabaseExplorerProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingReset, setPendingReset] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshClick = async () => {
    setIsRefreshing(true)
    const start = Date.now()
    await onRefresh()
    const remaining = MIN_REFRESH_SPIN_MS - (Date.now() - start)
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
    setIsRefreshing(false)
  }

  return (
    <div className="flex h-full flex-col bg-surface-container-low">
      <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant px-2 py-1.5">
        <span className="shrink-0 px-1 text-[11px] font-medium tracking-wide text-on-surface-variant uppercase">
          Tables
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-1 overflow-x-auto">
          {tables.map((t) => (
            <div
              key={t.name}
              className={clsx(
                'group flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs',
                t.name === selectedTable
                  ? 'border-primary bg-surface-container-highest text-on-surface'
                  : 'border-outline-variant bg-surface-container text-on-surface hover:border-primary',
              )}
            >
              <button type="button" onClick={() => onSelectTable(t.name)} className="flex items-center gap-1">
                {t.name}
                <span className="text-on-surface-variant">({t.rowCount})</span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${t.name}`}
                onClick={() => setPendingDelete(t.name)}
                className="text-on-surface-variant opacity-0 hover:text-error group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {tables.length === 0 && <span className="text-xs text-on-surface-variant">No tables yet</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefreshClick()
          }}
          disabled={isRefreshing}
          aria-label="Refresh table list"
          title="Refresh table list (does not remove data)"
          className="shrink-0 rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-60"
        >
          <RefreshCw size={14} className={clsx(isRefreshing && 'animate-spin')} />
        </button>
        <button
          type="button"
          onClick={() => setPendingReset(true)}
          aria-label="Reset demo database"
          title="Reset demo database"
          className="shrink-0 rounded-md p-1.5 text-on-surface-variant hover:bg-error-container/20 hover:text-error"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-surface-container-lowest font-mono text-xs">
        {isLoadingTableData ? (
          <p className="p-3 text-on-surface-variant">Loading…</p>
        ) : !selectedTable ? (
          <p className="p-3 text-on-surface-variant">Click a table above to view its data.</p>
        ) : tableData?.error ? (
          <p className="wrap-break-word p-3 whitespace-pre-wrap text-error">{tableData.error}</p>
        ) : (
          <SqlDataTable columns={tableData?.columns ?? []} rows={tableData?.rows ?? []} />
        )}
      </div>

      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            title={`Delete table "${pendingDelete}"?`}
            description="This permanently removes the table and all its rows."
            confirmLabel="Delete"
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              onDeleteTable(pendingDelete)
              setPendingDelete(null)
            }}
          />
        )}
        {pendingReset && (
          <ConfirmDialog
            title="Reset demo database?"
            description="This deletes all tables and data and recreates an empty database."
            confirmLabel="Reset"
            onCancel={() => setPendingReset(false)}
            onConfirm={() => {
              onResetDatabase()
              setPendingReset(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
