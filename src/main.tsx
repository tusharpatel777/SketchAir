import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill matchMedia for environments where it might be missing or return undefined
if (typeof window !== 'undefined') {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = (query) => {
    try {
      const result = originalMatchMedia ? originalMatchMedia(query) : null;
      if (result) {
        // Ensure addListener exists even if deprecated
        if (!result.addListener) {
          (result as any).addListener = (cb: any) => result.addEventListener('change', cb);
        }
        if (!result.removeListener) {
          (result as any).removeListener = (cb: any) => result.removeEventListener('change', cb);
        }
        return result;
      }
    } catch (e) {
      console.warn('matchMedia polyfill triggered due to error:', e);
    }
    
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as any;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App/>
  </StrictMode>,
);
