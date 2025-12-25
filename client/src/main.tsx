import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import { ExecutionProvider } from '@/context';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <Notifications position="top-right" />
      <ExecutionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ExecutionProvider>
    </MantineProvider>
  </StrictMode>
);
