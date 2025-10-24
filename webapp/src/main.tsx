import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/index.css';
import { useGameStore } from './store/gameStore';

// ダークモード適用コンポーネント
function DarkModeManager() {
  const isDarkMode = useGameStore((state) => state.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return null;
}

function RootApp() {
  return (
    <>
      <DarkModeManager />
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={(import.meta as any).env?.BASE_URL || '/'}>
      <RootApp />
    </BrowserRouter>
  </React.StrictMode>
);

// Register a very small service worker for PWA shell caching (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(((import.meta as any).env?.BASE_URL || '/') + 'service-worker.js')
      .catch(() => {
        // ignore
      });
  });
}
