import '@/app/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/app';
import { ProveItProvider } from '@/components/provenance/prove-it-drawer';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ProveItProvider>
        <App />
        <Toaster position="bottom-right" richColors />
      </ProveItProvider>
    </ThemeProvider>
  </StrictMode>,
);
