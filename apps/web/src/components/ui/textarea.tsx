import { cn } from '@/lib/utils'
import { type TextareaHTMLAttributes, forwardRef } from 'react'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[72px] w-full rounded-[6px] border border-border bg-surface px-3 py-2 text-sm text-ink transition-[border-color,box-shadow] duration-[120ms] ease-out placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 resize-none',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
