import { useCallback, useRef, useState } from 'react'

const COPIED_RESET_MS = 1500

/** Copies text to the clipboard and flips `copied` true for a moment, so a
 * "Copy" button can show brief "Copied" feedback instead of just doing nothing visibly. */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [])

  return { copied, copy }
}
