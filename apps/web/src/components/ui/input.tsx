import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-[6px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-none transition-[border-color,box-shadow] duration-[120ms] ease-out placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
