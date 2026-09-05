import { useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Panel, Separator, type LayoutChangedMeta, type Layout } from 'react-resizable-panels'
import { AnimatePresence } from 'motion/react'
import { Play, Sparkles, Copy, Check } from 'lucide-react'
import { javascript } from '@codemirror/lang-javascript'
import { useJsWorkspaceStore } from '../app/store/jsWorkspaceStore'
import { useLayoutStore } from '../app/store/layoutStore'
import { useSettingsStore } from '../app/store/settingsStore'
import { registerRunHandler } from '../app/runRegistry'
import { useIsDesktop } from '../features/layout/useIsDesktop'
import { useCopyToClipboard } from '../features/layout/useCopyToClipboard'
import { PageTabs } from '../features/layout/PageTabs'
import { BottomSheet } from '../features/layout/BottomSheet'
import { MobileActionBar, MobileActionButton } from '../features/layout/MobileActionBar'
import { CodeMirrorEditor } from '../features/editor/CodeMirrorEditor'
import { buildJsCompletionSource } from '../features/editor/javascript/jsCompletions'
import { jsLinter } from '../features/editor/javascript/jsLinter'
import { useRunJavaScript } from '../features/editor/javascript/useRunJavaScript'
import { JsOutputConsole } from '../features/editor/javascript/JsOutputConsole'
import { formatJavaScriptCode } from '../features/formatting/formatJavaScript'

const CODE_PERSIST_DEBOUNCE_MS = 400

export function JavaScriptWorkspace() {
  const isDesktop = useIsDesktop()
  const pages = useJsWorkspaceStore((s) => s.pages)
  const createPage = useJsWorkspaceStore((s) => s.createPage)
  const closePage = useJsWorkspaceStore((s) => s.closePage)
  const updatePageCode = useJsWorkspaceStore((s) => s.updatePageCode)
  const setPageLastRun = useJsWorkspaceStore((s) => s.setPageLastRun)

  const activeJsPageId = useLayoutStore((s) => s.activeJsPageId)
  const setActiveJsPageId = useLayoutStore((s) => s.setActiveJsPageId)
  const panelSizes = useLayoutStore((s) => s.panelSizes)
  const setPanelSizes = useLayoutStore((s) => s.setPanelSizes)

  const javascriptSettings = useSettingsStore((s) => s.javascript)
  const suggestionSettings = useSettingsStore((s) => s.suggestions)

  const activePage = pages.find((p) => p.id === activeJsPageId) ?? pages[0]

  useEffect(() => {
    if (!activeJsPageId && pages[0]) setActiveJsPageId(pages[0].id)
  }, [activeJsPageId, pages, setActiveJsPageId])

  const handleClosePage = useCallback(
    (id: string) => {
      if (pages.length <= 1) return
      if (id === activeJsPageId) {
        const idx = pages.findIndex((p) => p.id === id)
        const remaining = pages.filter((p) => p.id !== id)
        const next = remaining[idx] ?? remaining[idx - 1]
        setActiveJsPageId(next.id)
      }
      closePage(id)
    },
    [pages, activeJsPageId, closePage, setActiveJsPageId],
  )

  const [code, setCode] = useState(activePage.code)

  useEffect(() => {
    setCode(activePage.code)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset local buffer only when the page identity changes
  }, [activePage.id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (code !== activePage.code) updatePageCode(activePage.id, code)
    }, CODE_PERSIST_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce when the live buffer changes
  }, [code, activePage.id])

  const { entries, isRunning, run } = useRunJavaScript((summary) => setPageLastRun(activePage.id, summary))
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const { copied, copy } = useCopyToClipboard()

  const handleRun = useCallback(async () => {
    let toRun = code
    try {
      toRun = await formatJavaScriptCode(code)
      setCode(toRun)
    } catch {
      // Keep running the original code if it doesn't parse cleanly.
    }
    if (!isDesktop) setMobileSheetOpen(true)
    run(toRun)
  }, [code, run, isDesktop])

  useEffect(() => registerRunHandler('javascript', handleRun), [handleRun])

  const handleFormat = useCallback(async () => {
    try {
      const formatted = await formatJavaScriptCode(code)
      setCode(formatted)
    } catch {
      // Invalid syntax -- leave the buffer untouched rather than surfacing a crash.
    }
  }, [code])

  const languageExtension = useMemo(() => {
    const jsLang = javascript()
    const completionSource = buildJsCompletionSource({
      snippets: suggestionSettings.snippets,
      parameterHints: suggestionSettings.parameterHints,
    })
    return [
      jsLang,
      jsLang.language.data.of({ autocomplete: completionSource }),
      ...(javascriptSettings.enableLinting ? [jsLinter()] : []),
    ]
  }, [suggestionSettings.snippets, suggestionSettings.parameterHints, javascriptSettings.enableLinting])

  const handleLayoutChanged = useCallback(
    (layout: Layout, meta: LayoutChangedMeta) => {
      if (meta.isUserInteraction && layout.editor !== undefined) {
        setPanelSizes({ jsEditorConsoleSplit: layout.editor })
      }
    },
    [setPanelSizes],
  )

  const editor = (
    <CodeMirrorEditor
      docId={activePage.id}
      value={code}
      onChange={setCode}
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
          onSelect={setActiveJsPageId}
          onCreate={() => setActiveJsPageId(createPage())}
          onClose={handleClosePage}
        />
        <div className="mr-2 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void copy(code)
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
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
        <Group orientation="horizontal" className="min-h-0 flex-1" onLayoutChanged={handleLayoutChanged}>
          <Panel id="editor" defaultSize={panelSizes.jsEditorConsoleSplit} minSize={30}>
            {editor}
          </Panel>
          <Separator className="w-px bg-outline-variant transition-colors hover:bg-primary data-[state=drag]:bg-primary" />
          <Panel id="console" defaultSize={100 - panelSizes.jsEditorConsoleSplit} minSize={15}>
            <JsOutputConsole entries={entries} isRunning={isRunning} />
          </Panel>
        </Group>
      ) : (
        <div className="relative min-h-0 flex-1">
          {editor}
          <AnimatePresence>
            {mobileSheetOpen && (
              <BottomSheet title="Console" onClose={() => setMobileSheetOpen(false)}>
                <JsOutputConsole entries={entries} isRunning={isRunning} />
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
        </MobileActionBar>
      )}
    </div>
  )
}
