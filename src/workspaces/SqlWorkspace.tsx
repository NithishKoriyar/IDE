import { useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Panel, Separator, type LayoutChangedMeta, type Layout } from 'react-resizable-panels'
import { AnimatePresence } from 'motion/react'
import { Play, Table2, Sparkles, RefreshCw, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useSqlWorkspaceStore } from '../app/store/sqlWorkspaceStore'
import { useLayoutStore } from '../app/store/layoutStore'
import { useSettingsStore } from '../app/store/settingsStore'
import { useSqlDatabasesStore } from '../app/store/sqlDatabasesStore'
import { registerRunHandler } from '../app/runRegistry'
import { useIsDesktop } from '../features/layout/useIsDesktop'
import { PageTabs } from '../features/layout/PageTabs'
import { BottomSheet } from '../features/layout/BottomSheet'
import { MobileActionBar, MobileActionButton } from '../features/layout/MobileActionBar'
import { ConfirmDialog } from '../features/layout/ConfirmDialog'
import { InputDialog } from '../features/layout/InputDialog'
import { CodeMirrorEditor } from '../features/editor/CodeMirrorEditor'
import { buildSqlLanguageExtension } from '../features/editor/sql/sqlCompletions'
import { autoCapitalizeKeywords } from '../features/editor/sql/autoCapitalizeKeywords'
import { useSqlDatabase } from '../features/editor/sql/useSqlDatabase'
import { SqlResultsPanel } from '../features/editor/sql/SqlResultsPanel'
import { DatabaseExplorer } from '../features/editor/sql/DatabaseExplorer'
import { DatabaseSelector } from '../features/editor/sql/DatabaseSelector'
import { formatSqlCode } from '../features/formatting/formatSql'
import { runSql, deleteDatabaseStorage } from '../features/editor/sql/sqliteEngine'
import { DEFAULT_DATABASE_ID, isPresetDatabaseId } from '../features/editor/sql/presets'
import { LEGACY_DEFAULT_DATABASE_ID } from '../app/store/persistStorage'
import type { SqlLastResult } from '../app/types'
import type { SqlRunResult } from '../features/editor/sql/sqliteEngine'

const QUERY_PERSIST_DEBOUNCE_MS = 400

function toJsonSafeResult(result: SqlRunResult): SqlLastResult {
  const primary = result.results[result.results.length - 1]
  return {
    columns: primary?.columns ?? [],
    rows: (primary?.rows ?? []).map((row) =>
      row.map((cell) => (cell instanceof Uint8Array ? '[BLOB]' : cell)),
    ),
    rowCount: primary?.rows.length ?? 0,
    execMs: result.execMs,
    error: result.error,
    ranAt: Date.now(),
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

export function SqlWorkspace() {
  const isDesktop = useIsDesktop()
  const pages = useSqlWorkspaceStore((s) => s.pages)
  const createPage = useSqlWorkspaceStore((s) => s.createPage)
  const closePage = useSqlWorkspaceStore((s) => s.closePage)
  const updatePageQuery = useSqlWorkspaceStore((s) => s.updatePageQuery)
  const setPageLastResult = useSqlWorkspaceStore((s) => s.setPageLastResult)

  const activeSqlPageId = useLayoutStore((s) => s.activeSqlPageId)
  const setActiveSqlPageId = useLayoutStore((s) => s.setActiveSqlPageId)
  const panelSizes = useLayoutStore((s) => s.panelSizes)
  const setPanelSizes = useLayoutStore((s) => s.setPanelSizes)

  const activeSqlDatabaseId = useLayoutStore((s) => s.activeSqlDatabaseId)
  const setActiveSqlDatabaseId = useLayoutStore((s) => s.setActiveSqlDatabaseId)
  const userDatabases = useSqlDatabasesStore((s) => s.userDatabases)
  const createUserDatabase = useSqlDatabasesStore((s) => s.createUserDatabase)
  const deleteUserDatabase = useSqlDatabasesStore((s) => s.deleteUserDatabase)

  useEffect(() => {
    if (activeSqlDatabaseId) return
    // Prefer a migrated pre-preset database (continuity for existing work) over defaulting to a preset.
    const legacy = userDatabases.find((d) => d.id === LEGACY_DEFAULT_DATABASE_ID)
    setActiveSqlDatabaseId(legacy ? legacy.id : DEFAULT_DATABASE_ID)
  }, [activeSqlDatabaseId, userDatabases, setActiveSqlDatabaseId])

  const activeDatabaseId = activeSqlDatabaseId ?? DEFAULT_DATABASE_ID

  const [newDatabaseDialogOpen, setNewDatabaseDialogOpen] = useState(false)
  const [pendingDeleteDatabaseId, setPendingDeleteDatabaseId] = useState<string | null>(null)
  // Owned here (not inside DatabaseExplorer) since both the desktop panel and
  // the mobile sheet's own header need to trigger the same confirmation.
  const [pendingResetDatabase, setPendingResetDatabase] = useState(false)

  const handleCreateDatabase = useCallback(
    (name: string) => {
      const id = createUserDatabase(name)
      setActiveSqlDatabaseId(id)
      setNewDatabaseDialogOpen(false)
    },
    [createUserDatabase, setActiveSqlDatabaseId],
  )

  const handleDeleteDatabase = useCallback(
    async (id: string) => {
      await deleteDatabaseStorage(id)
      deleteUserDatabase(id)
      if (activeDatabaseId === id) setActiveSqlDatabaseId(DEFAULT_DATABASE_ID)
      setPendingDeleteDatabaseId(null)
    },
    [deleteUserDatabase, activeDatabaseId, setActiveSqlDatabaseId],
  )

  const sqlSettings = useSettingsStore((s) => s.sql)

  const activePage = pages.find((p) => p.id === activeSqlPageId) ?? pages[0]

  useEffect(() => {
    if (!activeSqlPageId && pages[0]) setActiveSqlPageId(pages[0].id)
  }, [activeSqlPageId, pages, setActiveSqlPageId])

  const handleClosePage = useCallback(
    (id: string) => {
      if (pages.length <= 1) return
      if (id === activeSqlPageId) {
        const idx = pages.findIndex((p) => p.id === id)
        const remaining = pages.filter((p) => p.id !== id)
        const next = remaining[idx] ?? remaining[idx - 1]
        setActiveSqlPageId(next.id)
      }
      closePage(id)
    },
    [pages, activeSqlPageId, closePage, setActiveSqlPageId],
  )

  const [query, setQuery] = useState(activePage.query)
  const [liveResult, setLiveResult] = useState<SqlLastResult | null>(activePage.lastResult ?? null)
  const [isRunning, setIsRunning] = useState(false)
  const [mobileSheet, setMobileSheet] = useState<'closed' | 'tables' | 'results'>('closed')

  // Viewing a table's data (Database Explorer) is intentionally separate from
  // the query Results panel -- the Results panel only ever reflects what was
  // actually run from the editor.
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableViewResult, setTableViewResult] = useState<SqlLastResult | null>(null)
  const [isTableViewLoading, setIsTableViewLoading] = useState(false)

  useEffect(() => {
    setQuery(activePage.query)
    setLiveResult(activePage.lastResult ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset local buffers only when the page identity changes
  }, [activePage.id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query !== activePage.query) updatePageQuery(activePage.id, query)
    }, QUERY_PERSIST_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce when the live buffer changes
  }, [query, activePage.id])

  const { isReady, schema, tables, runQuery, refreshTables, deleteTable, resetDatabase } =
    useSqlDatabase(activeDatabaseId)
  const canResetDatabase = isPresetDatabaseId(activeDatabaseId)

  const handleRun = useCallback(async () => {
    if (!isReady) return
    let toRun = query
    try {
      toRun = await formatSqlCode(query)
      setQuery(toRun)
    } catch {
      // Keep running the original text if it doesn't parse cleanly.
    }
    setIsRunning(true)
    if (!isDesktop) setMobileSheet('results')
    const result = await runQuery(toRun)
    setIsRunning(false)
    const safe = toJsonSafeResult(result)
    setLiveResult(safe)
    setPageLastResult(activePage.id, safe)
  }, [isReady, query, runQuery, isDesktop, activePage.id, setPageLastResult])

  useEffect(() => registerRunHandler('sql', handleRun), [handleRun])

  const handleFormat = useCallback(async () => {
    try {
      setQuery(await formatSqlCode(query))
    } catch {
      // Invalid syntax -- leave the buffer untouched.
    }
  }, [query])

  // Keeps the Database Explorer's data view live: auto-selects the first
  // table when none is selected (or the selected one was dropped), and
  // re-fetches whenever `tables` changes -- which happens after every Run,
  // delete, or reset (all of them refresh `tables` internally) -- so edits
  // made from the editor show up immediately without re-clicking the tab.
  // Uses `runSql` directly (not the `runQuery` hook) so this read-only peek
  // doesn't itself trigger another `tables` refresh and loop.
  useEffect(() => {
    if (tables.length === 0) {
      setSelectedTable((prev) => (prev === null ? prev : null))
      setTableViewResult(null)
      return
    }
    const target = tables.some((t) => t.name === selectedTable) ? selectedTable! : tables[0].name
    if (target !== selectedTable) {
      setSelectedTable(target)
      return
    }
    let cancelled = false
    setIsTableViewLoading(true)
    void runSql(`SELECT * FROM ${quoteIdent(target)};`).then((result) => {
      if (cancelled) return
      setIsTableViewLoading(false)
      setTableViewResult(toJsonSafeResult(result))
    })
    return () => {
      cancelled = true
    }
  }, [tables, selectedTable])

  const handleDeleteTable = useCallback((name: string) => deleteTable(name), [deleteTable])

  const languageExtension = useMemo(() => {
    const base = buildSqlLanguageExtension(sqlSettings.sqlSuggestions ? schema : {}, true)
    return [base, autoCapitalizeKeywords()]
  }, [schema, sqlSettings.sqlSuggestions])

  const handleTopLayoutChanged = useCallback(
    (layout: Layout, meta: LayoutChangedMeta) => {
      if (meta.isUserInteraction && layout.editor !== undefined) {
        setPanelSizes({ sqlEditorResultsSplit: layout.editor })
      }
    },
    [setPanelSizes],
  )

  const handleOuterLayoutChanged = useCallback(
    (layout: Layout, meta: LayoutChangedMeta) => {
      if (meta.isUserInteraction && layout.explorer !== undefined) {
        setPanelSizes({ sqlExplorerHeight: layout.explorer })
      }
    },
    [setPanelSizes],
  )

  // Ghost text only -- guides toward the current database's own tables instead
  // of shipping a fixed, always-inserted starter query.
  const editorPlaceholder = tables[0] ? `SELECT * FROM ${tables[0].name};` : 'SELECT * FROM your_table;'

  const editor = (
    <CodeMirrorEditor
      docId={activePage.id}
      value={query}
      onChange={setQuery}
      languageExtension={languageExtension}
      onRun={handleRun}
      className="h-full min-h-0 overflow-auto"
      placeholder={editorPlaceholder}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={clsx(
          'flex items-center border-b border-outline-variant bg-surface-container-low',
          isDesktop ? 'justify-between' : 'flex-wrap',
        )}
      >
        <PageTabs
          pages={pages}
          activePageId={activePage.id}
          onSelect={setActiveSqlPageId}
          onCreate={() => setActiveSqlPageId(createPage())}
          onClose={handleClosePage}
        />
        <div
          className={clsx(
            'flex shrink-0 items-center gap-2 pr-2',
            // On mobile this becomes its own full-width row, spread edge-to-edge:
            // DatabaseSelector at the left (its dropdown opens left-anchored/
            // rightward there) and Format at the right.
            !isDesktop && 'w-full justify-between border-t border-outline-variant py-1',
          )}
        >
          <DatabaseSelector
            activeDatabaseId={activeDatabaseId}
            userDatabases={userDatabases}
            onSelect={setActiveSqlDatabaseId}
            onCreateNew={() => setNewDatabaseDialogOpen(true)}
            onDeleteUserDatabase={setPendingDeleteDatabaseId}
          />
          <button
            type="button"
            onClick={handleFormat}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <Sparkles size={13} />
            Format
          </button>
        </div>
      </div>

      {isDesktop ? (
        <Group orientation="vertical" className="min-h-0 flex-1" onLayoutChanged={handleOuterLayoutChanged}>
          <Panel id="top" defaultSize={100 - panelSizes.sqlExplorerHeight} minSize={30}>
            <Group orientation="horizontal" className="h-full" onLayoutChanged={handleTopLayoutChanged}>
              <Panel id="editor" defaultSize={panelSizes.sqlEditorResultsSplit} minSize={30}>
                {editor}
              </Panel>
              <Separator className="w-px bg-outline-variant transition-colors hover:bg-primary" />
              <Panel id="results" defaultSize={100 - panelSizes.sqlEditorResultsSplit} minSize={15}>
                <SqlResultsPanel result={liveResult} isRunning={isRunning} />
              </Panel>
            </Group>
          </Panel>
          <Separator className="h-px bg-outline-variant transition-colors hover:bg-primary" />
          <Panel id="explorer" defaultSize={panelSizes.sqlExplorerHeight} minSize={8} collapsible collapsedSize={6}>
            <DatabaseExplorer
              tables={tables}
              selectedTable={selectedTable}
              tableData={tableViewResult}
              isLoadingTableData={isTableViewLoading}
              onSelectTable={setSelectedTable}
              onDeleteTable={handleDeleteTable}
              onRefresh={refreshTables}
              onRequestReset={() => setPendingResetDatabase(true)}
              canReset={canResetDatabase}
            />
          </Panel>
        </Group>
      ) : (
        <div className="relative min-h-0 flex-1">
          {editor}
          <AnimatePresence>
            {mobileSheet !== 'closed' && (
              <BottomSheet
                title={mobileSheet === 'tables' ? 'Tables' : 'Results'}
                onClose={() => setMobileSheet('closed')}
                headerRight={
                  mobileSheet === 'tables' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void refreshTables()
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <RefreshCw size={13} />
                        Refresh
                      </button>
                      {canResetDatabase && (
                        <button
                          type="button"
                          onClick={() => setPendingResetDatabase(true)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-error-container/20 hover:text-error"
                        >
                          <RotateCcw size={13} />
                          Reset
                        </button>
                      )}
                    </>
                  ) : undefined
                }
              >
                {mobileSheet === 'tables' ? (
                  <DatabaseExplorer
                    tables={tables}
                    selectedTable={selectedTable}
                    tableData={tableViewResult}
                    isLoadingTableData={isTableViewLoading}
                    onSelectTable={setSelectedTable}
                    onDeleteTable={handleDeleteTable}
                    onRefresh={refreshTables}
                    onRequestReset={() => setPendingResetDatabase(true)}
                    canReset={canResetDatabase}
                    hideOwnHeaderControls
                  />
                ) : (
                  <SqlResultsPanel result={liveResult} isRunning={isRunning} />
                )}
              </BottomSheet>
            )}
          </AnimatePresence>
        </div>
      )}

      {!isDesktop && (
        <MobileActionBar>
          <MobileActionButton
            icon={<Play size={16} fill="currentColor" />}
            label="Run"
            onClick={handleRun}
            variant="primary"
          />
          <MobileActionButton
            icon={<Table2 size={16} />}
            label="Tables"
            onClick={() => setMobileSheet('tables')}
          />
        </MobileActionBar>
      )}

      <AnimatePresence>
        {newDatabaseDialogOpen && (
          <InputDialog
            title="New database"
            description="Creates an empty database you can build your own schema in."
            placeholder="My Database"
            confirmLabel="Create"
            onCancel={() => setNewDatabaseDialogOpen(false)}
            onConfirm={handleCreateDatabase}
          />
        )}
        {pendingDeleteDatabaseId && (
          <ConfirmDialog
            title={`Delete "${userDatabases.find((d) => d.id === pendingDeleteDatabaseId)?.name ?? 'this database'}"?`}
            description="This permanently deletes the database and all of its data."
            confirmLabel="Delete"
            onCancel={() => setPendingDeleteDatabaseId(null)}
            onConfirm={() => {
              void handleDeleteDatabase(pendingDeleteDatabaseId)
            }}
          />
        )}
        {pendingResetDatabase && (
          <ConfirmDialog
            title="Reset database?"
            description="This discards all changes and restores the original preset schema and data."
            confirmLabel="Reset"
            onCancel={() => setPendingResetDatabase(false)}
            onConfirm={() => {
              void resetDatabase()
              setPendingResetDatabase(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
