import { useCallback, useEffect, useRef, useState } from 'react'
import type { DisplayEntry, JsRunSummary } from '../../../app/types'
import type { WorkerOutMessage } from './jsWorker'

const RUN_TIMEOUT_MS = 5000

interface UseRunJavaScriptResult {
  entries: DisplayEntry[]
  isRunning: boolean
  run: (code: string) => void
}

export function useRunJavaScript(onFinished?: (summary: JsRunSummary) => void): UseRunJavaScriptResult {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  const cleanup = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const run = useCallback(
    (code: string) => {
      cleanup()
      setEntries([])
      setIsRunning(true)

      const worker = new Worker(new URL('./jsWorker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      let entryCount = 0

      const finish = (hasError: boolean) => {
        cleanup()
        setIsRunning(false)
        onFinishedRef.current?.({ hasError, entryCount, ranAt: Date.now() })
      }

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data
        if (msg.type === 'console') {
          const entry = msg.entry
          if (entry.kind === 'clear') {
            entryCount = 0
            setEntries([])
          } else {
            entryCount += 1
            setEntries((prev) => [...prev, entry])
          }
        } else if (msg.type === 'done') {
          finish(msg.hasError)
        }
      }

      worker.onerror = (event) => {
        setEntries((prev) => [
          ...prev,
          { id: `worker-error-${Date.now()}`, kind: 'text', level: 'error', text: event.message },
        ])
        finish(true)
      }

      timeoutRef.current = window.setTimeout(() => {
        setEntries((prev) => [
          ...prev,
          {
            id: `timeout-${Date.now()}`,
            kind: 'text',
            level: 'error',
            text: `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s (possible infinite loop) -- stopped.`,
          },
        ])
        finish(true)
      }, RUN_TIMEOUT_MS)

      worker.postMessage({ type: 'run', code })
    },
    [cleanup],
  )

  return { entries, isRunning, run }
}
