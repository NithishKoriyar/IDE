interface SqlDataTableProps {
  columns: string[]
  rows: unknown[][]
}

/** Shared row/column table renderer used by both the query Results panel and
 * the Database Explorer's table viewer. Sized by content (not stretched to
 * fill the panel) -- each cell caps at a max width with ellipsis truncation
 * (full value on hover via `title`) so one long value can't blow out the
 * whole column. */
export function SqlDataTable({ columns, rows }: SqlDataTableProps) {
  return (
    <table className="w-auto border-collapse text-left font-mono text-xs">
      <thead className="sticky top-0 bg-surface-container-high text-on-surface-variant">
        <tr>
          {columns.map((col) => (
            <th
              key={col}
              className="max-w-60 truncate border-r border-b border-outline-variant px-2 py-1 font-medium last:border-r-0"
              title={col}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant text-on-surface">
        {rows.map((row, i) => (
          // eslint-disable-next-line react/no-array-index-key -- rows are a static snapshot, never reordered
          <tr key={i} className="hover:bg-surface-container-high">
            {row.map((cell, j) => (
              // eslint-disable-next-line react/no-array-index-key -- columns are a static snapshot for this row
              <td
                key={j}
                className="max-w-60 truncate border-r border-outline-variant px-2 py-1 last:border-r-0"
                title={cell === null ? 'NULL' : String(cell)}
              >
                {cell === null ? <span className="text-on-surface-variant italic">NULL</span> : String(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
