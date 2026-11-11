import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Babel Ultra AI: Nova versão disponível.');
  },
  onOfflineReady() {
    console.log('Babel Ultra AI: Aplicativo pronto para uso offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
