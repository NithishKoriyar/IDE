# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CYPH·IDE — a browser-based, offline-capable playground for JavaScript and SQL. No backend: JavaScript runs in a sandboxed Web Worker, and SQL runs against an in-browser SQLite database (sql.js/WASM). All state (settings, layout, editor pages, the SQLite file itself) persists to IndexedDB, and the app is installable as a PWA.

Stack: React 19 + TypeScript + Vite (rolldown-vite) + Tailwind CSS v4 + Zustand + CodeMirror 6.

## Commands

```
npm run dev        # start Vite dev server
npm run build       # tsc -b (type-check only, no emit) then vite build
npm run lint        # oxlint
npm run preview     # preview the production build
npm run test        # vitest run (single pass, no watch)
```

Single test file: `npx vitest run src/styles/theme-tokens.test.ts`
Watch mode: `npx vitest`
Filter by name: `npx vitest run -t "some test name"`

There is no dedicated vitest config (no `test` block in `vite.config.ts`); Vitest runs with its defaults. Tests are colocated with source as `*.test.ts` (e.g. `src/features/editor/javascript/serializeConsoleArgs.test.ts`). Playwright is a devDependency but has no config or specs yet — don't assume an e2e suite exists.

Type-checking is via TypeScript project references: `tsconfig.json` points at `tsconfig.app.json` (src, bundler resolution, `noEmit`) and `tsconfig.node.json` (Vite/Node config files). Vite/rolldown does the actual transpilation, so `tsc -b` in the build script exists purely as a type-safety gate.

## Architecture

### Entry and top-level shell

`index.html` → `src/main.tsx` (registers the PWA service worker via `virtual:pwa-register`, mounts `<App>`) → `src/App.tsx` → `AppShell` (`src/features/layout/AppShell.tsx`).

`AppShell` blocks rendering behind `useStoresHydrated()` (shows a splash) until every persisted Zustand store has rehydrated from IndexedDB, then renders `Header` plus whichever workspace is active (`JavaScriptWorkspace` or `SqlWorkspace`, both lazy-loaded so a first visit only pays for the language actually in use), wrapped in a per-language `WorkspaceErrorBoundary` (keyed by `activeLanguage`, so switching languages remounts a fresh boundary).

### Directory layout

- `src/app/` — global state (Zustand stores), shared types (`types.ts`), and the run-dispatch registry. Nothing UI-specific lives here.
- `src/features/` — cross-cutting building blocks grouped by concern: `editor` (CodeMirror wiring, plus JS- and SQL-specific subfolders for completions/linting/execution), `formatting`, `layout` (shell chrome: Header, PageTabs, BottomSheet, responsive helpers), `settings` (modal + per-domain sections/controls).
- `src/workspaces/` — the two top-level screens (`JavaScriptWorkspace.tsx`, `SqlWorkspace.tsx`) that compose everything above into a full language-specific UI (tabs, editor, results/console, run/format actions, responsive desktop/mobile layout).
- `src/styles/` — theme tokens (`tokens.css` + `theme-tokens.ts` mirror).

### State: Zustand stores persisted to IndexedDB

Four stores under `src/app/store/`, each created with `zustand/persist` but backed by IndexedDB (via `idb-keyval`) instead of localStorage, through the custom `StateStorage` adapter in `persistStorage.ts`:

- `settingsStore` — theme, editor prefs, suggestion toggles, per-language settings.
- `layoutStore` — active language, active page id per language, resizable-panel split percentages, SQL explorer collapsed state.
- `jsWorkspaceStore` / `sqlWorkspaceStore` — each holds a list of "pages" (tabs), where a page is `{ id, name, code/query, lastRun/lastResult }`.

`hydration.ts` exposes `useStoresHydrated()`, which waits on all four stores' `persist.hasHydrated()` — this exists specifically to avoid a flash of default/starter content before the restored session snaps in.

The SQLite database's raw bytes are the one piece of state that deliberately bypasses this JSON-based store path (see `persistStorage.ts` comment): running it through `JSON.stringify` would balloon a `Uint8Array` into a per-byte object. Instead `sqliteEngine.ts` saves/loads the raw bytes directly via `saveSqliteBytes`/`loadSqliteBytes`, debounced 300ms after each mutating statement.

### Run dispatch

`src/app/runRegistry.ts` lets the single Header "Run" button (and the global Ctrl/Cmd+S shortcut) trigger whichever workspace is active without Header importing JS/SQL execution internals: each workspace registers its own `run()` handler on mount, keyed by `LanguageMode`, via `registerRunHandler`; Header calls `runActiveLanguage(activeLanguage)`.

### JavaScript execution

`JavaScriptWorkspace` runs code in a dedicated Web Worker (`src/features/editor/javascript/jsWorker.ts`) via `new AsyncFunction(code)` — isolated from the main thread. The worker replaces its own `console` with a sandboxed version that serializes args (`serializeConsoleArgs.ts`, handles circular refs) and posts structured `ConsoleEntry` messages back (`text` / `table` / `clear`). `useRunJavaScript.ts` owns the worker's lifecycle: it recreates the worker per run, enforces a 5s timeout that kills the worker and reports a timeout error (guards against infinite loops), and surfaces a `JsRunSummary` (error flag, entry count, timestamp) back to the caller for persistence. `jsLinter.ts` is a syntax-only linter (parses via `new Function`, never invokes it) — not a real static analyzer.

### SQL execution

`src/features/editor/sql/sqliteEngine.ts` wraps `sql.js` (SQLite-to-WASM) as a module-level singleton (`db`/`dbReadyPromise`) — there is exactly one database instance for the whole app, lazily initialized and restored from IndexedDB bytes on first access (falling back to a genuinely empty seeded DB if none exist or the saved bytes are corrupt). `useSqlDatabase.ts` is the React-facing hook: `runQuery`/`deleteTable`/`resetDatabase` all refresh `schema`/`tables` afterward so the Database Explorer stays live. In `SqlWorkspace.tsx`, the Database Explorer's table-preview query intentionally calls `runSql` directly rather than the `runQuery` hook, to avoid re-triggering its own refresh loop — the Explorer's data view is deliberately decoupled from the query Results panel, which only ever reflects what was actually run from the editor.

### Editor

`CodeMirrorEditor.tsx` is the single editor component shared by both workspaces; language-specific behavior (language mode, completions, linting) is passed in as an `Extension` prop rather than living in the editor component. It uses CodeMirror `Compartment`s so settings/theme/language changes reconfigure the live view without recreating it; the view is only fully torn down and recreated when `docId` changes (switching pages), which intentionally resets undo history per page. Ctrl/Cmd+Enter and Ctrl/Cmd+S both invoke the `onRun` callback.

### Formatting

Both formatters are dynamically imported on demand (kept out of the initial bundle): `formatJavaScript.ts` uses `prettier/standalone` + babel/estree plugins, `formatSql.ts` uses `sql-formatter` (sqlite dialect, uppercase keywords). Both workspaces format-on-run (falling back to the unformatted buffer if it doesn't parse) as well as exposing an explicit "Format" button.

### Responsive layout

`useIsDesktop.ts` is a `useSyncExternalStore` media-query hook (breakpoint: 1024px) used to conditionally *mount* one of two layout trees, not just hide one with CSS — desktop uses `react-resizable-panels` (`Group`/`Panel`/`Separator`, with split percentages persisted to `layoutStore.panelSizes`), mobile uses `BottomSheet` + `MobileActionBar`. Mounting both simultaneously would mean two live CodeMirror instances and duplicate SQL engine access, so this distinction matters for correctness, not just performance.

### Theming

Semantic (Material-You-style) color tokens are defined twice and must be kept in sync by hand: as CSS custom properties in `src/styles/tokens.css` (consumed via Tailwind classes like `bg-surface-container`) and as a TypeScript mirror in `src/styles/theme-tokens.ts` (consumed where a concrete hex value is needed outside CSS, e.g. picking the matching CodeMirror theme in `features/editor/themes/cmThemes.ts`). Seven themes exist: `light`, `dark`, `dracula`, `nord`, `monokai`, `github-dark`, `cyberpunk` (default). Adding or changing a theme requires editing both files.

### Settings UI

`SettingsModal.tsx` composes one `Section` per settings domain from `features/settings/sections/` (General, Suggestions, JavaScript, Sql), each built from shared primitives in `features/settings/controls/` (`Toggle`, `SelectField`, `NumberField`, `SettingsRow`). Follow this section/control split when adding a new setting rather than building bespoke UI inline.

### PWA

Configured via `vite-plugin-pwa` in `vite.config.ts` (`registerType: 'autoUpdate'`, manifest themed to CYPH·IDE) and registered eagerly in `main.tsx` (`registerSW({ immediate: true })`).
