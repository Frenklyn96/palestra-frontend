import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import MainLayout from './layout/MainLayout';
import TransazioniPage from './pages/Transazioni/TransazioniPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientiPage from './pages/Clienti/ClientiPage';
import { RoutesEnum } from './enum/RoutesEnum';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path={RoutesEnum.HOME} element={<Home />} />
          <Route path={RoutesEnum.CLIENTI} element={<ClientiPage />} />
          <Route path={RoutesEnum.TRANSAZIONI} element={<TransazioniPage />} />
          <Route path="/clienti/:clienteId/transazioni" element={<TransazioniPage />} />
          <Route path={RoutesEnum.SETTINGS} element={<SettingsPage />} />          
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
