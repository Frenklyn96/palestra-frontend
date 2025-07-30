import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import MainLayout from './layout/MainLayout';
import TransazioniPage from './pages/Transazioni/TransazioniPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientiPage from './pages/Clienti/ClientiPage';
import { RoutesEnum } from './enum/RoutesEnum';
import { PrivateRoute } from './PrivateRoute';
import { useUser } from '@clerk/clerk-react';
import { useAppDispatch } from './store/hooks';
import { setUserInfo } from './features/slice/userSlice';
import IngressiPage from './pages/Ingressi/IngressiPage';

import { CircularProgress, Box } from '@mui/material';

function LoadingScreen() {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isSignedIn && user) {
      dispatch(
        setUserInfo({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? '',
        })
      );
    }
  }, [isSignedIn, user, dispatch]);

  // Se Clerk non è ancora caricato, NON montare il router né layout
  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route
            path={RoutesEnum.HOME}
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path={RoutesEnum.CLIENTI}
            element={
              <PrivateRoute>
                <ClientiPage />
              </PrivateRoute>
            }
          />
          <Route
            path={RoutesEnum.TRANSAZIONI}
            element={
              <PrivateRoute>
                <TransazioniPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/clienti/:clienteId/transazioni"
            element={
              <PrivateRoute>
                <TransazioniPage />
              </PrivateRoute>
            }
          />
          <Route
            path={RoutesEnum.INGRESSI}
            element={
              <PrivateRoute>
                <IngressiPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/clienti/:clienteId/ingressi"
            element={
              <PrivateRoute>
                <IngressiPage />
              </PrivateRoute>
            }
          />
          <Route
            path={RoutesEnum.SETTINGS}
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
