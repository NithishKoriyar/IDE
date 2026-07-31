/** Dynamic-imported so sql-formatter stays out of the initial bundle. */
export async function formatSqlCode(query: string): Promise<string> {
  const { format } = await import('sql-formatter')
  return format(query, { language: 'sqlite', keywordCase: 'upper' })
}
