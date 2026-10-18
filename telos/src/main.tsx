import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';
import App from './App';
import Home from './Home';

const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
const missing = !appId || appId.startsWith('your_') || appId.startsWith('PASTE_');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {missing ? (
      <Home preview ready authenticated={false} logout={() => {}} login={() => alert('Add your Privy App ID to .env.local and restart the dev server.')} />
    ) : (
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ['wallet'],
          appearance: { theme: '#0c0d10', accentColor: '#ec6a4c', showWalletLoginFirst: true, logo: '/icon.svg' },
        }}
      >
        <App />
      </PrivyProvider>
    )}
  </StrictMode>
);
