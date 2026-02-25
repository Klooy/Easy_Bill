import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { useThemeStore } from '@/store/theme.store';

// Apply theme before render to prevent FOUC
useThemeStore.getState().initialize();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
