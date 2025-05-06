import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import MainLayout from './layout/MainLayout';
import TransazioniPage from './pages/Transazioni/TransazioniPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientiPage from './pages/Clienti/ClientiPage';
import { RoutesEnum } from './enum/RoutesEnum';
import { PrivateRoute } from './PrivateRoute';
import { useUser } from '@clerk/clerk-react'; // Import Clerk
import { useAppDispatch } from './store/hooks'; // Import your Redux hooks
import { setUserInfo } from './features/slice/userSlice';

function App() {
  const { user, isSignedIn } = useUser(); // Clerk hook to check user status
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isSignedIn && user) {
      // Dispatch the user info when the user is signed in
      dispatch(setUserInfo({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? ''
      }));
    }
  }, [isSignedIn, user, dispatch]);

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
