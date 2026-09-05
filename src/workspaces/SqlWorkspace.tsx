import { useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Panel, Separator, type LayoutChangedMeta, type Layout } from 'react-resizable-panels'
import { AnimatePresence } from 'motion/react'
import { Play, Table2, Sparkles } from 'lucide-react'
import { useSqlWorkspaceStore } from '../app/store/sqlWorkspaceStore'
import { useLayoutStore } from '../app/store/layoutStore'
import { useSettingsStore } from '../app/store/settingsStore'
import { registerRunHandler } from '../app/runRegistry'
import { useIsDesktop } from '../features/layout/useIsDesktop'
import { PageTabs } from '../features/layout/PageTabs'
import { BottomSheet } from '../features/layout/BottomSheet'
import { MobileActionBar, MobileActionButton } from '../features/layout/MobileActionBar'
import { CodeMirrorEditor } from '../features/editor/CodeMirrorEditor'
import { buildSqlLanguageExtension } from '../features/editor/sql/sqlCompletions'
import { autoCapitalizeKeywords } from '../features/editor/sql/autoCapitalizeKeywords'
import { useSqlDatabase } from '../features/editor/sql/useSqlDatabase'
import { SqlResultsPanel } from '../features/editor/sql/SqlResultsPanel'
import { DatabaseExplorer } from '../features/editor/sql/DatabaseExplorer'
import { formatSqlCode } from '../features/formatting/formatSql'
import { runSql } from '../features/editor/sql/sqliteEngine'
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

  const { schema, tables, runQuery, refreshTables, deleteTable, resetDatabase } = useSqlDatabase()

  const handleRun = useCallback(async () => {
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
  }, [query, runQuery, isDesktop, activePage.id, setPageLastResult])

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

  const editor = (
    <CodeMirrorEditor
      docId={activePage.id}
      value={query}
      onChange={setQuery}
      languageExtension={languageExtension}
      onRun={handleRun}
      className="h-full min-h-0 overflow-auto"
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low">
        <PageTabs
          pages={pages}
          activePageId={activePage.id}
          onSelect={setActiveSqlPageId}
          onCreate={() => setActiveSqlPageId(createPage())}
          onClose={handleClosePage}
        />
        <button
          type="button"
          onClick={handleFormat}
          className="mr-2 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          <Sparkles size={13} />
          Format
        </button>
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
              onResetDatabase={resetDatabase}
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
                    onResetDatabase={resetDatabase}
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
    </div>
  )
}
