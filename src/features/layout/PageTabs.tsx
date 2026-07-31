import { Plus } from 'lucide-react'
import clsx from 'clsx'

interface PageTabsProps {
  pages: Array<{ id: string; name: string }>
  activePageId: string
  onSelect: (id: string) => void
  onCreate: () => void
}

export function PageTabs({ pages, activePageId, onSelect, onCreate }: PageTabsProps) {
  return (
    <div className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onSelect(page.id)}
          className={clsx(
            'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            page.id === activePageId
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {page.name}
        </button>
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
