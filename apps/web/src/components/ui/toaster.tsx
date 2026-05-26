import { cn } from '@/lib/utils'
import { type Toast, useToastStore } from '@/stores/toastStore'
import { X } from 'lucide-react'

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { message, variant, action } = toast
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded-[8px] border bg-surface px-3.5 py-2.5 text-sm shadow-[0_8px_30px_rgba(20,20,20,0.14)]',
        variant === 'error' ? 'border-red-200 text-red-700' : 'border-border text-ink',
      )}
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick()
            onDismiss()
          }}
          className="font-medium text-accent transition-colors duration-[120ms] ease-out hover:text-accent-hover"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-ink-subtle transition-colors duration-[120ms] ease-out hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}
