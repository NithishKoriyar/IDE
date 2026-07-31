/** Dynamic-imported so Prettier + its plugins stay out of the initial bundle. */
export async function formatJavaScriptCode(code: string): Promise<string> {
  const [prettier, babelPlugin, estreePlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ])

  return prettier.format(code, {
    parser: 'babel',
    plugins: [babelPlugin, estreePlugin],
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
  })
}
