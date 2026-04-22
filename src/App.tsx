import { useEffect } from "react";
import {
  HashRouter,
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
const isElectron = !!(window as any).electronAPI;
const Router = isElectron ? HashRouter : BrowserRouter;
import Home from "./pages/home/Home";
import MainLayout from "./layout/MainLayout";
import TransazioniPage from "./pages/Transazioni/TransazioniPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import ClientiPage from "./pages/Clienti/ClientiPage";
import ScannerPage from "./pages/Scanner/ScannerPage";
import { RoutesEnum } from "./enum/RoutesEnum";
import { PrivateRoute } from "./PrivateRoute";
import { useUser } from "@clerk/clerk-react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setUserInfo } from "./features/slice/userSlice";
import IngressiPage from "./pages/Ingressi/IngressiPage";
import OAuthCallbackPage from "./pages/OAuthCallback/OAuthCallbackPage";
import { CircularProgress, Box } from "@mui/material";
import { checkHealth } from "./features/slice/healthSlice";
import { useTranslation } from "react-i18next";

// Navigates to Scanner page when a QR is processed from any page
function GlobalQrRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onQrProcessed) return;
    const unsub = electronAPI.onQrProcessed(() => {
      if (location.pathname !== RoutesEnum.SCANNER) {
        navigate(RoutesEnum.SCANNER);
      }
    });
    return unsub;
  }, [navigate, location.pathname]);

  return null;
}

function LoadingScreen() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // Prendo stato health dal redux store
  const healthStatus = useAppSelector((state) => state.health.status);

  // Al mount chiamo checkHealth thunk per "svegliare" backend
  useEffect(() => {
    dispatch(checkHealth());
  }, [dispatch]);

  useEffect(() => {
    if (isSignedIn && user) {
      dispatch(
        setUserInfo({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
        }),
      );
      // Invia beUrl + userId a Python: da qui Python gestisce direttamente le chiamate BE
      const beUrl = import.meta.env.VITE_BE_URL_LOCAL ?? "";
      const aiApiUrl = (
        import.meta.env.VITE_AI_API_URL ?? "http://localhost:8001/api"
      ).replace("/api", "");
      fetch(`${aiApiUrl}/api/set-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beUrl, userId: user.id }),
      }).catch(() => {
        /* Python potrebbe non essere ancora pronto */
      });
    }
  }, [isSignedIn, user, dispatch]);

  // Se Clerk o backend non sono pronti, mostra loader
  if (!isLoaded || healthStatus === "loading" || healthStatus === "idle") {
    return <LoadingScreen />;
  }

  // Se backend non risponde
  if (healthStatus === "failed") {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "error.main",
          flexDirection: "column",
          px: 2,
          textAlign: "center",
        }}
      >
        <h2> {t("app.error.head")}</h2>
        <p>{t("app.error.body")}</p>
      </Box>
    );
  }

  return (
    <Router>
      <GlobalQrRedirect />
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
            path={RoutesEnum.SCANNER}
            element={
              <PrivateRoute>
                <ScannerPage />
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
          />{" "}
          <Route
            path={RoutesEnum.OAUTH_CALLBACK}
            element={<OAuthCallbackPage />}
          />{" "}
          <Route
            path={RoutesEnum.OAUTH_CALLBACK}
            element={<OAuthCallbackPage />}
          />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
