import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import MainLayout from './layout/MainLayout';
import TransazioniPage from './pages/Transazioni/TransazioniPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientiPage from './pages/Clienti/ClientiPage';
import { RoutesEnum } from './enum/RoutesEnum';
import { PrivateRoute } from './PrivateRoute';

function App() {
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
