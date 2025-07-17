import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import App from './App';
import './i18n';
import { ClerkProvider } from '@clerk/clerk-react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

// Crea tema MUI con font Inter
const theme = createTheme({
  typography: {
     fontFamily: `'Inter', sans-serif`,
    fontWeightRegular: 500,   // peso un po' più spesso del 400
    fontWeightMedium: 600,    // per testi semi-bold
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </ClerkProvider>
  </React.StrictMode>,
);
