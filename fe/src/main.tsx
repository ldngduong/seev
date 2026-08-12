import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { TooltipProvider } from './shared/components/ui/tooltip.tsx'
import { QueryProvider } from './app/providers/query-provider.tsx'
import { router } from './app/router.tsx'
import { Toaster } from './shared/components/ui/sonner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryProvider>
  </StrictMode>,
)
