// components/PrivateRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "./store/hooks";

const ELECTRON_AUTH_URL = import.meta.env.VITE_ELECTRON_AUTH_URL as string;
const isElectron = !!(window as any).electronAPI;

function ElectronLoginScreen() {
  const { t } = useTranslation();

  const handleLogin = () => {
    (window as any).electronAPI.openAuthBrowser(ELECTRON_AUTH_URL);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
      }}
    >
      <Typography variant="h4" fontWeight={700}>
        {t("login.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("login.subtitle")}
      </Typography>
      <Button variant="contained" size="large" onClick={handleLogin}>
        {t("login.button")}
      </Button>
    </Box>
  );
}

/**
 * In Electron l'autenticazione avviene via HTTP callback locale (localhost:7654).
 * Clerk non gestisce la sessione dentro Electron, quindi usiamo userId in Redux
 * come segnale di autenticazione completata.
 * In web browser usiamo normalmente <SignedIn> di Clerk.
 */
export const PrivateRoute = ({ children }: PropsWithChildren) => {
  const userId = useAppSelector((state) => state.user.userId);

  if (isElectron) {
    // Autenticato via callback locale → userId presente in Redux
    if (userId) return <>{children}</>;
    return <ElectronLoginScreen />;
  }

  // Web browser: usa Clerk normalmente
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
