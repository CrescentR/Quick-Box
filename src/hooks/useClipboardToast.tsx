import { useCallback, useEffect, useState } from 'react'
import { writeClipboardText } from '../api/clipboard-api'
import { Toast } from '../ui'
import type { ToastProps } from '../ui'

interface ClipboardToastState {
  tone: NonNullable<ToastProps['tone']>
  title: string
  description?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Clipboard write failed.'
}

export function useClipboardToast() {
  const [toast, setToast] = useState<ClipboardToastState | null>(null)

  const copyText = useCallback(async (text: string, description?: string) => {
    try {
      await writeClipboardText(text)
      setToast({
        tone: 'success',
        title: 'Copied to clipboard',
        description,
      })
    } catch (error) {
      setToast({
        tone: 'danger',
        title: 'Copy failed',
        description: getErrorMessage(error),
      })
    }
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 2400)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const clipboardToast = toast ? (
    <div className="qb-tool-toast-layer">
      <Toast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onDismiss={() => setToast(null)}
      />
    </div>
  ) : null

  return {
    copyText,
    clipboardToast,
  }
}
