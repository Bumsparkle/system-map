import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] text-sm font-medium transition-[background-color,border-color,box-shadow,color] duration-[120ms] ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        outline:
          'border border-border bg-surface text-ink hover:bg-surface-2 hover:border-border-strong',
        ghost: 'text-ink hover:bg-surface-2',
        subtle: 'bg-surface-2 text-ink hover:bg-border',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
