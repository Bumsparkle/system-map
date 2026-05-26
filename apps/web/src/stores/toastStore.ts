import { nanoid } from 'nanoid'
import { create } from 'zustand'

export type ToastAction = { label: string; onClick: () => void }

export type Toast = {
  id: string
  message: string
  variant: 'default' | 'error'
  action?: ToastAction
}

type ToastInput = {
  message: string
  variant?: 'default' | 'error'
  action?: ToastAction
}

type ToastStore = {
  toasts: Toast[]
  push: (input: ToastInput) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (input) => {
    const id = nanoid()
    const t: Toast = {
      id,
      message: input.message,
      variant: input.variant ?? 'default',
      action: input.action,
    }
    set((s) => ({ toasts: [...s.toasts, t] }))
    const ttl = input.action ? 6000 : 3500
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, ttl)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** Fire a toast from anywhere (including non-React code). */
export function toast(input: ToastInput): string {
  return useToastStore.getState().push(input)
}
