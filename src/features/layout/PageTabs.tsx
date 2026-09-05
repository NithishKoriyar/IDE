import { Plus, X } from 'lucide-react'
import clsx from 'clsx'

interface PageTabsProps {
  pages: Array<{ id: string; name: string }>
  activePageId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onClose: (id: string) => void
}

export function PageTabs({ pages, activePageId, onSelect, onCreate, onClose }: PageTabsProps) {
  const canClose = pages.length > 1

  return (
    <div className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2">
      {pages.map((page) => (
        <div
          key={page.id}
          className={clsx(
            'flex shrink-0 items-center rounded-md text-xs font-medium transition-colors',
            page.id === activePageId
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(page.id)}
            className={clsx('py-1.5 pl-3', canClose ? 'pr-1' : 'pr-3')}
          >
            {page.name}
          </button>
          {canClose && (
            <button
              type="button"
              aria-label={`Close ${page.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onClose(page.id)
              }}
              className="mr-1 shrink-0 rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high hover:text-error"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onCreate}
        aria-label="New page"
        className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        <Plus size={14} />
        New
      </button>
    </div>
  )
}
