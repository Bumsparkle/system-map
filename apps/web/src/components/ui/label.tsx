import { cn } from '@/lib/utils'
import { type LabelHTMLAttributes, forwardRef } from 'react'

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic design-system primitive; callers pass htmlFor
    <label
      ref={ref}
      className={cn('text-xs font-medium text-ink-muted select-none', className)}
      {...props}
    />
  ),
)
Label.displayName = 'Label'
