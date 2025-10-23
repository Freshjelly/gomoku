import { ReactNode } from 'react'
import { ToastProvider, useToast as useToastHook } from '../components/Toaster'

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}

// Re-export useToast hook from Toaster
export { useToastHook as useToast }
